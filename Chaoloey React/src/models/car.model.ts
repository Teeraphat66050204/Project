import { findCatalogByName } from "@/data/cars";
import { db } from "@/lib/db";

function isCatalogCar(name: string) {
  return Boolean(findCatalogByName(name));
}

export async function listCars() {
  const rows = await db.car.findMany({ orderBy: { name: "asc" } });
  return rows.filter((row) => isCatalogCar(row.name));
}

export async function getCarById(id: string) {
  const row = await db.car.findUnique({ where: { id } });
  if (!row) return null;
  return isCatalogCar(row.name) ? row : null;
}

export async function listAvailableCars(from: Date, to: Date) {
  const cars = await listCars();
  if (!(from instanceof Date) || Number.isNaN(from.getTime()) || !(to instanceof Date) || Number.isNaN(to.getTime()) || to <= from) {
    return [];
  }

  const overlaps = await db.booking.findMany({
    where: {
      status: "CONFIRMED",
      startTime: { lt: to },
      endTime: { gt: from },
    },
    select: { carId: true },
  });

  const busy = new Set(overlaps.map((x) => x.carId));
  return cars.filter((car) => !busy.has(car.id));
}

export async function listCarAvailabilityDays(carId: string, from: Date, days: number) {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  const bookings = await db.booking.findMany({
    where: {
      carId,
      status: "CONFIRMED",
      startTime: { lt: end },
      endTime: { gt: start },
    },
    select: { startTime: true, endTime: true },
    orderBy: { startTime: "asc" },
  });

  return {
    from: start.toISOString(),
    days,
    bookings: bookings.map((b) => ({
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
    })),
  };
}
