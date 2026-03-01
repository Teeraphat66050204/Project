import type { APIRoute } from "astro";
import { getSession } from "../../../lib/guard";
import { createBookingHold, HoldError } from "../../../services/hold.service";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async (ctx) => {
  const session = getSession(ctx);

  try {
    const raw = await ctx.request.text().catch(() => "");
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    const body = (parsed ?? {}) as {
      carId?: string;
      startTime?: string;
      endTime?: string;
      location?: string;
      customerEmail?: string;
    };

    if (!body.carId || !body.startTime || !body.endTime || !body.location?.trim()) {
      return json({ error: "INVALID_INPUT" }, 400);
    }

    const hold = await createBookingHold({
      userId: session?.sub,
      customerEmail: body.customerEmail,
      carId: body.carId,
      startTime: body.startTime,
      endTime: body.endTime,
      location: body.location,
    });

    return json({ ok: true, data: hold }, 201);
  } catch (error) {
    if (error instanceof HoldError) {
      return json({ error: error.code }, error.statusCode);
    }
    console.error(error);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
};
