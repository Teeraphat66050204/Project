import { db } from "@/lib/db";

export async function findUserByEmail(email: string) {
  return db.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function createUser(input: { name: string; email: string; password: string; role?: "admin" | "member" }) {
  return db.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      password: input.password,
      role: input.role ?? "member",
    },
  });
}

export async function upsertGoogleUser(input: { email: string; name: string; googleId: string }) {
  const email = input.email.toLowerCase().trim();
  const name = input.name.trim() || "Google User";
  const googleId = input.googleId.trim();

  const byGoogle = await db.user.findUnique({ where: { googleId } });
  if (byGoogle) {
    return db.user.update({
      where: { id: byGoogle.id },
      data: {
        email,
        name,
      },
    });
  }

  const byEmail = await db.user.findUnique({ where: { email } });
  if (byEmail) {
    return db.user.update({
      where: { id: byEmail.id },
      data: {
        googleId,
        name,
      },
    });
  }

  return db.user.create({
    data: {
      email,
      name,
      googleId,
      password: null,
      role: "member",
    },
  });
}
