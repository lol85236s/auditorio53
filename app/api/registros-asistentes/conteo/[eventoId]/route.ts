import { NextResponse } from "next/server";
import { query, detectColumn } from "@/lib/db";

/**
 * GET /api/registros-asistentes/conteo/[eventoId]
 * Devuelve el conteo actual de asientos ocupados y la capacidad del auditorio
 * para el evento especificado. Responde con payload similar a `asientos:conteo`.
 */
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

    const auditorioCol = await detectColumn("eventos", [
      "id_auditorio",
      "auditorio_id",
    ]);
    const raEventoCol = await detectColumn("registros_asistentes", [
      "id_evento",
      "evento_id",
    ]);

    const result = await query(
      `
      SELECT
        e.id as id_evento,
        e.${auditorioCol} as id_auditorio,
        COALESCE(a.capacidad_total, 0) as capacidad_total,
        COUNT(ra.*) FILTER (WHERE ra.estado = 'confirmado') as ocupados
      FROM eventos e
      LEFT JOIN auditorios a ON e.${auditorioCol} = a.id
      LEFT JOIN registros_asistentes ra ON ra.${raEventoCol} = e.id
      WHERE e.id = $1
      GROUP BY e.id, e.${auditorioCol}, a.capacidad_total
      `,
      [eventoId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Evento no encontrado" },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    const payload = {
      reservaId: row.id_evento,
      eventoId: row.id_evento,
      id_evento: row.id_evento,
      auditorio: row.id_auditorio,
      id_auditorio: row.id_auditorio,
      ocupados: parseInt(row.ocupados, 10) || 0,
      capacidad: parseInt(row.capacidad_total, 10) || 0,
      capacidad_total: parseInt(row.capacidad_total, 10) || 0,
    };

    return NextResponse.json(
      { success: true, conteo: payload },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error en conteo de asientos por evento:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Error interno" },
      { status: 500 }
    );
  }
}
