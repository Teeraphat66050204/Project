import { deleteRentalByAdminController } from "@/controllers/rental.controller";

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  return deleteRentalByAdminController(params.id);
}
