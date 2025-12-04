/**
 * Enviar enlace mágico por correo usando Mailjet
 */
export async function sendMagicLinkEmail(
  email: string,
  token: string,
  tipo: "login" | "registro"
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const magicLink = `${appUrl}/auth/magic?token=${token}`;

  const subject =
    tipo === "registro"
      ? "Confirma tu registro en Sistema de Auditorios"
      : "Enlace para iniciar sesión en Sistema de Auditorios";

  const htmlContent =
    tipo === "registro"
      ? `
        <html>
          <body style="font-family: Arial, sans-serif; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1e40af;">¡Bienvenido a Sistema de Auditorios!</h2>
              <p>Hola,</p>
              <p>Has solicitado crear una cuenta. Haz clic en el enlace de abajo para confirmar tu registro:</p>
              <p style="margin: 30px 0;">
                <a href="${magicLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Confirmar Registro
                </a>
              </p>
              <p>O copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
                ${magicLink}
              </p>
              <p style="color: #666; font-size: 12px;">
                Este enlace expira en 24 horas. Si no solicitaste crear una cuenta, ignora este correo.
              </p>
            </div>
          </body>
        </html>
      `
      : `
        <html>
          <body style="font-family: Arial, sans-serif; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1e40af;">Inicia sesión en Sistema de Auditorios</h2>
              <p>Hola,</p>
              <p>Se solicitó un acceso a tu cuenta. Haz clic en el enlace de abajo para iniciar sesión:</p>
              <p style="margin: 30px 0;">
                <a href="${magicLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Iniciar Sesión
                </a>
              </p>
              <p>O copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
                ${magicLink}
              </p>
              <p style="color: #666; font-size: 12px;">
                Este enlace expira en 24 horas. Si no solicitaste iniciar sesión, ignora este correo.
              </p>
            </div>
          </body>
        </html>
      `;

  try {
    // Construir credenciales de Mailjet (Base64)
    const apiKey = process.env.MAILJET_API_KEY;
    const secretKey = process.env.MAILJET_SECRET_KEY;

    if (!apiKey || !secretKey) {
      console.error("Variables de entorno de Mailjet no configuradas");
      return false;
    }

    const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString(
      "base64"
    );

    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        Messages: [
          {
            From: {
              Email: process.env.EMAIL_FROM || "noreply@example.com",
              Name: "Sistema de Auditorios",
            },
            To: [
              {
                Email: email,
              },
            ],
            Subject: subject,
            HTMLPart: htmlContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Mailjet error:", response.status, errorData);
      throw new Error(`Failed to send email: ${response.status}`);
    }

    const result = await response.json();
    console.log(`Magic link email enviado a ${email}:`, result);
    return true;
  } catch (error: any) {
    console.error("Error enviando magic link:", error);
    // No lanzar error aquí; si Mailjet falla, continuar sin fallar completamente
    return false;
  }
}
