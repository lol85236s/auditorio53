import { NextResponse } from "next/server";
import { query, detectColumn } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventoId: string }> }
) {
  try {
    const { eventoId } = await params;

    const isUuid = (v: any) =>
      typeof v === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

    if (!isUuid(eventoId)) {
      return NextResponse.json(
        { success: false, error: "eventoId inválido — use un UUID válido" },
        { status: 400 }
      );
    }

    // Obtener auditorio asociado al evento (detectar nombre de columna en `eventos`)
    const auditorioCol = await detectColumn("eventos", [
      "id_auditorio",
      "auditorio_id",
    ]);
    const ev = await query(
      `SELECT ${auditorioCol} as id_auditorio FROM eventos WHERE id = $1`,
      [eventoId]
    );
    if (ev.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Evento no encontrado" },
        { status: 404 }
      );
    }
    const auditorioId = ev.rows[0].id_auditorio;

    // Detectar columnas en registros_asistentes y en asientos para evitar referencias literales
    const raAsientoCol = await detectColumn("registros_asistentes", [
      "id_asiento",
      "asiento_id",
    ]);
    const raEventoCol = await detectColumn("registros_asistentes", [
      "id_evento",
      "evento_id",
    ]);
    const raAsistenteCol = await detectColumn("registros_asistentes", [
      "id_asistente",
      "asistente_id",
      "usuario_id",
    ]);
    const asientosAudCol = await detectColumn("asientos", [
      "id_auditorio",
      "auditorio_id",
    ]);

    // Traer asientos del auditorio e intentar unir con registros_asistentes del evento
    const res = await query(
      `
      SELECT
        a.id as asiento_id,
        a.numero_asiento,
        a.fila,
        a.seccion,
        ra.id as registro_id,
        ra.${raAsistenteCol} as id_asistente,
        ra.numero_orden,
        ra.estado as registro_estado,
        u.nombre as asistente_nombre,
        u.email as asistente_email
      FROM asientos a
      LEFT JOIN registros_asistentes ra ON ra.${raAsientoCol} = a.id AND ra.${raEventoCol} = $1
      LEFT JOIN usuarios u ON ra.${raAsistenteCol} = u.id
      WHERE a.${asientosAudCol} = $2
      ORDER BY a.numero_asiento
      `,
      [eventoId, auditorioId]
    );

    const asientos = res.rows.map((r: any) => ({
      asientoId: r.id_asiento,
      numero_asiento: r.numero_asiento,
      numeroAsiento: r.numero_asiento,
      fila: r.fila,
      seccion: r.seccion,
      ocupado: r.registro_id
        ? r.registro_estado === "confirmado"
          ? true
          : true
        : false,
      registroId: r.registro_id || null,
      numero_orden: r.numero_orden || null,
      asistente: r.registro_id
        ? {
            id: r.id_asistente,
            nombre: r.asistente_nombre || null,
            email: r.asistente_email || null,
            numero_orden: r.numero_orden || null,
          }
        : null,
    }));

    return NextResponse.json(
      { success: true, auditorioId, asientos },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error fetching asientos por evento:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Error interno" },
      { status: 500 }
    );
  }
}
