/**
 * Notificaciones por email - Versión simplificada (REST only, SIN SDK)
 * Usa MailerSend REST API directamente para mayor estabilidad
 */

async function sendEmailNotification(to, subject, text, html) {
  console.log("[Notification] sendEmailNotification called");

  if (!to) return null;
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to];
  if (recipients.length === 0) return null;

  console.log("[Notification] Recipients:", recipients);
  console.log(
    "[Notification] Token present:",
    !!process.env.MAILERSEND_API_TOKEN
  );

  // Usar MailerSend REST API
  if (process.env.MAILERSEND_API_TOKEN) {
    try {
      const rawFrom = process.env.EMAIL_FROM || "no-reply@localhost";
      let fromEmail = rawFrom;
      let fromName = "AudiTec";

      const m = rawFrom.match(/^(.*)<(.+)>$/);
      if (m) {
        fromName = m[1].trim().replace(/"/g, "");
        fromEmail = m[2].trim();
      }

      console.log("[Notification] From:", { email: fromEmail, name: fromName });

      const payload = {
        from: { email: fromEmail, name: fromName },
        to: recipients.map((r) => ({ email: r })),
        subject: subject || "Notificación",
        text: text || "",
      };

      if (html) {
        payload.html = html;
      }

      console.log("[Notification] Payload prepared, sending to MailerSend...");

      const response = await fetch("https://api.mailersend.com/v1/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MAILERSEND_API_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      console.log("[Notification] Response status:", response.status);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error("[Notification] MailerSend error response:", error);
        throw new Error(`MailerSend API error: ${response.status}`);
      }

      const result = await response.json();
      console.log("[Notification] MailerSend success:", result);
      return result;
    } catch (err) {
      console.error(
        "[Notification] MailerSend failed:",
        err?.message || String(err)
      );
    }
  } else {
    console.warn("[Notification] MAILERSEND_API_TOKEN not configured");
  }

  // SMTP Fallback
  try {
    if (!process.env.SMTP_HOST) {
      console.warn("[Notification] SMTP not configured either");
      return null;
    }

    console.log("[Notification] Trying SMTP fallback...");
    const nodemailer = require("nodemailer");

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });

    const from =
      process.env.SMTP_FROM || process.env.EMAIL_FROM || "no-reply@localhost";

    const info = await transporter.sendMail({
      from,
      to: recipients.join(","),
      subject: subject || "Notificación",
      text: text || "",
      html: html || undefined,
    });

    console.log("[Notification] SMTP success:", info?.messageId);
    return info;
  } catch (err) {
    console.error("[Notification] SMTP failed:", err?.message || String(err));
    return null;
  }
}

module.exports = { sendEmailNotification };
