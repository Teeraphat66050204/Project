import type { APIRoute, APIContext } from "astro";
import { requireAuth } from "../../../lib/guard";
import { cancelRental, getRentalById, RentalError } from "../../../services/rental.service";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const PATCH: APIRoute = async (ctx: APIContext) => {
  const session = requireAuth(ctx);
  if (session instanceof Response) return session;

  try {
    const rentalId = ctx.params?.id as string | undefined;
    if (!rentalId) return json({ error: "MISSING_ID" }, 400);

    const updated = await cancelRental(rentalId, session.sub, session.role === "admin");

    return json({
      ok: true,
      data: {
        id: updated.id,
        carId: updated.roomId,
        userId: updated.userId,
        startTime: updated.startTime,
        endTime: updated.endTime,
        status: updated.status,
        user: updated.user,
        car: updated.room
          ? {
              id: updated.room.id,
              name: updated.room.name,
              seats: updated.room.capacity,
            }
          : undefined,
      },
    });
  } catch (err) {
    if (err instanceof RentalError) {
      return json({ error: err.code }, err.statusCode);
    }
    console.error(err);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
};

export const GET: APIRoute = async (ctx: APIContext) => {
  const session = requireAuth(ctx);
  if (session instanceof Response) return session;

  try {
    const rentalId = ctx.params?.id as string | undefined;
    if (!rentalId) return json({ error: "MISSING_ID" }, 400);

    const rental = await getRentalById(rentalId);
    if (!rental) return json({ error: "NOT_FOUND" }, 404);
    if (session.role !== "admin" && rental.userId !== session.sub) return json({ error: "FORBIDDEN" }, 403);

    return json({
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
    });
  } catch (err) {
    console.error(err);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
};
