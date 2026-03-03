import { cancelRentalById, createRentalWithGeneratedId, deleteRentalAsAdminWithTimeGuard, findOverlappingBooking, getRentalById, listRentals } from "@/models/booking.model";

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

export async function getRentals(input: {
  userId: string;
  role: "admin" | "member";
  carId?: string;
  from?: Date;
  to?: Date;
}) {
  return listRentals({
    userId: input.userId,
    includeAll: input.role === "admin" && Boolean(input.carId || input.from || input.to),
    carId: input.carId,
    from: input.from,
    to: input.to,
  });
}

export async function getRental(id: string, input: { userId: string; role: "admin" | "member" }) {
  const rental = await getRentalById(id);
  if (!rental) throw new RentalError("NOT_FOUND", "Rental not found", 404);
  if (input.role !== "admin" && rental.userId !== input.userId) throw new RentalError("FORBIDDEN", "Forbidden", 403);
  return rental;
}

export async function createRental(input: {
  userId: string;
  carId: string;
  startTime: string;
  endTime: string;
}) {
  const start = new Date(input.startTime);
  const end = new Date(input.endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new RentalError("INVALID_TIME_RANGE", "Invalid time range", 400);
  }
  if (start < new Date()) {
    throw new RentalError("START_TIME_IN_PAST", "Start time must be in the future", 400);
  }

  const durationMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
  if (durationMinutes < MIN_DURATION_MINUTES) {
    throw new RentalError("MIN_RENTAL_DURATION", "Rental must be at least 60 minutes", 400);
  }
  if (durationMinutes > MAX_DURATION_MINUTES) {
    throw new RentalError("MAX_RENTAL_DURATION", "Rental duration too long", 400);
  }

  const overlap = await findOverlappingBooking({ carId: input.carId, startTime: start, endTime: end });
  if (overlap) throw new RentalError("TIME_OVERLAP", "This car is already reserved in that time range", 409);

  return createRentalWithGeneratedId({
    userId: input.userId,
    carId: input.carId,
    startTime: start,
    endTime: end,
    status: "CONFIRMED",
  });
}

export async function cancelRental(id: string, userId: string, role: "admin" | "member") {
  const result = await cancelRentalById(id, userId, role === "admin");
  if (!result) throw new RentalError("NOT_FOUND", "Rental not found", 404);
  if (result === "FORBIDDEN") throw new RentalError("FORBIDDEN", "Forbidden", 403);
  if (result === "ALREADY_CANCELLED") throw new RentalError("ALREADY_CANCELLED", "Already cancelled", 400);
  return result;
}

export async function deleteRentalByAdmin(id: string) {
  const result = await deleteRentalAsAdminWithTimeGuard(id);
  if (!result) throw new RentalError("NOT_FOUND", "Rental not found", 404);
  if (result === "BOOKING_LOCKED_BY_TIME") {
    throw new RentalError("BOOKING_LOCKED_BY_TIME", "Cannot delete after pickup has started", 409);
  }
  return result;
}
