import { carDetailController } from "@/controllers/car.controller";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  return carDetailController(params.id);
}

