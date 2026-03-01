import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { createUser, findUserByEmail, upsertGoogleUser } from "@/models/user.model";

const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client();

export async function registerMember(input: { name: string; email: string; password: string }) {
  const exists = await findUserByEmail(input.email);
  if (exists) throw new Error("EMAIL_ALREADY_EXISTS");
  const hash = await bcrypt.hash(input.password, 10);
  return createUser({ name: input.name, email: input.email, password: hash, role: "member" });
}

export async function loginWithPassword(input: { email: string; password: string }) {
  const user = await findUserByEmail(input.email);
  if (!user || !user.password) throw new Error("INVALID_CREDENTIALS");
  const ok = await bcrypt.compare(input.password, user.password);
  if (!ok) throw new Error("INVALID_CREDENTIALS");
  return user;
}

export async function loginWithGoogleCredential(credential: string) {
  if (!credential?.trim()) throw new Error("INVALID_GOOGLE_CREDENTIAL");
  if (!googleClientId) throw new Error("GOOGLE_NOT_CONFIGURED");

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: googleClientId,
  });
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload?.email || payload.email_verified === false) {
    throw new Error("INVALID_GOOGLE_TOKEN");
  }

  return upsertGoogleUser({
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split("@")[0],
  });
}
