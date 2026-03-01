import { randomBytes } from "node:crypto";

const STATE_COOKIE_PREFIX = "mb_oauth_state_";
const NEXT_COOKIE_NAME = "mb_oauth_next";
const STATE_MAX_AGE_SECONDS = 10 * 60;

type Provider = "google";

function stateCookieName(provider: Provider) {
  return `${STATE_COOKIE_PREFIX}${provider}`;
}

function isSecureRequest(requestUrl: string) {
  try {
    return new URL(requestUrl).protocol === "https:";
  } catch {
    return false;
  }
}

function getAppBaseUrl(requestUrl: string) {
  const envBase = process.env.APP_BASE_URL;
  if (envBase && envBase.length > 0) return envBase;
  return new URL(requestUrl).origin;
}

export function buildOAuthCallbackUrl(requestUrl: string, provider: Provider) {
  return `${getAppBaseUrl(requestUrl)}/api/auth/${provider}/callback`;
}

export function createOAuthState() {
  return randomBytes(24).toString("hex");
}

export function buildCookie(name: string, value: string, requestUrl: string, maxAge: number) {
  const secure = isSecureRequest(requestUrl) ? "; Secure" : "";
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function makeOAuthStateCookie(provider: Provider, state: string, requestUrl: string) {
  return buildCookie(stateCookieName(provider), state, requestUrl, STATE_MAX_AGE_SECONDS);
}

export function clearOAuthStateCookie(provider: Provider, requestUrl: string) {
  return buildCookie(stateCookieName(provider), "", requestUrl, 0);
}

export function makeOAuthNextCookie(nextPath: string, requestUrl: string) {
  return buildCookie(NEXT_COOKIE_NAME, encodeURIComponent(nextPath), requestUrl, STATE_MAX_AGE_SECONDS);
}

export function clearOAuthNextCookie(requestUrl: string) {
  return buildCookie(NEXT_COOKIE_NAME, "", requestUrl, 0);
}

export function readOAuthNextPath(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((x) => x.trim());
  const match = parts.find((x) => x.startsWith(`${NEXT_COOKIE_NAME}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(`${NEXT_COOKIE_NAME}=`.length));
  } catch {
    return null;
  }
}

export function readOAuthState(cookieHeader: string | null, provider: Provider) {
  if (!cookieHeader) return null;
  const key = `${stateCookieName(provider)}=`;
  const parts = cookieHeader.split(";").map((x) => x.trim());
  const match = parts.find((x) => x.startsWith(key));
  if (!match) return null;
  return match.slice(key.length);
}
