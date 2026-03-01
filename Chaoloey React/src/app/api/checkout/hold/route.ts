import { createHoldController } from "@/controllers/checkout.controller";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return createHoldController(body);
}

