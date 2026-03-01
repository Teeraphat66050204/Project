import type { APIRoute } from "astro";
import { requireAuth } from "../../../lib/guard";

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const s = requireAuth(ctx);
  if (s instanceof Response) return s;
  return new Response(JSON.stringify({ ok: true, data: s }), { status: 200 });
};
