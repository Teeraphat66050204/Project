import { prisma } from "../lib/db";
import type { Prisma } from "@prisma/client";
import type { CreateRentalInput } from "../validators/rental.validator";

export class RentalError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
  }
}

const MIN_DURATION_MINUTES = 60;
const MAX_DURATION_MINUTES = 7 * 24 * 60;
const BOOKING_ID_RETRY_LIMIT = 5;
type BookingWithRelations = Prisma.BookingGetPayload<{
  include: {
    user: { select: { id: true; name: true; email: true } };
    room: { select: { id: true; name: true; capacity: true } };
  };
}>;

function generateBookingId(now = new Date()) {
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BK-${yyyy}${mm}${dd}-${randomPart}`;
}

export async function createRental(userId: string, input: CreateRentalInput) {
  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);

  if (startTime >= endTime) {
    throw new RentalError("INVALID_TIME_RANGE", "Start time must be before end time", 400);
  }

  if (startTime < new Date()) {
    throw new RentalError("START_TIME_IN_PAST", "Start time must be in the future", 400);
  }

  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  if (durationMinutes < MIN_DURATION_MINUTES) {
    throw new RentalError("MIN_RENTAL_DURATION", `Rental must be at least ${MIN_DURATION_MINUTES} minutes`, 400);
  }

  if (durationMinutes > MAX_DURATION_MINUTES) {
    throw new RentalError("MAX_RENTAL_DURATION", `Rental cannot exceed ${MAX_DURATION_MINUTES} minutes`, 400);
  }

  const existingRental = await prisma.booking.findFirst({
    where: {
      roomId: input.carId,
      status: "CONFIRMED",
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });

  if (existingRental) {
    throw new RentalError("TIME_OVERLAP", "This car is already reserved in that time range", 409);
  }

  const activeHoldByOthers = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT "id" FROM "BookingHold"
     WHERE "roomId" = ?
       AND "userId" <> ?
       AND "expiresAt" > ?
       AND "startTime" < ?
       AND "endTime" > ?
     LIMIT 1`,
    input.carId,
    userId,
    new Date().toISOString(),
    endTime.toISOString(),
    startTime.toISOString(),
  );

  if (activeHoldByOthers.length > 0) {
    throw new RentalError("CAR_ON_HOLD", "This car is currently on hold", 409);
  }

  let rental: BookingWithRelations | null = null;

  for (let attempt = 0; attempt < BOOKING_ID_RETRY_LIMIT; attempt += 1) {
    try {
      rental = await prisma.booking.create({
        data: {
          id: generateBookingId(),
          userId,
          roomId: input.carId,
          startTime,
          endTime,
          status: "CONFIRMED",
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          room: { select: { id: true, name: true, capacity: true } },
        },
      });
      break;
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === "P2002" && attempt < BOOKING_ID_RETRY_LIMIT - 1) {
        continue;
      }
      throw error;
    }
  }

  if (!rental) {
    throw new RentalError("BOOKING_ID_GENERATION_FAILED", "Failed to generate booking id", 500);
  }

  return rental;
}

export async function listRentals(filter?: { carId?: string; from?: Date; to?: Date }) {
  return prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      ...(filter?.carId && { roomId: filter.carId }),
      ...(filter?.from && { endTime: { gte: filter.from } }),
      ...(filter?.to && { startTime: { lte: filter.to } }),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      room: { select: { id: true, name: true, capacity: true } },
    },
    orderBy: [{ startTime: "asc" }],
  });
}

export async function getRentalById(rentalId: string) {
  return prisma.booking.findUnique({
    where: { id: rentalId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      room: { select: { id: true, name: true, capacity: true } },
    },
  });
}

export async function cancelRental(rentalId: string, userId: string, isAdmin: boolean) {
  const rental = await prisma.booking.findUnique({ where: { id: rentalId } });

  if (!rental) {
    throw new RentalError("NOT_FOUND", "Rental not found", 404);
  }

  if (!isAdmin && rental.userId !== userId) {
    throw new RentalError("FORBIDDEN", "You can only cancel your own rentals", 403);
  }

  if (rental.status === "CANCELLED") {
    throw new RentalError("ALREADY_CANCELLED", "Rental is already cancelled", 400);
  }

  return prisma.booking.update({
    where: { id: rentalId },
    data: { status: "CANCELLED" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      room: { select: { id: true, name: true, capacity: true } },
    },
  });
}

export async function deleteRentalAsAdminWithTimeGuard(rentalId: string) {
  const rental = await prisma.booking.findUnique({
    where: { id: rentalId },
    select: {
      id: true,
      startTime: true,
    },
  });

  if (!rental) {
    throw new RentalError("NOT_FOUND", "Rental not found", 404);
  }

  if (rental.startTime.getTime() <= Date.now()) {
    throw new RentalError(
      "BOOKING_LOCKED_BY_TIME",
      "Cannot delete booking after pickup time has started",
      409,
    );
  }

  await prisma.booking.delete({
    where: { id: rentalId },
  });

  return { id: rentalId };
}
