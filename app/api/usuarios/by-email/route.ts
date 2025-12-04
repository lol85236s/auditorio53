import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    if (!email) {
      return NextResponse.json(
        { success: false, error: "email is required" },
        { status: 400 }
      );
    }

    const res = await query(
      `SELECT id, nombre, email, tipo_usuario FROM usuarios WHERE email = $1 LIMIT 1`,
      [email]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, found: false },
        { status: 404 }
      );
    }

    const row = res.rows[0];
    return NextResponse.json(
      { success: true, found: true, user: row },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error fetching user by email:", err);
    return NextResponse.json(
      { success: false, error: err.message || String(err) },
      { status: 500 }
    );
  }
}
