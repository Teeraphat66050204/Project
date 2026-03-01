import { randomBytes } from "node:crypto";
import type { APIContext } from "astro";
import { prisma } from "./db";
import { makeSessionCookie, signSession } from "./auth";

type Provider = "google";

const STATE_COOKIE_PREFIX = "mb_oauth_state_";
const NEXT_COOKIE_NAME = "mb_oauth_next";
const STATE_MAX_AGE_SECONDS = 10 * 60;

function stateCookieName(provider: Provider): string {
  return `${STATE_COOKIE_PREFIX}${provider}`;
}

function isSecureUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function secureSuffixFromRequest(requestUrl: string): string {
  return isSecureUrl(requestUrl) ? "; Secure" : "";
}

export function getAppBaseUrl(requestUrl: string): string {
  const envBase = import.meta.env.APP_BASE_URL;
  if (envBase && envBase.length > 0) return envBase;
  return new URL(requestUrl).origin;
}

export function buildOAuthCallbackUrl(requestUrl: string, provider: Provider): string {
  return `${getAppBaseUrl(requestUrl)}/api/auth/${provider}/callback`;
}

export function createOAuthState(): string {
  return randomBytes(24).toString("hex");
}

export function makeOAuthStateCookie(provider: Provider, state: string, requestUrl: string): string {
  const secure = secureSuffixFromRequest(requestUrl);
  return `${stateCookieName(provider)}=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${STATE_MAX_AGE_SECONDS}${secure}`;
}

export function clearOAuthStateCookie(provider: Provider, requestUrl: string): string {
  const secure = secureSuffixFromRequest(requestUrl);
  return `${stateCookieName(provider)}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function makeOAuthNextCookie(nextPath: string, requestUrl: string): string {
  const secure = secureSuffixFromRequest(requestUrl);
  return `${NEXT_COOKIE_NAME}=${encodeURIComponent(nextPath)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${STATE_MAX_AGE_SECONDS}${secure}`;
}

export function clearOAuthNextCookie(requestUrl: string): string {
  const secure = secureSuffixFromRequest(requestUrl);
  return `${NEXT_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function readOAuthNextPath(ctx: APIContext): string | null {
  const raw = ctx.cookies.get(NEXT_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

export function readOAuthState(ctx: APIContext, provider: Provider): string | null {
  return ctx.cookies.get(stateCookieName(provider))?.value ?? null;
}

export function redirectWithError(path: string, code: string): Response {
  const location = `${path}?authError=${encodeURIComponent(code)}`;
  return new Response(null, {
    status: 302,
    headers: { Location: location },
  });
}

export async function signInOAuthUser(input: {
  providerId: string;
  email: string;
  name: string;
}): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim() || "User";

  const whereProvider = { googleId: input.providerId };
  const providerField = "googleId";

  let user = await prisma.user.findUnique({ where: whereProvider });

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          name,
          [providerField]: input.providerId,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email,
          name,
          role: "member",
          [providerField]: input.providerId,
          password: null,
        },
      });
    }
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        email,
        name,
      },
    });
  }

  const token = signSession({
    sub: user.id,
    role: user.role as "admin" | "member",
    email: user.email,
    name: user.name,
  });

  return token;
}

export function buildOAuthCompleteResponse(input: {
  token: string;
  provider: Provider;
  requestUrl: string;
  redirectTo?: string;
}): Response {
  const headers = new Headers();
  headers.set("Location", input.redirectTo ?? "/");
  headers.append("Set-Cookie", makeSessionCookie(input.token));
  headers.append("Set-Cookie", clearOAuthStateCookie(input.provider, input.requestUrl));

  return new Response(null, {
    status: 302,
    headers,
  });
}
