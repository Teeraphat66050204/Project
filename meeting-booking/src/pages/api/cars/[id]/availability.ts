import type { APIRoute } from "astro";
import { getCarById, listCarAvailabilityDays } from "../../../../lib/cars/service";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async ({ params, request }) => {
  const id = params?.id;
  if (!id) return json({ error: "MISSING_ID" }, 400);

  const car = await getCarById(id);
  if (!car) return json({ error: "NOT_FOUND" }, 404);

  const url = new URL(request.url);
  const fromStr = url.searchParams.get("from");
  const daysStr = url.searchParams.get("days");

  const from = fromStr ? new Date(fromStr) : new Date();
  if (Number.isNaN(from.getTime())) return json({ error: "INVALID_FROM" }, 400);

  const daysRaw = daysStr ? Number(daysStr) : 14;
  const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(31, Math.floor(daysRaw))) : 14;

  const availability = await listCarAvailabilityDays(id, from, days);
  return json({
    ok: true,
    data: {
      from: availability.from,
      days: availability.days,
      bookings: availability.bookings,
      car: {
        id: car.id,
        name: car.name,
        seats: car.capacity,
      },
    },
  });
};

