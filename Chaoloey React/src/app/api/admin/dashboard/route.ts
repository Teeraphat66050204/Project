import { adminDashboardController } from "@/controllers/admin.controller";

export async function GET() {
  return adminDashboardController();
}


