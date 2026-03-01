import type { APIRoute } from "astro";
import { buildOAuthCallbackUrl, createOAuthState, makeOAuthNextCookie, makeOAuthStateCookie } from "../../../../lib/oauth";

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const clientId = import.meta.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new Response("Missing GOOGLE_CLIENT_ID", { status: 500 });
  }

  const nextRaw = ctx.url.searchParams.get("next") ?? "/";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  const state = createOAuthState();
  const redirectUri = buildOAuthCallbackUrl(ctx.request.url, "google");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "select_account");

  const headers = new Headers();
  headers.set("Location", url.toString());
  headers.append("Set-Cookie", makeOAuthStateCookie("google", state, ctx.request.url));
  headers.append("Set-Cookie", makeOAuthNextCookie(next, ctx.request.url));

  return new Response(null, {
    status: 302,
    headers,
  });
};
