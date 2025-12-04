import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { sendMagicLinkEmail } from "@/lib/send-magic-link";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || "").toString().trim().toLowerCase();
    if (!email)
      return NextResponse.json({ error: "email required" }, { status: 400 });

    // Lookup user by email
    const res = await query(
      "select id, nombre, email, tipo_usuario from usuarios where lower(email)=lower($1) limit 1",
      [email]
    );
    const user = res.rows && res.rows[0];
    if (!user)
      return NextResponse.json(
        { error: "Usuario no encontrado. Regístrate primero." },
        { status: 404 }
      );

    // Generar magic link para login
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);

    // Guardar el magic link de login
    await query(
      `INSERT INTO magic_links (token, email, usuario_id, tipo, fecha_expiracion)
       VALUES ($1, $2, $3, $4, $5)`,
      [token, email, user.id, "login", expiresAt]
    );

    // Enviar el enlace mágico por correo
    await sendMagicLinkEmail(email, token, "login");

    console.log(`Magic link para login (${email}): /auth/magic?token=${token}`);

    return NextResponse.json(
      {
        message:
          "Se ha enviado un enlace de confirmación a tu correo. Revisa tu bandeja de entrada.",
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
