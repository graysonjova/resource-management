import { NextRequest, NextResponse } from "next/server";

import whitelist from "@/whitelist.json";

const SESSION_COOKIE = "resource_session";
const LOCAL_SESSION_SECRET = "resource-management-local-demo-session";

function decodeBase64Url(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(
    atob(padded),
    (char) => char.charCodeAt(0),
  ).buffer as ArrayBuffer;
}

async function validSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return false;

  try {
    const secret =
      process.env.AUTH_SESSION_SECRET || LOCAL_SESSION_SECRET;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signatureMatches = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(suppliedSignature),
      new TextEncoder().encode(payload),
    );
    if (!signatureMatches) return false;

    const session = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(payload)),
    ) as { email?: string; exp?: number };
    return (
      typeof session.email === "string" &&
      whitelist.users.some(
        (user) =>
          user.email.trim().toLowerCase() === session.email!.toLowerCase(),
      ) &&
      typeof session.exp === "number" &&
      session.exp > Date.now()
    );
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicPath =
    pathname === "/login" || pathname.startsWith("/api/auth/");
  const authenticated = await validSession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (pathname === "/login" && authenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (publicPath) return NextResponse.next();
  if (authenticated) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
