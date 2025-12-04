import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

/**
 * API GET /api/eventos — obtener todos los eventos
 */
export async function GET() {
  try {
    // Compute per-event counts and archivado flag server-side so all clients
    // receive a consistent view. `archivado` is true only when the event's
    // end datetime (fecha + hora_fin) is in the past.
    // Detect which column name the DB uses for the organizer (legacy vs new)
    const colCheck = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'eventos' AND column_name IN ('id_organizador','organizador_id') LIMIT 1"
    );
    const organizadorCol =
      (colCheck.rows[0] && colCheck.rows[0].column_name) || "id_organizador";
    // whitelist to avoid unexpected values
    const allowed = ["id_organizador", "organizador_id"];
    const organizadorColumn = allowed.includes(organizadorCol)
      ? organizadorCol
      : "id_organizador";

    // Detect which column name the DB uses for the auditorio (legacy vs new)
    const audCheck = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'eventos' AND column_name IN ('id_auditorio','auditorio_id') LIMIT 1"
    );
    const auditorioCol =
      (audCheck.rows[0] && audCheck.rows[0].column_name) || "id_auditorio";
    const audAllowed = ["id_auditorio", "auditorio_id"];
    const auditorioColumn = audAllowed.includes(auditorioCol)
      ? auditorioCol
      : "id_auditorio";

    // Detect which column name registros_asistentes uses for the event FK
    const raCheck = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'registros_asistentes' AND column_name IN ('id_evento','evento_id') LIMIT 1"
    );
    const raEventoCol =
      (raCheck.rows[0] && raCheck.rows[0].column_name) || "id_evento";

    // Helper to inject the organizer column into SQL safely (only two allowed names)
    const sql = `
      SELECT
        e.id,
        e.titulo,
        e.descripcion,
        e.${organizadorColumn} as id_organizador,
        e.${auditorioColumn} as id_auditorio,
        e.fecha,
        e.hora_inicio,
        e.hora_fin,
        e.asistentes_esperados,
        e.estado,
        e.tipo_evento,
        e.carrera,
        u.nombre as organizador_nombre,
        u.email as organizador_email,
        COALESCE(a.capacidad_total, e.asistentes_esperados, 0) AS capacidad_total,
        COUNT(ra.*) FILTER (WHERE ra.estado = 'confirmado') AS asistentes_registrados,
        -- archivado: true when fecha + hora_fin < now()
        ((e.fecha + e.hora_fin) < NOW()) AS archivado
      FROM eventos e
      INNER JOIN usuarios u ON e.${organizadorColumn} = u.id
      LEFT JOIN auditorios a ON e.${auditorioColumn} = a.id
      LEFT JOIN registros_asistentes ra ON ra.${raEventoCol} = e.id
      GROUP BY e.id, u.nombre, u.email, a.capacidad_total, e.${organizadorColumn}
      ORDER BY e.fecha DESC, e.hora_inicio
    `;

    const result = await query(sql);

    // Map DB rows to the shape the frontend expects (keep legacy keys too)
    const mapped = result.rows.map((r: any) => ({
      ...r,
      asistentes: Number(r.asistentes_esperados || 0),
      asistentes_registrados: Number(r.asistentes_registrados || 0),
      capacidad_total: Number(r.capacidad_total || 0),
      archivado: Boolean(r.archivado),
    }));

    return NextResponse.json(
      {
        success: true,
        count: mapped.length,
        eventos: mapped,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching eventos:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al obtener eventos",
      },
      { status: 500 }
    );
  }
}

