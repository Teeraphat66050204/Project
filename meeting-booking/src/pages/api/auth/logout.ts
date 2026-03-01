import type { APIRoute } from "astro";
import { clearSessionCookie } from "../../../lib/auth";

export const prerender = false;

export const POST: APIRoute = async () => {
  return new Response(JSON.stringify({ ok: true, data: true }), {
    status: 200,
    headers: { "Set-Cookie": clearSessionCookie() },
  });
};
