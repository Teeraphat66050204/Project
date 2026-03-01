import { buildOAuthCallbackUrl, createOAuthState, makeOAuthNextCookie, makeOAuthStateCookie } from "@/lib/oauth";

export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return new Response("Missing GOOGLE_CLIENT_ID", { status: 500 });

  const url = new URL(req.url);
  const nextRaw = url.searchParams.get("next") ?? "/";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  const state = createOAuthState();
  const redirectUri = buildOAuthCallbackUrl(req.url, "google");

  const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  oauthUrl.searchParams.set("client_id", clientId);
  oauthUrl.searchParams.set("redirect_uri", redirectUri);
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("scope", "openid email profile");
  oauthUrl.searchParams.set("state", state);
  oauthUrl.searchParams.set("access_type", "offline");
  oauthUrl.searchParams.set("prompt", "select_account");

  const headers = new Headers();
  headers.set("Location", oauthUrl.toString());
  headers.append("Set-Cookie", makeOAuthStateCookie("google", state, req.url));
  headers.append("Set-Cookie", makeOAuthNextCookie(next, req.url));
  return new Response(null, { status: 302, headers });
}
