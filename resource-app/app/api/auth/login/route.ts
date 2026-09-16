import { NextRequest, NextResponse } from "next/server";

import {
  authenticate,
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid login request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!authenticate(email, password)) {
    return NextResponse.json(
      { message: "Incorrect email or password." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  const forwardedProto = request.headers.get("x-forwarded-proto");
  response.cookies.set(SESSION_COOKIE, createSession(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: forwardedProto === "https" || request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
