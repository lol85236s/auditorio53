/**
 * Test email endpoint - Direct SMTP via NodeMailer (not Next.js API route)
 * GET /api/test-email-smtp - Returns test result
 */

export async function GET(request: Request) {
  try {
    // Use dynamic import to avoid issues with node modules in Next.js
    const { testEmailNotification } = await import("@/lib/notifications");

    const result = await testEmailNotification();

    return Response.json({
      success: result?.success || false,
      provider: result?.provider,
      messageId: result?.messageId,
      error: result?.error,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API] Test email error:", error);
    return Response.json(
      {
        success: false,
        error: error?.message || "Failed to send test email",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
