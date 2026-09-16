import { NextRequest, NextResponse } from "next/server";

import {
  SESSION_COOKIE,
  sessionSecretSource,
  validateSession,
} from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicPath =
    pathname === "/login" || pathname.startsWith("/api/auth/");
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const validation = await validateSession(token);

  if (pathname === "/login" && validation.valid) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (publicPath) return NextResponse.next();
  if (validation.valid) return NextResponse.next();

  console.warn("[auth] Session rejected", {
    reason: validation.reason,
    path: pathname,
    cookiePresent: Boolean(token),
    cookieLength: token?.length ?? 0,
    secretSource: sessionSecretSource(),
    host: request.headers.get("host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
  });

  if (pathname.startsWith("/api/")) {
    const response = NextResponse.json(
      { message: "Authentication required." },
      { status: 401 },
    );
    response.headers.set("x-auth-reason", validation.reason);
    return response;
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  const response = NextResponse.redirect(loginUrl);
  response.headers.set("x-auth-reason", validation.reason);
  return response;
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
