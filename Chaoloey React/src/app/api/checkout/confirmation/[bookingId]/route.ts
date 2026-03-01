import { confirmationController } from "@/controllers/checkout.controller";

export async function GET(_: Request, ctx: { params: Promise<{ bookingId: string }> }) {
  const params = await ctx.params;
  return confirmationController(params.bookingId);
}

