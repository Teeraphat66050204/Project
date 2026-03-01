import type { APIContext } from "astro";
import { COOKIE_NAME, verifySession } from "./auth";

export function getSession(ctx: APIContext) {
  const token = ctx.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function requireAuth(ctx: APIContext) {
  const s = getSession(ctx);
  if (!s) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401 });
  }
  return s;
}

export function requireAdmin(ctx: APIContext) {
  const s = requireAuth(ctx);
  if (s instanceof Response) return s;
  if (s.role !== "admin") {
    return new Response(JSON.stringify({ error: "FORBIDDEN" }), { status: 403 });
  }
  return s;
}