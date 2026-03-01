import type { APIRoute } from "astro";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/db";
import { makeSessionCookie, signSession } from "../../../lib/auth";

export const prerender = false;

const Body = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(6).max(72),
});

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
  });
}

export const POST: APIRoute = async (ctx) => {
  const raw = await ctx.request.text().catch(() => "");
  let parsedJson: unknown = null;

  try {
    parsedJson = raw ? JSON.parse(raw) : null;
  } catch {
    parsedJson = null;
  }

  const parsed = Body.safeParse(parsedJson);
  if (!parsed.success) {
    return json({ error: "INVALID_INPUT", issues: parsed.error.issues }, 400);
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.password) return json({ error: "EMAIL_ALREADY_EXISTS" }, 409);
    return json({ error: "USE_SOCIAL_LOGIN" }, 409);
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      password: passwordHash,
      role: "member",
    },
  });

  const token = signSession({
    sub: user.id,
    role: user.role as "admin" | "member",
    email: user.email,
    name: user.name,
  });

  return json(
    {
      ok: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
    201,
    { "Set-Cookie": makeSessionCookie(token) },
  );
};
