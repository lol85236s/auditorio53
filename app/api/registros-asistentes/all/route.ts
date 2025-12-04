import { NextResponse } from "next/server";
import { query, detectColumn } from "@/lib/db";

/**
 * API GET /api/registros-asistentes/all — obtener todos los registros de asistentes
 */
export async function GET() {
  try {
    // Detect which column names exist in the DB (compatibility with older schemas)
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
        ra.id,
        ra.${raEventoCol} AS id_evento,
        ra.${raAsistenteCol} AS id_asistente,
        u.nombre as asistente_nombre,
        u.email as asistente_email,
        ra.${raAsientoCol} AS id_asiento,
        ra.numero_orden,
        ra.fecha_registro,
        ra.estado
      FROM registros_asistentes ra
      LEFT JOIN usuarios u ON u.id = ra.${raAsistenteCol}
      ORDER BY ra.fecha_registro DESC
      `
    );

    const mapped = result.rows.map((r: any) => ({
      id: r.id,
      id_evento: r.id_evento,
      eventoId: r.id_evento,
      reservaId: r.id_evento,
      asistenteId: r.id_asistente,
      id_asistente: r.id_asistente,
      nombre: r.asistente_nombre,
      email: r.asistente_email,
      asientoId: r.id_asiento,
      numero_orden: r.numero_orden,
      numeroAsiento: r.numero_orden,
      fecha_registro: r.fecha_registro,
      fechaRegistro: r.fecha_registro,
      estado: r.estado,
    }));

    return NextResponse.json(
      {
        success: true,
        count: mapped.length,
        registros: mapped,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching all registros_asistentes:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al obtener registros de asistentes",
      },
      { status: 500 }
    );
  }
}