/**
 * API POST /api/eventos — crear un nuevo evento
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Request body:", body);
    // Accept both snake_case and id_* variants from clients
    const auditorio_id = body.auditorio_id ?? body.id_auditorio ?? null;
    const organizador_id = body.organizador_id ?? body.id_organizador ?? null;
    const organizador_nombre =
      body.organizador_nombre ?? body.organizadorNombre ?? null;
    const organizador_email =
      body.organizador_email ?? body.organizadorEmail ?? null;
    const titulo = body.titulo ?? null;
    const descripcion = body.descripcion ?? "";
    const fecha = body.fecha ?? null;
    const hora_inicio = body.hora_inicio ?? body.horaInicio ?? null;
    const hora_fin = body.hora_fin ?? body.horaFin ?? null;
    const asistentes_esperados =
      body.asistentes_esperados ?? body.asistentes ?? 0;
    const tipo_evento = body.tipo_evento ?? body.tipoEvento ?? null;
    const carrera = body.carrera ?? null;

    // Detect DB column names used for eventos and registros_asistentes (compatibility)
    const colCheck = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'eventos' AND column_name IN ('id_organizador','organizador_id') LIMIT 1"
    );
    const organizadorCol =
      (colCheck.rows[0] && colCheck.rows[0].column_name) || "id_organizador";
    const allowed = ["id_organizador", "organizador_id"];
    const organizadorColumn = allowed.includes(organizadorCol)
      ? organizadorCol
      : "id_organizador";

    const audCheck = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'eventos' AND column_name IN ('id_auditorio','auditorio_id') LIMIT 1"
    );
    const auditorioCol =
      (audCheck.rows[0] && audCheck.rows[0].column_name) || "id_auditorio";
    const audAllowed = ["id_auditorio", "auditorio_id"];
    const auditorioColumn = audAllowed.includes(auditorioCol)
      ? auditorioCol
      : "id_auditorio";

    const raCheck = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'registros_asistentes' AND column_name IN ('id_evento','evento_id') LIMIT 1"
    );
    const raEventoCol =
      (raCheck.rows[0] && raCheck.rows[0].column_name) || "id_evento";

    // Convertir auditorio_id a string si es necesario
    const auditorioIdStr = auditorio_id !== null ? String(auditorio_id) : "";

    // Validar campos requeridos
    if (!auditorio_id || !titulo || !fecha || !hora_inicio || !hora_fin) {
      return NextResponse.json(
        { success: false, error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    // Validar que el auditorio_id sea válido (solo verificar que sea string no vacío)
    if (typeof auditorioIdStr !== "string" || auditorioIdStr.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Auditorio inválido" },
        { status: 400 }
      );
    }

    // Verificar que el auditorio existe
    const auditorioCheck = await query(
      "SELECT id FROM auditorios WHERE id = $1",
      [auditorioIdStr]
    );
    if (auditorioCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Auditorio no encontrado" },
        { status: 404 }
      );
    }

    // Resolve/crear organizador: if organizador_id provided validate it;
    // si enviaron organizador_nombre lo creamos o buscamos por email (se requiere email en la tabla usuarios).
    let finalOrganizadorId = organizador_id;
    // Get session user to enforce roles
    const sessionUser = getUserFromRequest(request);
    if (!finalOrganizadorId) {
      if (!organizador_nombre || organizador_nombre.trim() === "") {
        return NextResponse.json(
          {
            success: false,
            error: "organizador_id o organizador_nombre requerido",
          },
          { status: 400 }
        );
      }

      // When creating a new organizer we require an email
      const orgEmail =
        organizador_email ?? (body as any).organizador_email ?? null;
      if (
        !orgEmail ||
        (typeof orgEmail === "string" && orgEmail.trim() === "")
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "organizador_email es requerido cuando se crea un organizador nuevo",
          },
          { status: 400 }
        );
      }

      // Buscar por email primero para evitar duplicados
      const byEmail = await query(
        "SELECT id FROM usuarios WHERE email = $1 LIMIT 1",
        [orgEmail]
      );
      if (byEmail.rows.length > 0) {
        finalOrganizadorId = byEmail.rows[0].id;
      } else {
        const createRes = await query(
          `INSERT INTO usuarios (nombre, email, tipo_usuario) VALUES ($1, $2, 'organizador') RETURNING id`,
          [organizador_nombre, orgEmail]
        );
        finalOrganizadorId = createRes.rows[0].id;
      }
    } else {
      const organizadorCheck = await query(
        "SELECT tipo_usuario FROM usuarios WHERE id = $1",
        [finalOrganizadorId]
      );
      if (organizadorCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Organizador no encontrado" },
          { status: 404 }
        );
      }
      if (organizadorCheck.rows[0].tipo_usuario !== "organizador") {
        return NextResponse.json(
          { success: false, error: "El usuario no es un organizador" },
          { status: 400 }
        );
      }
    }

    // Enforce that the session user is either the organizer creating the event or an admin
    if (sessionUser) {
      const sessId = String(sessionUser.id);
      const sessTipo = sessionUser.tipo_usuario || null;
      const isAdmin = sessTipo === "admin";
      const isOrganizerUser =
        finalOrganizadorId && String(finalOrganizadorId) === sessId;
      if (!isAdmin && !isOrganizerUser) {
        return NextResponse.json(
          {
            success: false,
            error: "No autorizado: debe ser organizador o admin",
          },
          { status: 403 }
        );
      }
      // If no finalOrganizadorId provided but session is organizer, assign it
      if (!finalOrganizadorId && sessTipo === "organizador") {
        finalOrganizadorId = sessId;
      }
    } else {
      // No session: require organizer_id to be specified (or fail)
      if (!finalOrganizadorId) {
        return NextResponse.json(
          {
            success: false,
            error: "Autenticación requerida para crear eventos",
          },
          { status: 401 }
        );
      }
    }

    // Comprobar evento existente que colisione (prevenir error de restricción única)
    const existe = await query(
      `SELECT 1 FROM eventos WHERE ${auditorioColumn} = $1 AND fecha = $2 AND hora_inicio = $3 LIMIT 1`,
      [auditorioIdStr, fecha, hora_inicio]
    );
    if (existe.rows.length > 0) {
      // Recuperar el evento conflictivo para dar más contexto al cliente
      const conflictSql = `
        SELECT e.*, u.nombre as organizador_nombre, u.email as organizador_email
        FROM eventos e
        INNER JOIN usuarios u ON e.${organizadorColumn} = u.id
        WHERE e.${auditorioColumn} = $1 AND e.fecha = $2 AND e.hora_inicio = $3
        LIMIT 1
        `;
      const conflictRes = await query(conflictSql, [
        auditorioIdStr,
        fecha,
        hora_inicio,
      ]);

      return NextResponse.json(
        {
          success: false,
          error: "Ya existe un evento en ese auditorio/fecha/hora",
          conflict: conflictRes.rows[0] || null,
        },
        { status: 409 }
      );
    }

    // Intentar insertar; si otro proceso insertó simultáneamente, evitar excepción de DB
    // Existe un índice único (constraint) `no_overlap_eventos` sobre (auditorio_id, fecha, hora_inicio).
    // Usamos ON CONFLICT para no lanzar error y detectar la colisión de forma controlada.
    // Build INSERT dynamically to use correct organizer column
    const insertCols = `${auditorioColumn}, ${organizadorColumn}, titulo, descripcion, fecha, hora_inicio, hora_fin, asistentes_esperados, estado, tipo_evento, carrera`;
    const insertSql = `
      INSERT INTO eventos (${insertCols})
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmado', $9, $10)
      ON CONFLICT ON CONSTRAINT no_overlap_eventos DO NOTHING
      RETURNING *
    `;
    const insertRes = await query(insertSql, [
      auditorioIdStr,
      finalOrganizadorId,
      titulo,
      descripcion,
      fecha,
      hora_inicio,
      hora_fin,
      asistentes_esperados || 0,
      tipo_evento || null,
      carrera || null,
    ]);

    if (insertRes.rows.length === 0) {
      // Significa que la inserción fue evitada por ON CONFLICT (ya existe un evento)
      const conflictSql2 = `
        SELECT e.*, u.nombre as organizador_nombre, u.email as organizador_email
        FROM eventos e
        INNER JOIN usuarios u ON e.${organizadorColumn} = u.id
        WHERE e.${auditorioColumn} = $1 AND e.fecha = $2 AND e.hora_inicio = $3
        LIMIT 1
        `;
      const conflictRes = await query(conflictSql2, [
        auditorioIdStr,
        fecha,
        hora_inicio,
      ]);

      return NextResponse.json(
        {
          success: false,
          error: "Ya existe un evento en ese auditorio/fecha/hora",
          conflict: conflictRes.rows[0] || null,
        },
        { status: 409 }
      );
    }

    // Obtener el evento insertado (junto con datos del organizador) y mapear
    const eventoSql = `
      SELECT e.*, u.nombre as organizador_nombre, u.email as organizador_email, a.capacidad_total
      FROM eventos e
      INNER JOIN usuarios u ON e.${organizadorColumn} = u.id
      LEFT JOIN auditorios a ON e.${auditorioColumn} = a.id
      WHERE e.id = $1
      LIMIT 1
      `;
    const eventoRowRes = await query(eventoSql, [insertRes.rows[0].id]);

    const row = eventoRowRes.rows[0];

    // Compute aggregated counts for this event (asistentes confirmados)
    const counts = await query(
      `
      SELECT
        COALESCE(a.capacidad_total, 0) AS capacidad_total,
        COUNT(ra.*) FILTER (WHERE ra.estado = 'confirmado') AS asistentes_registrados
      FROM eventos e
      LEFT JOIN auditorios a ON e.${auditorioColumn} = a.id
      LEFT JOIN registros_asistentes ra ON ra.${raEventoCol} = e.id
      WHERE e.id = $1
      GROUP BY a.capacidad_total
      `,
      [insertRes.rows[0].id]
    );

    const capacidad_total = counts.rows[0]?.capacidad_total || 0;
    const asistentes_registrados = Number(
      counts.rows[0]?.asistentes_registrados || 0
    );

    // Compute archivado: true when fecha + hora_fin is before now
    const fechaStr =
      row.fecha instanceof Date
        ? row.fecha.toISOString().substring(0, 10)
        : String(row.fecha).substring(0, 10);
    const horaFin = (row.hora_fin || "").toString().substring(0, 5) || "23:59";
    const end = new Date(`${fechaStr}T${horaFin}:00`);
    const archivado = new Date() > end;

    // Mapear a la forma que el frontend espera (type Reserva)
    const mapped = {
      id: row.id,
      auditorio: String(row[auditorioColumn]),
      fecha:
        row.fecha instanceof Date
          ? row.fecha.toISOString().substring(0, 10)
          : String(row.fecha),
      horaInicio: (row.hora_inicio || "").toString().substring(0, 5),
      horaFin: (row.hora_fin || "").toString().substring(0, 5),
      titulo: row.titulo,
      organizador: row.organizador_nombre || null,
      organizadorId: row[organizadorColumn],
      descripcion: row.descripcion || "",
      asistentes: row.asistentes_esperados || 0,
      asistentes_registrados,
      capacidad_total,
      archivado,
      carrera: row.carrera || null,
      presentacion: null,
    };

    // Emitir evento Socket.IO para sincronización en tiempo real con objeto mapeado
    const { broadcastEvent } = await import("@/lib/socketServer");
    await broadcastEvent("evento:creado", mapped);

    return NextResponse.json(
      { success: true, evento: mapped },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating evento:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear evento" },
      { status: 500 }
    );
  }
}
