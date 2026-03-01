import type { APIRoute } from "astro";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/db";
import { signSession, makeSessionCookie } from "../../../lib/auth";

export const prerender = false;

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const POST: APIRoute = async (ctx) => {
  const raw = await ctx.request.text().catch(() => "");
  let json: any = null;

  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "INVALID_INPUT",
        receivedRaw: raw,
        received: json,
        issues: parsed.error.issues,
        contentType: ctx.request.headers.get("content-type"),
      }),
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return new Response(JSON.stringify({ error: "INVALID_CREDENTIALS" }), { status: 401 });
  if (!user.password) return new Response(JSON.stringify({ error: "USE_SOCIAL_LOGIN" }), { status: 401 });

  const ok = await bcrypt.compare(parsed.data.password, user.password);
  if (!ok) return new Response(JSON.stringify({ error: "INVALID_CREDENTIALS" }), { status: 401 });

  const token = signSession({
    sub: user.id,
    role: user.role as "admin" | "member",
    email: user.email,
    name: user.name,
  });

  return new Response(
    JSON.stringify({
      ok: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }),
    {
      status: 200,
      headers: { "Set-Cookie": makeSessionCookie(token) },
    },
  );
};
