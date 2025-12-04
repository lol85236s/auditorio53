import { NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * API GET /api/asientos/[auditorioId] — obtener asientos de un auditorio
 */
export async function GET(
  request: Request,
  { params }: { params: { auditorioId: string } }
) {
  try {
    const auditorioId = params.auditorioId;

    const result = await query(
      `
      SELECT 
        id,
        auditorio_id,
        numero_asiento,
        fila,
        seccion,
        estado
      FROM asientos
      WHERE auditorio_id = $1
      ORDER BY numero_asiento
      `,
      [auditorioId]
    );

    return NextResponse.json(
      {
        success: true,
        count: result.rows.length,
        asientos: result.rows,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching asientos:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al obtener asientos",
      },
      { status: 500 }
    );
  }
}
