import type { APIRoute } from "astro";
import { requireAdmin } from "../../../../lib/guard";
import { deleteRentalAsAdminWithTimeGuard, RentalError } from "../../../../services/rental.service";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const DELETE: APIRoute = async (ctx) => {
  const session = requireAdmin(ctx);
  if (session instanceof Response) return session;

  try {
    const bookingId = ctx.params?.id;
    if (!bookingId) return json({ error: "MISSING_ID" }, 400);

    const deleted = await deleteRentalAsAdminWithTimeGuard(bookingId);
    return json({ ok: true, data: deleted });
  } catch (error) {
    if (error instanceof RentalError) {
      return json({ error: error.code }, error.statusCode);
    }
    console.error(error);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
};
