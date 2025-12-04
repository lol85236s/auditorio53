#!/usr/bin/env node
/**
 * Send test email usando notifications.js (sin Next.js API)
 */

// Load .env.local
const fs = require("fs");
const path = require("path");
const envPath = path.join(__dirname, ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [key, ...valueParts] = line.split("=");
  if (key && !key.startsWith("#")) {
    const value = valueParts.join("=").replace(/^["']|["']$/g, "");
    env[key.trim()] = value.trim();
  }
});
Object.assign(process.env, env);

// Test email
const {
  sendEmailNotification,
  notifyEventReminder,
} = require("./lib/notifications");

async function test() {
  console.log("=".repeat(60));
  console.log("MAILERSEND REST API TEST");
  console.log("=".repeat(60));
  console.log("\n[Config]");
  console.log(
    "  MAILERSEND_API_TOKEN:",
    process.env.MAILERSEND_API_TOKEN ? "✓ Set" : "✗ Missing"
  );
  console.log("  EMAIL_FROM:", process.env.EMAIL_FROM);

  console.log("\n[Sending test email with event reminder...]");

  // Test con evento real - Auditorio 1, Asiento A-15, Hora 10:30 AM
  const result = await notifyEventReminder(
    "isma.zitl16@gmail.com",
    "Conferencia de Tecnología",
    "2025-12-15",
    "10:30",
    1,
    "A-15"
  );

  console.log("\n[Result]");
  console.log(JSON.stringify(result, null, 2));

  if (result?.success) {
    console.log("\n✅ SUCCESS - Email sent!");
    process.exit(0);
  } else {
    console.log("\n❌ FAILED - Email not sent");
    process.exit(1);
  }
}

test();
