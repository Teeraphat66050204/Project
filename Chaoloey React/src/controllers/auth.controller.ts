import { cookies } from "next/headers";
import { COOKIE_NAME, signSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { loginWithGoogleCredential, loginWithPassword, registerMember } from "@/services/auth.service";

async function setSessionCookie(user: { id: string; role: string; email: string; name: string }) {
  const token = signSession({
    sub: user.id,
    role: user.role as "admin" | "member",
    email: user.email,
    name: user.name,
  });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function loginController(body: { email?: string; password?: string }) {
  if (!body.email || !body.password) return fail("INVALID_INPUT", 400);
  try {
    const user = await loginWithPassword({ email: body.email, password: body.password });
    await setSessionCookie(user);
    return ok({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    return fail((error as Error).message || "INVALID_CREDENTIALS", 401);
  }
}

export async function registerController(body: { name?: string; email?: string; password?: string }) {
  if (!body.name || !body.email || !body.password) return fail("INVALID_INPUT", 400);
  if (body.password.length < 6) return fail("PASSWORD_TOO_SHORT", 400);
  try {
    const user = await registerMember({ name: body.name, email: body.email, password: body.password });
    await setSessionCookie(user);
    return ok({ id: user.id, name: user.name, email: user.email, role: user.role }, 201);
  } catch (error) {
    return fail((error as Error).message || "REGISTER_FAILED", 409);
  }
}

export async function googleLoginController(body: { credential?: string }) {
  if (!body.credential) return fail("INVALID_INPUT", 400);
  try {
    const user = await loginWithGoogleCredential(body.credential);
    await setSessionCookie(user);
    return ok({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    const code = (error as Error).message || "GOOGLE_LOGIN_FAILED";
    const status = code === "GOOGLE_NOT_CONFIGURED" ? 500 : 401;
    return fail(code, status);
  }
}

export async function logoutController() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return ok(true);
}
