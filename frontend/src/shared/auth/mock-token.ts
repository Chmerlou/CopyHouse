import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { User } from "./contracts";

type SessionPayload = { user: User; expiresAt: number };
export type RegisteredAccount = SessionPayload & { passwordDigest: string };

function secret() {
  const configured = process.env.COPYHOUSE_MOCK_SESSION_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("COPYHOUSE_MOCK_SESSION_SECRET is required in production mock mode");
  }
  return "copyhouse-local-mock-session-only";
}

function signature(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function sign(payload: SessionPayload | RegisteredAccount) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

function verify<T extends SessionPayload>(token: string | undefined): T | null {
  if (!token) return null;
  const [encoded, suppliedSignature] = token.split(".");
  if (!encoded || !suppliedSignature) return null;

  const expected = Buffer.from(signature(encoded));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as T;
    return payload.expiresAt > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export function passwordDigest(password: string) {
  return createHmac("sha256", secret()).update(password).digest("hex");
}

export function signMockSession(user: User) {
  return sign({ user, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
}

export function verifyMockSession(token: string | undefined) {
  return verify<SessionPayload>(token)?.user ?? null;
}

export function signRegisteredAccount(user: User, password: string) {
  return sign({
    user,
    passwordDigest: passwordDigest(password),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
}

export function verifyRegisteredAccount(token: string | undefined) {
  return verify<RegisteredAccount>(token);
}
