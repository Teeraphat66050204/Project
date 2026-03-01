import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const COOKIE_NAME = "mb_session";

export type SessionUser = {
  sub: string;
  role: "admin" | "member";
  email: string;
  name: string;
};

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function signSession(payload: SessionUser) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifySession(token?: string | null): SessionUser | null {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

export async function getSessionFromCookies() {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(COOKIE_NAME)?.value);
}


