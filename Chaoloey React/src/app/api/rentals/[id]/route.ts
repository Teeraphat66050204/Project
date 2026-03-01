import { cancelRentalController, deleteRentalByAdminController, getRentalController } from "@/controllers/rental.controller";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  return getRentalController(params.id);
}

export async function PATCH(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  return cancelRentalController(params.id);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  return deleteRentalByAdminController(params.id);
}
