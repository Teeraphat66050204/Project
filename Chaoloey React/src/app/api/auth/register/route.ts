import { registerController } from "@/controllers/auth.controller";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return registerController(body);
}


