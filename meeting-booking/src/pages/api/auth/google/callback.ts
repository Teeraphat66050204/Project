import type { APIRoute } from "astro";
import {
  buildOAuthCallbackUrl,
  clearOAuthNextCookie,
  clearOAuthStateCookie,
  readOAuthState,
  readOAuthNextPath,
  redirectWithError,
  signInOAuthUser,
} from "../../../../lib/oauth";
import { makeSessionCookie } from "../../../../lib/auth";

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const code = ctx.url.searchParams.get("code");
  const state = ctx.url.searchParams.get("state");
  const savedState = readOAuthState(ctx, "google");
  const nextPathRaw = readOAuthNextPath(ctx) ?? "/";
  const nextPath = nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//") ? nextPathRaw : "/";

  if (!code || !state || !savedState || savedState !== state) {
    return redirectWithError("/", "GOOGLE_STATE_MISMATCH");
  }

  const clientId = import.meta.env.GOOGLE_CLIENT_ID;
  const clientSecret = import.meta.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectWithError("/", "GOOGLE_NOT_CONFIGURED");
  }

  try {
    const redirectUri = buildOAuthCallbackUrl(ctx.request.url, "google");

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return redirectWithError("/", "GOOGLE_TOKEN_FAILED");
    }

    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) {
      return redirectWithError("/", "GOOGLE_TOKEN_MISSING");
    }

    const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
      },
    });

    if (!userRes.ok) {
      return redirectWithError("/", "GOOGLE_USERINFO_FAILED");
    }

    const profile = (await userRes.json()) as {
      sub?: string;
      email?: string;
      name?: string;
    };

    if (!profile.sub || !profile.email) {
      return redirectWithError("/", "GOOGLE_PROFILE_INVALID");
    }

    const token = await signInOAuthUser({
      providerId: profile.sub,
      email: profile.email,
      name: profile.name ?? profile.email,
    });

    const headers = new Headers();
    headers.set("Location", nextPath);
    headers.append("Set-Cookie", makeSessionCookie(token));
    headers.append("Set-Cookie", clearOAuthStateCookie("google", ctx.request.url));
    headers.append("Set-Cookie", clearOAuthNextCookie(ctx.request.url));
    return new Response(null, { status: 302, headers });
  } catch (error) {
    console.error(error);
    const headers = new Headers();
    headers.set("Location", "/?authError=GOOGLE_OAUTH_ERROR");
    headers.append("Set-Cookie", clearOAuthStateCookie("google", ctx.request.url));
    headers.append("Set-Cookie", clearOAuthNextCookie(ctx.request.url));
    return new Response(null, { status: 302, headers });
  }
};
