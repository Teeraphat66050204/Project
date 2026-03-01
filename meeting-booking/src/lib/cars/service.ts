import { prisma } from "../db";
import type { CarCreateInput, CarUpdateInput } from "./schema";

export async function listCars() {
  return prisma.room.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      capacity: true,
    },
  });
}

export async function getCarById(id: string) {
  return prisma.room.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      capacity: true,
    },
  });
}

export async function listAvailableCars(from: Date, to: Date) {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      name: string;
      capacity: number;
    }>
  >(
    `SELECT r."id", r."name", r."capacity"
     FROM "Room" r
     WHERE NOT EXISTS (
       SELECT 1
       FROM "Booking" b
       WHERE b."roomId" = r."id"
         AND b."status" = 'CONFIRMED'
         AND b."startTime" < ?
         AND b."endTime" > ?
     )
     AND NOT EXISTS (
       SELECT 1
       FROM "BookingHold" h
       WHERE h."roomId" = r."id"
         AND h."expiresAt" > ?
         AND h."startTime" < ?
         AND h."endTime" > ?
     )
     ORDER BY r."name" ASC`,
    to.toISOString(),
    from.toISOString(),
    new Date().toISOString(),
    to.toISOString(),
    from.toISOString(),
  );

  return rows;
}

export async function listCarAvailabilityDays(id: string, from: Date, days: number) {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + days);

  const bookings = await prisma.booking.findMany({
    where: {
      roomId: id,
      status: "CONFIRMED",
      startTime: { lt: end },
      endTime: { gt: start },
    },
    orderBy: { startTime: "asc" },
    select: {
      startTime: true,
      endTime: true,
    },
  });

  return { from: start, days, bookings };
}

export async function createCar(data: CarCreateInput) {
  return prisma.room.create({
    data: {
      name: data.name,
      capacity: data.seats,
    },
  });
}

export async function updateCar(id: string, data: CarUpdateInput) {
  return prisma.room.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.seats !== undefined ? { capacity: data.seats } : {}),
    },
  });
}

export async function deleteCar(id: string) {
  return prisma.room.delete({ where: { id } });
}
