import { createHmac, timingSafeEqual } from "node:crypto";

import whitelist from "@/whitelist.json";

export const SESSION_COOKIE = "resource_session";
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

const LOCAL_SESSION_SECRET = "resource-management-local-demo-session";

function sessionSecret(): string {
  return process.env.AUTH_SESSION_SECRET || LOCAL_SESSION_SECRET;
}

export function sessionSecretSource(): "environment" | "fallback" {
  return process.env.AUTH_SESSION_SECRET ? "environment" : "fallback";
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(
    atob(padded),
    (char) => char.charCodeAt(0),
  ).buffer as ArrayBuffer;
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

export async function createSession(email: string): Promise<string> {
  const payload = encodeBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        email: email.trim().toLowerCase(),
        exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
      }),
    ),
  );
  return `${payload}.${signature(payload)}`;
}

export type SessionValidation =
  | { valid: true; email: string }
  | {
      valid: false;
      reason:
        | "missing-cookie"
        | "malformed-cookie"
        | "invalid-signature"
        | "invalid-payload"
        | "email-not-whitelisted"
        | "expired"
        | "verification-error";
    };

export async function validateSession(
  token: string | undefined,
): Promise<SessionValidation> {
  if (!token) return { valid: false, reason: "missing-cookie" };
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature || token.split(".").length !== 2) {
    return { valid: false, reason: "malformed-cookie" };
  }

  try {
    const expectedSignature = signature(payload);
    const supplied = Buffer.from(suppliedSignature);
    const expected = Buffer.from(expectedSignature);
    const signatureMatches =
      supplied.length === expected.length &&
      timingSafeEqual(supplied, expected);
    if (!signatureMatches) {
      return { valid: false, reason: "invalid-signature" };
    }

    const session = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(payload)),
    ) as { email?: string; exp?: number };
    if (
      typeof session.email !== "string" ||
      typeof session.exp !== "number"
    ) {
      return { valid: false, reason: "invalid-payload" };
    }
    const whitelisted = whitelist.users.some(
      (user) =>
        user.email.trim().toLowerCase() === session.email!.toLowerCase(),
    );
    if (!whitelisted) {
      return { valid: false, reason: "email-not-whitelisted" };
    }
    if (session.exp <= Date.now()) {
      return { valid: false, reason: "expired" };
    }
    return { valid: true, email: session.email };
  } catch {
    return { valid: false, reason: "verification-error" };
  }
}

export async function verifySession(
  token: string | undefined,
): Promise<boolean> {
  return (await validateSession(token)).valid;
}
