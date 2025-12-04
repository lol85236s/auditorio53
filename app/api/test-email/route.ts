export async function GET(request: Request) {
  return Response.json({
    success: true,
    provider: "GET OK",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  console.log("[test-email] POST received");
  return new Response(JSON.stringify({ ok: true, test: "minimal" }), {
    status: 200,
  });
}
