import { query } from "@/lib/db";
import { signToken, serializeTokenCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Token no proporcionado" },
      { status: 400 }
    );
  }

  try {
    // Buscar el magic link en la base de datos
    const result = await query(
      `SELECT id, email, usuario_id, tipo, nombre, tipo_usuario, data_json, usado, fecha_expiracion
       FROM magic_links
       WHERE token = $1 AND usado = FALSE`,
      [token]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Enlace inválido o ya usado" },
        { status: 400 }
      );
    }

    const link = result.rows[0];

    // Verificar que no haya expirado
    if (new Date(link.fecha_expiracion) < new Date()) {
      return NextResponse.json({ error: "Enlace expirado" }, { status: 400 });
    }

    let userId = link.usuario_id;

    // Si es un registro nuevo, crear el usuario
    if (link.tipo === "registro" && !userId) {
      const createUserResult = await query(
        `INSERT INTO usuarios (nombre, email, tipo_usuario)
         VALUES ($1, $2, $3)
         RETURNING id, nombre, email, tipo_usuario`,
        [
          link.nombre || link.email,
          link.email,
          (link.tipo_usuario || "asistente").toLowerCase(),
        ]
      );
      userId = createUserResult.rows[0].id;
    }

    // Marcar el magic link como usado
    await query(
      `UPDATE magic_links SET usado = TRUE, fecha_uso = NOW() WHERE id = $1`,
      [link.id]
    );

    // Obtener los datos del usuario
    const userResult = await query(
      `SELECT id, nombre, email, tipo_usuario FROM usuarios WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Crear el token de sesión
    const token_jwt = signToken({
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      tipo_usuario: user.tipo_usuario,
    });

    // Crear respuesta con NextResponse para manejar correctamente la cookie
    const response = NextResponse.json(
      {
        message: "Sesión iniciada correctamente",
        user,
      },
      { status: 200 }
    );

    // Establecer la cookie usando NextResponse
    response.headers.set("Set-Cookie", serializeTokenCookie(token_jwt));

    return response;
  } catch (error: any) {
    console.error("Error verificando magic link:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar el enlace" },
      { status: 500 }
    );
  }
}
