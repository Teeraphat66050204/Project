import { prisma } from "../lib/db";

export class HoldError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
  }
}

const HOLD_MINUTES = 15;

type HoldRecord = {
  id: string;
  userId: string;
  roomId: string;
  startTime: string;
  endTime: string;
  expiresAt: string;
  location: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

export function isActiveHold(expiresAt: string | Date): boolean {
  return new Date(expiresAt).getTime() > Date.now();
}

export async function createBookingHold(input: {
  userId?: string;
  customerEmail?: string;
  carId: string;
  startTime: string;
  endTime: string;
  location?: string;
}) {
  if (!input.location?.trim()) {
    throw new HoldError("MISSING_LOCATION", "Pickup location is required", 400);
  }

  const start = new Date(input.startTime);
  const end = new Date(input.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new HoldError("INVALID_TIME_RANGE", "Invalid booking hold time range", 400);
  }
  if (start < new Date()) {
    throw new HoldError("START_TIME_IN_PAST", "Start time must be in the future", 400);
  }

  const overlapBooking = await prisma.booking.findFirst({
    where: {
      roomId: input.carId,
      status: "CONFIRMED",
      startTime: { lt: end },
      endTime: { gt: start },
    },
    select: { id: true },
  });
  if (overlapBooking) {
    throw new HoldError("TIME_OVERLAP", "This car is already reserved", 409);
  }

  const overlapHolds = (await prisma.$queryRawUnsafe(
    `SELECT id FROM "BookingHold"
     WHERE "roomId" = ?
       AND "expiresAt" > ?
       AND "startTime" < ?
       AND "endTime" > ?
     LIMIT 1`,
    input.carId,
    nowIso(),
    end.toISOString(),
    start.toISOString(),
  )) as Array<{ id: string }>;

  if (overlapHolds.length > 0) {
    throw new HoldError("CAR_ON_HOLD", "This car is currently on hold by another user", 409);
  }

  const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000).toISOString();
  const id = crypto.randomUUID();
  const userId = await resolveBookingUserId(input.userId, input.customerEmail);

  await prisma.$executeRawUnsafe(
    `INSERT INTO "BookingHold" ("id", "userId", "roomId", "startTime", "endTime", "expiresAt", "location", "createdAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    id,
    userId,
    input.carId,
    start.toISOString(),
    end.toISOString(),
    expiresAt,
    input.location ?? null,
  );

  return { id, expiresAt };
}

async function resolveBookingUserId(userId?: string, customerEmail?: string) {
  if (userId) return userId;

  const email = customerEmail?.trim().toLowerCase();
  if (!email) {
    throw new HoldError("MISSING_EMAIL", "Email is required for guest checkout", 400);
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.user.create({
    data: {
      email,
      name: "Guest User",
      role: "member",
      password: null,
    },
    select: { id: true },
  });

  return created.id;
}

export async function getBookingHoldById(holdId: string) {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT "id", "userId", "roomId", "startTime", "endTime", "expiresAt", "location"
     FROM "BookingHold" WHERE "id" = ? LIMIT 1`,
    holdId,
  )) as HoldRecord[];
  return rows[0] ?? null;
}

export async function releaseBookingHold(holdId: string) {
  await prisma.$executeRawUnsafe(`DELETE FROM "BookingHold" WHERE "id" = ?`, holdId);
}

export async function cleanupExpiredHolds() {
  await prisma.$executeRawUnsafe(`DELETE FROM "BookingHold" WHERE "expiresAt" <= ?`, nowIso());
}
