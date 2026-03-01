import { upsertGoogleUser } from "@/models/user.model";
import { COOKIE_NAME, signSession } from "@/lib/auth";
import { buildOAuthCallbackUrl, clearOAuthNextCookie, clearOAuthStateCookie, readOAuthNextPath, readOAuthState } from "@/lib/oauth";

function redirectWithError(path: string, code: string, requestUrl: string) {
  const headers = new Headers();
  headers.set("Location", `${path}?authError=${encodeURIComponent(code)}`);
  headers.append("Set-Cookie", clearOAuthStateCookie("google", requestUrl));
  headers.append("Set-Cookie", clearOAuthNextCookie(requestUrl));
  return new Response(null, { status: 302, headers });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieHeader = req.headers.get("cookie");
  const savedState = readOAuthState(cookieHeader, "google");
  const nextPathRaw = readOAuthNextPath(cookieHeader) ?? "/";
  const nextPath = nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//") ? nextPathRaw : "/";

  if (!code || !state || !savedState || savedState !== state) {
    return redirectWithError("/", "GOOGLE_STATE_MISMATCH", req.url);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectWithError("/", "GOOGLE_NOT_CONFIGURED", req.url);
  }

  try {
    const redirectUri = buildOAuthCallbackUrl(req.url, "google");
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
    if (!tokenRes.ok) return redirectWithError("/", "GOOGLE_TOKEN_FAILED", req.url);

    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) return redirectWithError("/", "GOOGLE_TOKEN_MISSING", req.url);

    const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!userRes.ok) return redirectWithError("/", "GOOGLE_USERINFO_FAILED", req.url);

    const profile = (await userRes.json()) as { sub?: string; email?: string; name?: string };
    if (!profile.sub || !profile.email) return redirectWithError("/", "GOOGLE_PROFILE_INVALID", req.url);

    const user = await upsertGoogleUser({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name ?? profile.email,
    });

    const token = signSession({
      sub: user.id,
      role: user.role as "admin" | "member",
      email: user.email,
      name: user.name,
    });

    const headers = new Headers();
    headers.set("Location", nextPath);
    headers.append("Set-Cookie", `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`);
    headers.append("Set-Cookie", clearOAuthStateCookie("google", req.url));
    headers.append("Set-Cookie", clearOAuthNextCookie(req.url));
    return new Response(null, { status: 302, headers });
  } catch {
    return redirectWithError("/", "GOOGLE_OAUTH_ERROR", req.url);
  }
}
