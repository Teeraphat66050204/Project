import { carAvailabilityController } from "@/controllers/car.controller";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const { searchParams } = new URL(req.url);
  return carAvailabilityController(params.id, searchParams);
}
