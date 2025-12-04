import { NextResponse } from "next/server";
import { query, detectColumn } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

/**
 * API GET /api/registros-asistentes/[eventoId] — obtener registros de asistentes
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventoId: string }> }
) {
  try {
    const { eventoId } = await params;

    // Validate eventoId is a UUID to avoid passing invalid strings to Postgres
    const isValidUuid = (v: any) =>
      typeof v === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

    if (!isValidUuid(eventoId)) {
      return NextResponse.json(
        {
          success: false,
          error: "eventoId inválido — use un UUID válido en la ruta",
        },
        { status: 400 }
      );
    }

    const raEventoCol = await detectColumn("registros_asistentes", [
      "id_evento",
      "evento_id",
    ]);
    const raAsistenteCol = await detectColumn("registros_asistentes", [
      "id_asistente",
      "asistente_id",
      "usuario_id",
    ]);
    const raAsientoCol = await detectColumn("registros_asistentes", [
      "id_asiento",
      "asiento_id",
    ]);

    const result = await query(
      `
      SELECT
        id,
        ${raEventoCol} AS id_evento,
        ${raAsistenteCol} AS id_asistente,
        ${raAsientoCol} AS id_asiento,
        numero_orden,
        fecha_registro,
        estado
      FROM registros_asistentes
      WHERE ${raEventoCol} = $1
      ORDER BY numero_orden
      `,
      [eventoId]
    );

    return NextResponse.json(
      {
        success: true,
        count: result.rows.length,
        registros: result.rows,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching registros_asistentes:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al obtener registros de asistentes",
      },
      { status: 500 }
    );
  }
}

/**
 * API POST /api/registros-asistentes/[eventoId] — crear reserva (asignar asiento a asistente)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventoId: string }> }
) {
  try {
    const { eventoId } = await params;

    // Validate eventoId is a UUID to avoid passing invalid strings to Postgres
    const isUuid = (v: any) =>
      typeof v === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
    if (!isUuid(eventoId)) {
      return NextResponse.json(
        { success: false, error: "eventoId inválido" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { asistente_id, nombre, email } = body;
    const sessionUser = getUserFromRequest(request);

    // If the caller is authenticated as an asistente (or admin acting as asistente), prefer session identity
    if (
      !asistente_id &&
      sessionUser &&
      sessionUser.tipo_usuario &&
      sessionUser.tipo_usuario !== "organizador"
    ) {
      // use session user's id as the asistente
      body.asistente_id = String(sessionUser.id);
    }

    // Helper: validar UUID v4-ish
    const isValidUuid = (v: any) =>
      typeof v === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

    // Resolucion/creacion del usuario asistente: si se envía asistente_id lo usamos (si es UUID),
    // si no (o si viene inválido but nombre+email are provided) buscamos por email o creamos uno nuevo.
    let usuarioId: string | null = null;
    if (asistente_id) {
      if (isValidUuid(asistente_id)) {
        usuarioId = asistente_id;
      } else {
        // If cliente sent a temporary id (non-UUID) but provided nombre+email, ignore it and create/find by email.
        if (!email || !nombre) {
          return NextResponse.json(
            {
              success: false,
              error:
                "asistente_id debe ser un UUID válido o enviar nombre y email",
            },
            { status: 400 }
          );
        }
        console.warn(
          "Invalid asistente_id provided, will resolve by email instead.",
          { asistente_id }
        );
        usuarioId = null;
      }
    }
    if (!usuarioId) {
      if (!email || !nombre) {
        return NextResponse.json(
          {
            success: false,
            error: "asistente_id o (nombre y email) son requeridos",
          },
          { status: 400 }
        );
      }

      // Buscar usuario por email
      const byEmail = await query(
        "SELECT id FROM usuarios WHERE email = $1 LIMIT 1",
        [email]
      );
      if (byEmail.rows.length > 0) {
        usuarioId = byEmail.rows[0].id;
      } else {
        const createU = await query(
          `INSERT INTO usuarios (nombre, email, tipo_usuario) VALUES ($1, $2, 'asistente') RETURNING id`,
          [nombre, email]
        );
        usuarioId = createU.rows[0].id;
      }
    } else {
      // validar que exista
      const check = await query("SELECT id FROM usuarios WHERE id = $1", [
        usuarioId,
      ]);
      if (check.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Usuario asistente no encontrado" },
          { status: 404 }
        );
      }
    }

    // Asignación de asiento y numero_orden dentro de una transacción
    // Incluir la verificación de duplicados dentro de la transacción para evitar race conditions
    let row: any = null;
    // Definir variables de columna en el scope exterior para reutilizarlas al construir la respuesta
    let raEventoCol: string | null = null;
    let raAsistenteCol: string | null = null;
    let raAsientoCol: string | null = null;

    await query("BEGIN");
    try {
      // VERIFICACIÓN DE DUPLICADOS DENTRO DE LA TRANSACCIÓN (con FOR UPDATE para lock)
      // Esto garantiza que dos solicitudes simultáneas no pasen ambas esta comprobación
      raEventoCol = await detectColumn("registros_asistentes", [
        "id_evento",
        "evento_id",
      ]);
      raAsistenteCol = await detectColumn("registros_asistentes", [
        "id_asistente",
        "asistente_id",
        "usuario_id",
      ]);

      const dupCheck = await query(
        `SELECT id FROM registros_asistentes 
         WHERE ${raEventoCol} = $1 AND ${raAsistenteCol} = $2 AND estado = 'confirmado'
         LIMIT 1`,
        [eventoId, usuarioId]
      );

      if (dupCheck.rows.length > 0) {
        await query("ROLLBACK");
        return NextResponse.json(
          {
            success: false,
            error:
              "El usuario ya tiene una reserva confirmada para este evento",
          },
          { status: 409 }
        );
      }

      // Obtener auditorio del evento
      // Detect auditorio column name on eventos
      const auditorioCol = await detectColumn("eventos", [
        "id_auditorio",
        "auditorio_id",
      ]);
      // Lock the event row to serialize concurrent registrations for the same event.
      // Using FOR UPDATE ensures only one transaction at a time can assign seats for this event.
      const evRes = await query(
        `SELECT ${auditorioCol} as id_auditorio FROM eventos WHERE id = $1 FOR UPDATE`,
        [eventoId]
      );
      if (evRes.rows.length === 0) {
        await query("ROLLBACK");
        return NextResponse.json(
          { success: false, error: "Evento no encontrado" },
          { status: 404 }
        );
      }
      const auditorioId = evRes.rows[0].id_auditorio;

      // Lock the auditorio row too to avoid concurrent capacity changes and then read its capacity
      const audCapRes = await query(
        `SELECT capacidad_total FROM auditorios WHERE id = $1 FOR UPDATE LIMIT 1`,
        [auditorioId]
      );
      const capacidadTotal =
        audCapRes.rows.length > 0
          ? Number(audCapRes.rows[0].capacidad_total || 0)
          : null;

      // Contar registros confirmados ya existentes para este evento (after locks)
      const countRes = await query(
        `SELECT COUNT(*)::int as ocupados FROM registros_asistentes WHERE ${raEventoCol} = $1 AND estado = 'confirmado'`,
        [eventoId]
      );
      const ocupadosActuales =
        countRes.rows.length > 0 ? Number(countRes.rows[0].ocupados) : 0;

      if (capacidadTotal !== null && ocupadosActuales >= capacidadTotal) {
        await query("ROLLBACK");
        return NextResponse.json(
          {
            success: false,
            error:
              "El auditorio está completo — no quedan asientos disponibles",
            capacidad_total: capacidadTotal,
            ocupados: ocupadosActuales,
          },
          { status: 409 }
        );
      }

      // Check whether schema has id_asiento and numero_orden columns
      // Detect the candidate name for the asiento FK column, then verify it exists
      raAsientoCol = await detectColumn("registros_asistentes", [
        "id_asiento",
        "asiento_id",
      ]);
      const asientoColExistsRes = await query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'registros_asistentes' AND column_name = $1 LIMIT 1`,
        [raAsientoCol]
      );
      const hasIdAsiento = asientoColExistsRes.rows.length > 0;
      // Check for numero_orden column presence via information_schema
      const numColRes = await query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'registros_asistentes' AND column_name = 'numero_orden' LIMIT 1`
      );
      const hasNumeroOrden = numColRes.rows.length > 0;

      if (!hasIdAsiento || !hasNumeroOrden) {
        // Migration not applied: insert minimal registro without seat/numero_orden
        const insertRes = await query(
          `INSERT INTO registros_asistentes (${raEventoCol}, ${raAsistenteCol}, estado) VALUES ($1, $2, 'confirmado') RETURNING *`,
          [eventoId, usuarioId]
        );
        row = insertRes.rows[0];
        await query("COMMIT");
      } else {
        // Buscar primer asiento disponible en ese auditorio no asignado al evento
        // Detectar el nombre de la columna de auditorio en la tabla `asientos` (puede ser `id_auditorio` o `auditorio_id`)
        const asientosAudCol = await detectColumn("asientos", [
          "id_auditorio",
          "auditorio_id",
        ]);
        const asientoRes = await query(
          `
          SELECT a.id
          FROM asientos a
          WHERE a.${asientosAudCol} = $1
            AND a.id NOT IN (
              SELECT ${raAsientoCol} FROM registros_asistentes WHERE ${raEventoCol} = $2 AND ${raAsientoCol} IS NOT NULL
            )
          ORDER BY a.numero_asiento
          LIMIT 1
          `,
          [auditorioId, eventoId]
        );
        const asientoId =
          asientoRes.rows.length > 0 ? asientoRes.rows[0].id : null;

        // If no seat is available, abort and return 409 (conflict)
        if (!asientoId) {
          await query("ROLLBACK");
          return NextResponse.json(
            {
              success: false,
              error: "No hay asientos disponibles para este evento",
            },
            { status: 409 }
          );
        }

        // Calcular siguiente numero_orden (usar columna de evento detectada)
        const numRes = await query(
          `SELECT COALESCE(MAX(numero_orden), 0) + 1 as siguiente FROM registros_asistentes WHERE ${raEventoCol} = $1`,
          [eventoId]
        );
        const siguienteAsiento = parseInt(numRes.rows[0].siguiente, 10);

        // Insertar registro referenciando las columnas detectadas
        const insertRes = await query(
          `INSERT INTO registros_asistentes (${raEventoCol}, ${raAsistenteCol}, ${raAsientoCol}, numero_orden, estado) VALUES ($1, $2, $3, $4, 'confirmado') RETURNING *`,
          [eventoId, usuarioId, asientoId, siguienteAsiento]
        );
        row = insertRes.rows[0];
        await query("COMMIT");
      }
    } catch (txErr) {
      console.error("Error en transacción de asignación de asiento:", txErr);
      await query("ROLLBACK");

      // Verificar si es un error de constraint UNIQUE (duplicado)
      if (
        txErr instanceof Error &&
        (txErr.message.includes("unique") ||
          txErr.message.includes("duplicate") ||
          txErr.message.includes("constraint"))
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "El usuario ya tiene una reserva confirmada para este evento",
          },
          { status: 409 }
        );
      }

      throw txErr;
    }

    // Obtener datos del usuario para devolver nombre/email
    const userRes = await query(
      "SELECT nombre, email FROM usuarios WHERE id = $1",
      [usuarioId]
    );
    const user = userRes.rows[0] || { nombre: null, email: null };

    // Normalizar propiedades usando los nombres de columna detectados
    const mapped = {
      id: row.id,
      eventoId: row[raEventoCol] || eventoId,
      reservaId: row[raEventoCol] || eventoId,
      asistenteId: usuarioId,
      nombre: user.nombre,
      email: user.email,
      asientoId: row[raAsientoCol] || null,
      numero_orden: row.numero_orden || null,
      numeroAsiento: row.numero_orden || null,
      fecha_registro: row.fecha_registro,
      fechaRegistro: row.fecha_registro,
      estado: row.estado,
    };

    // Emitir evento Socket.IO para sincronización y actualizar conteo agregado
    const { broadcastEvent, computeAndBroadcastAsientosConteo } = await import(
      "@/lib/socketServer"
    );
    await broadcastEvent("asistente:registrado", mapped);
    // Enviar confirmación por email al asistente (incluye título/fecha/enlace)
    try {
      const { sendEmailNotification } = await import("@/lib/notifications");
      // Obtener información del evento para incluir en el email (incluye auditorio)
      let eventInfo = null;
      try {
        const evAudCol = await detectColumn("eventos", [
          "id_auditorio",
          "auditorio_id",
        ]);
        const ev = await query(
          `SELECT titulo, fecha, hora_inicio, ${evAudCol} as auditorio FROM eventos WHERE id = $1 LIMIT 1`,
          [mapped.eventoId]
        );
        if (ev.rows.length > 0) eventInfo = ev.rows[0];
      } catch (e) {
        // ignore
      }

      const title =
        (eventInfo && eventInfo.titulo) || `Evento ${mapped.eventoId}`;
      const fecha = (eventInfo && eventInfo.fecha) || "";
      const hora = (eventInfo && eventInfo.hora_inicio) || "";

      // Formatear fecha en español
      const formatDateSpanish = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const options = {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        };
        return date.toLocaleDateString("es-MX", options);
      };

      const fechaFormato = formatDateSpanish(fecha);
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:3000";
      const eventLink = `${baseUrl}/asistente/detalles/${mapped.id}`;

      const subject = `Confirmación: ${title}`;
      const auditorioText =
        eventInfo && eventInfo.auditorio
          ? `\nAuditorio: ${eventInfo.auditorio}`
          : "";
      const text = `Hola ${
        mapped.nombre
      },\n\nTu registro para el evento '${title}' ha sido confirmado.\nFecha: ${fechaFormato}\nHora: ${hora}${auditorioText}\nNúmero de asiento: ${
        mapped.numero_orden || "N/A"
      }\n\nVer detalles: ${eventLink}\n\nNo Faltes!`;

      const htmlBody = `
        <h2>Confirmación de Registro</h2>
        <p>Hola <strong>${mapped.nombre}</strong>,</p>
        <p>Tu registro para el evento <strong>'${title}'</strong> ha sido confirmado.</p>
        <ul>
          <li><strong>Fecha:</strong> ${fechaFormato}</li>
          <li><strong>Hora:</strong> ${hora}</li>
          ${
            eventInfo && eventInfo.auditorio
              ? `<li><strong>Auditorio:</strong> ${eventInfo.auditorio}</li>`
              : ""
          }
          <li><strong>Número de asiento:</strong> ${
            mapped.numero_orden || "N/A"
          }</li>
        </ul>
        <p><a href="${eventLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Ver detalles</a></p>
        <p>Gracias.</p>
      `;

      if (mapped.email) {
        await sendEmailNotification(mapped.email, subject, text, htmlBody);
        // Registrar en notificaciones_enviadas para evitar reenvíos posteriores (confirmación)
        try {
          await query(
            `INSERT INTO notificaciones_enviadas (evento_id, tipo, destinatario_email) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [mapped.eventoId, "confirmation", mapped.email]
          );
        } catch (e) {
          console.error("Error registrando confirmation notification:", e);
        }
      }
    } catch (e) {
      console.error("Error enviando email de confirmacion:", e);
    }
    // Actualizar y emitir conteo agregado (asientos:conteo)
    try {
      await computeAndBroadcastAsientosConteo(row[raEventoCol] || eventoId);
    } catch (e) {
      // No bloquear la respuesta si la actualización del conteo falla
      console.error("Error updating asientos:conteo after registro:", e);
    }

    return NextResponse.json(
      { success: true, registro: mapped },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating registro_asistente:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al registrar asistente",
      },
      { status: 500 }
    );
  }
}

/**
 * API DELETE /api/registros-asistentes/[eventoId]?registroId=...
 * or with JSON body { registroId }
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventoId: string }> }
) {
  try {
    const { eventoId } = await params;
    // Read body once (may be used for registroId and authorization)
    const url = new URL(request.url);
    let registroId = url.searchParams.get("registroId");
    const body = await request.json().catch(() => ({} as any));

    if (!registroId) {
      registroId = body && (body.registroId || body.registro_id || body.id);
    }

    if (!registroId) {
      return NextResponse.json(
        { success: false, error: "registroId es requerido" },
        { status: 400 }
      );
    }

    // Authorization: prefer session-based user from cookie; fallback to header/body
    const sessionUser = getUserFromRequest(request);
    let callerUsuarioId: string | null = null;
    let callerTipo: string | null = null;
    if (sessionUser) {
      callerUsuarioId = String(sessionUser.id);
      callerTipo = sessionUser.tipo_usuario || null;
    }

    if (!callerUsuarioId) {
      callerUsuarioId =
        (request.headers.get("x-usuario-id") as string | null) ||
        body.usuario_id ||
        body.userId ||
        body.user_id ||
        null;
    }

    console.info("DELETE /api/registros-asistentes - request received", {
      eventoId,
      registroId,
      callerUsuarioId,
      callerTipo,
    });

    if (!callerUsuarioId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "usuario_id (session cookie or header x-usuario-id) es requerido",
        },
        { status: 401 }
      );
    }

    // Verify caller is the organizador of the event OR has admin role
    try {
      const organizadorCol = await detectColumn("eventos", [
        "id_organizador",
        "organizador_id",
      ]);
      const ev = await query(
        `SELECT ${organizadorCol} as id_organizador FROM eventos WHERE id = $1 LIMIT 1`,
        [eventoId]
      );
      if (ev.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Evento no encontrado" },
          { status: 404 }
        );
      }
      const organizadorId = String(ev.rows[0].id_organizador);
      const isOrganizer = organizadorId === String(callerUsuarioId);
      const isAdmin =
        callerTipo === "admin" ||
        callerTipo === "organizator" ||
        callerTipo === "organizador";
      if (!isOrganizer && !isAdmin) {
        return NextResponse.json(
          {
            success: false,
            error:
              "No autorizado: solo el organizador o administradores pueden eliminar registros",
          },
          { status: 403 }
        );
      }
    } catch (e) {
      console.error(
        "Error verificando organizador antes de eliminar registro:",
        e
      );
      return NextResponse.json(
        { success: false, error: "Error verificando permisos" },
        { status: 500 }
      );
    }

    // Delete the registro
    const raEventoCol = await detectColumn("registros_asistentes", [
      "id_evento",
      "evento_id",
    ]);
    const start = Date.now();
    const del = await query(
      `DELETE FROM registros_asistentes WHERE id = $1 AND ${raEventoCol} = $2 RETURNING *`,
      [registroId, eventoId]
    );
    const duration = Date.now() - start;
    console.info("DB delete completed", { registroId, eventoId, duration });

    if (del.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Registro no encontrado" },
        { status: 404 }
      );
    }

    // Broadcast conteo update (fire-and-forget to avoid blocking response)
    try {
      const mod = await import("@/lib/socketServer");
      if (mod && typeof mod.computeAndBroadcastAsientosConteo === "function") {
        // don't await — let it run asynchronously
        mod
          .computeAndBroadcastAsientosConteo(eventoId)
          .catch((err: any) =>
            console.error(
              "Error in async computeAndBroadcastAsientosConteo:",
              err
            )
          );
      }
    } catch (e) {
      console.error("Error importing socketServer for async broadcast:", e);
    }

    return NextResponse.json(
      { success: true, deleted: del.rows[0] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting registro_asistente:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar registro" },
      { status: 500 }
    );
  }
}
