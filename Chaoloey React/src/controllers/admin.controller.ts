import { getSessionFromCookies } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { getAdminDashboardData } from "@/services/admin.service";

export async function adminDashboardController() {
  const session = await getSessionFromCookies();
  if (!session) return fail("UNAUTHORIZED", 401);
  if (session.role !== "admin") return fail("FORBIDDEN", 403);
  const data = await getAdminDashboardData();
  return ok(data);
}


