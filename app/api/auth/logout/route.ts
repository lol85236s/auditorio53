import { NextResponse } from "next/server";

export async function POST() {
  // Clear cookie by setting max-age=0
  return NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": `app_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`,
      },
    }
  );
}
