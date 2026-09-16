import whitelist from "@/whitelist.json";

export const SESSION_COOKIE = "resource_session";
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

const LOCAL_SESSION_SECRET = "resource-management-local-demo-session";

function sessionSecret(): string {
  return process.env.AUTH_SESSION_SECRET || LOCAL_SESSION_SECRET;
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

async function signingKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signature(payload: string): Promise<string> {
  const signed = await crypto.subtle.sign(
    "HMAC",
    await signingKey(),
    new TextEncoder().encode(payload),
  );
  return encodeBase64Url(new Uint8Array(signed));
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
  return `${payload}.${await signature(payload)}`;
}

export async function verifySession(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return false;

  try {
    const signatureMatches = await crypto.subtle.verify(
      "HMAC",
      await signingKey(),
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
