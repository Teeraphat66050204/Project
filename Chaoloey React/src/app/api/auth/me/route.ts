import { getSessionFromCookies } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return fail("UNAUTHORIZED", 401);
  return ok(session);
}


