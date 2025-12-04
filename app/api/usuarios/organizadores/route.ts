import { NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * API GET /api/usuarios/organizadores — obtener usuarios tipo organizador
 */
export async function GET() {
  try {
    const result = await query(
      `
      SELECT id, nombre, email
      FROM usuarios
      WHERE tipo_usuario = 'organizador'
      ORDER BY nombre
      `
    );

    return NextResponse.json(
      { success: true, count: result.rows.length, organizadores: result.rows },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching organizadores:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al obtener organizadores",
      },
      { status: 500 }
    );
  }
}
