import { createHmac, timingSafeEqual } from "node:crypto";

import whitelist from "@/whitelist.json";

export const SESSION_COOKIE = "resource_session";
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

const LOCAL_SESSION_SECRET = "resource-management-local-demo-session";

function sessionSecret(): string {
  return process.env.AUTH_SESSION_SECRET || LOCAL_SESSION_SECRET;
}

function signature(payload: string): string {
  return createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
}

export function authenticate(email: string, password: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  return whitelist.users.some(
    (user) =>
      user.email.trim().toLowerCase() === normalizedEmail &&
      user.password === password,
  );
}

export function createSession(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      email: email.trim().toLowerCase(),
      exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    }),
  ).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifySession(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return false;

  const expectedSignature = signature(payload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return false;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
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
