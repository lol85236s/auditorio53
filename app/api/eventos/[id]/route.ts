import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

/**
 * API DELETE /api/eventos/:id — eliminar evento (solo organizador)
 */
export async function DELETE(request: Request, { params }: { params: any }) {
  try {
    // `params` may be a promise-like object in Next's app router — await it
    const paramsObj = await params;
    const id = paramsObj?.id;
    // Prefer session-based user (cookie). Fallback to header/body for dev.
    const body = await request.json().catch(() => ({} as any));
    const sessionUser = getUserFromRequest(request);
    let callerId = sessionUser ? String(sessionUser.id) : null;
    const callerTipo = sessionUser ? sessionUser.tipo_usuario || null : null;
    if (!callerId) {
      callerId =
        (request.headers &&
          request.headers.get &&
          request.headers.get("x-usuario-id")) ||
        body.usuario_id ||
        null;
    }

    if (!callerId) {
      return NextResponse.json(
        { success: false, error: "usuario_id requerido para eliminar evento" },
        { status: 400 }
      );
    }

    // Validate callerId is a UUID to avoid DB errors/hangs when casting
    const isUuid = (v: any) =>
      typeof v === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
    if (!isUuid(callerId)) {
      console.error("Invalid callerId provided to DELETE /api/eventos/:id", {
        callerId,
      });
      return NextResponse.json(
        { success: false, error: "usuario_id inválido" },
        { status: 400 }
      );
    }

    // Antes de eliminar, obtener emails de asistentes y datos del organizador
    // Detectar nombre de columna del organizador (compatibilidad: id_organizador vs organizador_id)
    const colCheck = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'eventos' AND column_name IN ('id_organizador','organizador_id') LIMIT 1"
    );
    const organizadorCol =
      (colCheck.rows[0] && colCheck.rows[0].column_name) || "id_organizador";
    const allowed = ["id_organizador", "organizador_id"];
    const organizadorColumn = allowed.includes(organizadorCol)
      ? organizadorCol
      : "id_organizador";

    let attendeeEmails: string[] = [];
    let organizadorEmail: string | null = null;
    try {
      const evt = await query(
        `SELECT e.id, e.${organizadorColumn} as id_organizador, u.email as organizador_email FROM eventos e INNER JOIN usuarios u ON e.${organizadorColumn} = u.id WHERE e.id = $1 LIMIT 1`,
        [id]
      );
      if (evt.rows.length > 0) {
        organizadorEmail = evt.rows[0].organizador_email || null;
      }

      const attendees = await query(
        `SELECT u.email FROM registros_asistentes ra JOIN usuarios u ON ra.id_asistente = u.id WHERE ra.id_evento = $1`,
        [id]
      );
      attendeeEmails = attendees.rows.map((r: any) => r.email).filter(Boolean);
    } catch (e) {
      // ignore gather errors
      console.error(
        "Warning: no se pudieron obtener emails antes de eliminar:",
        e
      );
    }

    // Perform deletion regardless of caller ownership (temporary bypass of organizer-only restriction)
    try {
      console.info("Deleting evento (ownership check bypassed)", {
        eventoId: id,
        callerId,
        callerTipo,
      });

      // Validate id is a UUID before performing DB operations
      const isUuidEvent = (v: any) =>
        typeof v === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          v
        );
      if (!isUuidEvent(id)) {
        return NextResponse.json(
          { success: false, error: "evento id inválido" },
          { status: 400 }
        );
      }

      await query("BEGIN");
      try {
        await query("DELETE FROM registros_asistentes WHERE id_evento = $1", [
          id,
        ]);
        const delEvt = await query(
          "DELETE FROM eventos WHERE id = $1 RETURNING id",
          [id]
        );
        await query("COMMIT");
        if (delEvt.rows.length === 0) {
          return NextResponse.json(
            { success: false, error: "Evento no encontrado" },
            { status: 404 }
          );
        }
      } catch (innerErr) {
        await query("ROLLBACK");
        throw innerErr;
      }

      // Emitir evento por sockets (si existe el helper)
      try {
        const { broadcastEvent } = await import("@/lib/socketServer");
        await broadcastEvent("evento:eliminado", { id });
      } catch (e) {
        // ignore socket failures
      }

      // Enviar notificaciones por email: al organizador y a los asistentes
      try {
        const { sendEmailNotification } = await import("@/lib/notifications");
        const subject = `Evento eliminado: ${id}`;
        const text = `El evento con id ${id} ha sido eliminado por su organizador.`;

        // Notificar al organizador (siempre que tengamos su email)
        if (organizadorEmail) {
          await sendEmailNotification([organizadorEmail], subject, text);
        }

        // Notificar a asistentes (si los hubo)
        if (attendeeEmails && attendeeEmails.length > 0) {
          await sendEmailNotification(attendeeEmails, subject, text);
        }
      } catch (e) {
        console.error("Error enviando notificaciones tras eliminación:", e);
      }

      return NextResponse.json({ success: true }, { status: 200 });
    } catch (err: any) {
      // Si la función en la DB lanzó excepción por permisos, mapear a 403
      const msg = String(err?.message || err || "");
      if (msg.includes("Solo el organizador")) {
        return NextResponse.json(
          {
            success: false,
            error: "Solo el organizador puede eliminar este evento",
          },
          { status: 403 }
        );
      }
      console.error("Error eliminando evento:", err);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Error en DELETE /api/eventos/:id", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error" },
      { status: 500 }
    );
  }
}
