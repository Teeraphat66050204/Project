import type { APIRoute } from "astro";
import { listAvailableCars } from "../../../lib/cars/service";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const fromStr = url.searchParams.get("from");
    const toStr = url.searchParams.get("to");

    if (!fromStr || !toStr) {
      return json({ error: "MISSING_SEARCH_RANGE" }, 400);
    }

    const from = new Date(fromStr);
    const to = new Date(toStr);

    if (Number.isNaN(from.getTime())) {
      return json({ error: "INVALID_FROM_DATETIME" }, 400);
    }
    if (Number.isNaN(to.getTime())) {
      return json({ error: "INVALID_TO_DATETIME" }, 400);
    }
    if (to <= from) {
      return json({ error: "INVALID_TIME_RANGE" }, 400);
    }

    const carsRaw = await listAvailableCars(from, to);
    const cars = carsRaw.map((car) => ({
      id: car.id,
      name: car.name,
      seats: car.capacity,
    }));

    return json({ ok: true, data: cars });
  } catch (error) {
    console.error(error);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
};

