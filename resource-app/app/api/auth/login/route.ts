import { NextRequest, NextResponse } from "next/server";

import {
  authenticate,
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  sessionSecretSource,
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
    console.warn("[auth] Login rejected", {
      reason: "incorrect-credentials",
      host: request.headers.get("host"),
    });
    return NextResponse.json(
      { message: "Incorrect email or password." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const secureCookie =
    forwardedProto === "https" || request.nextUrl.protocol === "https:";
  const sessionToken = await createSession(email);
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  console.info("[auth] Login accepted and session issued", {
    cookieLength: sessionToken.length,
    secureCookie,
    secretSource: sessionSecretSource(),
    host: request.headers.get("host"),
    forwardedProto,
  });
  return response;
}
