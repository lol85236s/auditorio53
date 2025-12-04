import { NextResponse } from "next/server";
import { query } from "@/lib/db";

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

    const res = await query(
      `
      SELECT
        ra.id as registro_id,
        ra.id_evento,
        ra.id_asistente,
        ra.id_asiento,
        ra.numero_orden,
        ra.fecha_registro,
        ra.estado,
        u.nombre as asistente_nombre,
        u.email as asistente_email,
        a.numero_asiento,
        a.fila,
        a.seccion
      FROM registros_asistentes ra
      LEFT JOIN usuarios u ON ra.id_asistente = u.id
      LEFT JOIN asientos a ON ra.id_asiento = a.id
      WHERE ra.id_evento = $1
      ORDER BY ra.numero_orden NULLS LAST, ra.fecha_registro
      `,
      [eventoId]
    );

    const registros = res.rows.map((r: any) => ({
      registroId: r.registro_id,
      eventoId: r.id_evento,
      asistenteId: r.id_asistente,
      nombre: r.asistente_nombre || null,
      email: r.asistente_email || null,
      asientoId: r.id_asiento || null,
      numero_asiento: r.numero_asiento || null,
      fila: r.fila || null,
      seccion: r.seccion || null,
      numero_orden: r.numero_orden || null,
      fecha_registro: r.fecha_registro,
      estado: r.estado,
    }));

    return NextResponse.json({ success: true, registros }, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching registros detalle:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Error interno" },
      { status: 500 }
    );
  }
}
