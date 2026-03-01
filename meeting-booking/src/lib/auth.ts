import jwt from "jsonwebtoken";

const JWT_SECRET = import.meta.env.JWT_SECRET || "dev-secret-change-me";
export const COOKIE_NAME = "mb_session";

export type SessionPayload = {
  sub: string;   // userId
  role: "admin" | "member";
  email: string;
  name: string;
};

export function signSession(payload: SessionPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export function makeSessionCookie(token: string) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
