import type { APIRoute, APIContext } from "astro";
import { requireAuth } from "../../../lib/guard";
import { RentalCreateInput } from "../../../validators/rental.validator";
import { createRental, listRentals, RentalError } from "../../../services/rental.service";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async (ctx: APIContext) => {
  const session = requireAuth(ctx);
  if (session instanceof Response) return session;

  try {
    const url = new URL(ctx.request.url);
    const carId = url.searchParams.get("carId") || undefined;
    const fromStr = url.searchParams.get("from");
    const toStr = url.searchParams.get("to");

    let from: Date | undefined;
    let to: Date | undefined;

    if (fromStr) {
      const fromDate = new Date(fromStr);
      if (isNaN(fromDate.getTime())) return json({ error: "INVALID_FROM_DATETIME" }, 400);
      from = fromDate;
    }

    if (toStr) {
      const toDate = new Date(toStr);
      if (isNaN(toDate.getTime())) return json({ error: "INVALID_TO_DATETIME" }, 400);
      to = toDate;
    }

    const rentalsRaw = await listRentals({ carId, from, to });
    const rentals = rentalsRaw.map((rental) => ({
      id: rental.id,
      carId: rental.roomId,
      userId: rental.userId,
      startTime: rental.startTime,
      endTime: rental.endTime,
      status: rental.status,
      user: rental.user,
      car: rental.room
        ? {
            id: rental.room.id,
            name: rental.room.name,
            seats: rental.room.capacity,
          }
        : undefined,
    }));

    return json({ ok: true, data: rentals });
  } catch (err) {
    console.error(err);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
};

export const POST: APIRoute = async (ctx: APIContext) => {
  const session = requireAuth(ctx);
  if (session instanceof Response) return session;

  try {
    const raw = await ctx.request.text().catch(() => "");
    let parsed: unknown = null;

    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    const validation = RentalCreateInput.safeParse(parsed);
    if (!validation.success) {
      return json({ error: "INVALID_INPUT", issues: validation.error.issues }, 400);
    }

    const rental = await createRental(session.sub, validation.data);

    return json(
      {
        ok: true,
        data: {
          id: rental.id,
          carId: rental.roomId,
          userId: rental.userId,
          startTime: rental.startTime,
          endTime: rental.endTime,
          status: rental.status,
          user: rental.user,
          car: rental.room
            ? {
                id: rental.room.id,
                name: rental.room.name,
                seats: rental.room.capacity,
              }
            : undefined,
        },
      },
      201,
    );
  } catch (err) {
    if (err instanceof RentalError) {
      return json({ error: err.code }, err.statusCode);
    }
    console.error(err);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
};
