import { NextRequest, NextResponse } from "next/server";
import { query, detectColumn } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ registroId: string }> }
) {
  try {
    const { registroId } = await params;

    if (!registroId) {
      return NextResponse.json(
        { success: false, error: "ID de registro no proporcionado" },
        { status: 400 }
      );
    }

    // Detectar nombres correctos de columnas
    const raAsistenteCol = await detectColumn("registros_asistentes", [
      "id_asistente",
      "asistente_id",
      "usuario_id",
    ]);
    const raEventoCol = await detectColumn("registros_asistentes", [
      "id_evento",
      "evento_id",
    ]);
    const eAuditorioCol = await detectColumn("eventos", [
      "id_auditorio",
      "auditorio_id",
    ]);
    const eOrganizadorCol = await detectColumn("eventos", [
      "id_organizador",
      "organizador_id",
    ]);
    const aIdCol = await detectColumn("auditorios", ["id"]);

    // Query para obtener los detalles del registro y el evento
    const queryStr = `
      SELECT
        ra.id,
        ra.numero_orden as "numeroAsiento",
        u.nombre,
        u.email,
        e.id as "eventoId",
        e.titulo,
        e.fecha,
        e.hora_inicio as "horaInicio",
        e.hora_fin as "horaFin",
        a.nombre as auditorio,
        e.descripcion,
        u2.nombre as organizador
      FROM registros_asistentes ra
      JOIN usuarios u ON ra.${raAsistenteCol} = u.id
      JOIN eventos e ON ra.${raEventoCol} = e.id
      JOIN auditorios a ON e.${eAuditorioCol} = a.id
      LEFT JOIN usuarios u2 ON e.${eOrganizadorCol} = u2.id
      WHERE ra.id = $1
    `;

    const result = await query(queryStr, [registroId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Registro no encontrado" },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    const detalles = {
      id: row.id,
      nombre: row.nombre,
      email: row.email,
      numeroAsiento: row.numeroAsiento,
      evento: {
        id: row.eventoId,
        titulo: row.titulo,
        organizador: row.organizador,
        fecha: row.fecha,
        horaInicio: row.horaInicio,
        horaFin: row.horaFin,
        auditorio: row.auditorio,
        descripcion: row.descripcion,
      },
    };

    return NextResponse.json({ success: true, detalles });
  } catch (error) {
    console.error("Error fetching registro details:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener los detalles" },
      { status: 500 }
    );
  }
}
