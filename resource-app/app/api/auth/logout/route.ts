import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure:
      request.headers.get("x-forwarded-proto") === "https" ||
      request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 0,
  });
  return response;
}
