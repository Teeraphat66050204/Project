import { getPricePerDay } from "@/lib/car-pricing";
import { fail, ok } from "@/lib/http";
import { getAvailabilityByDays, getAvailable, getCar, getCars } from "@/services/car.service";

export async function listCarsController() {
  const cars = await getCars();
  return ok(cars.map((car) => ({ id: car.id, name: car.name, seats: car.capacity, pricePerDay: getPricePerDay(car.name, car.capacity) })));
}

export async function availableCarsController(searchParams: URLSearchParams) {
  try {
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    if (!from || !to) return fail("MISSING_SEARCH_RANGE", 400);
    const rows = await getAvailable({ from, to });
    return ok(rows.map((car) => ({ id: car.id, name: car.name, seats: car.capacity, pricePerDay: getPricePerDay(car.name, car.capacity) })));
  } catch (error) {
    return fail((error as Error).message || "INVALID_TIME_RANGE", 400);
  }
}

export async function carDetailController(id: string) {
  const car = await getCar(id);
  if (!car) return fail("NOT_FOUND", 404);
  return ok({ id: car.id, name: car.name, seats: car.capacity, pricePerDay: getPricePerDay(car.name, car.capacity) });
}

export async function carAvailabilityController(id: string, searchParams: URLSearchParams) {
  const car = await getCar(id);
  if (!car) return fail("NOT_FOUND", 404);

  try {
    const availability = await getAvailabilityByDays({
      id,
      from: searchParams.get("from") || undefined,
      days: searchParams.get("days") || undefined,
    });
    return ok({
      from: availability.from,
      days: availability.days,
      bookings: availability.bookings,
      car: { id: car.id, name: car.name, seats: car.capacity },
    });
  } catch (error) {
    return fail((error as Error).message || "INVALID_FROM", 400);
  }
}
