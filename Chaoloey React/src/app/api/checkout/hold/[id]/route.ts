import { holdDetailController } from "@/controllers/checkout.controller";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  return holdDetailController(params.id);
}

