import { db } from "@/lib/db";

function generateBookingId(now = new Date()) {
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BK-${yyyy}${mm}${dd}-${randomPart}`;
}

export async function listRentals(input?: { userId?: string; carId?: string; from?: Date; to?: Date; includeAll?: boolean }) {
  return db.booking.findMany({
    where: {
      ...(input?.includeAll ? {} : input?.userId ? { userId: input.userId } : {}),
      ...(input?.carId ? { roomId: input.carId } : {}),
      ...(input?.from ? { endTime: { gte: input.from } } : {}),
      ...(input?.to ? { startTime: { lte: input.to } } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      room: { select: { id: true, name: true, capacity: true } },
      confirmation: true,
    },
    orderBy: { startTime: "desc" },
  });
}

export async function getRentalById(id: string) {
  return db.booking.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      room: { select: { id: true, name: true, capacity: true } },
      confirmation: true,
    },
  });
}

export async function findOverlappingBooking(input: { roomId: string; startTime: Date; endTime: Date }) {
  return db.booking.findFirst({
    where: {
      roomId: input.roomId,
      status: "CONFIRMED",
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime },
    },
    select: { id: true },
  });
}

export async function createRentalWithGeneratedId(input: {
  userId: string;
  roomId: string;
  startTime: Date;
  endTime: Date;
  status?: string;
}) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const id = generateBookingId();
      return await db.booking.create({
        data: {
          id,
          userId: input.userId,
          roomId: input.roomId,
          startTime: input.startTime,
          endTime: input.endTime,
          status: input.status ?? "CONFIRMED",
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          room: { select: { id: true, name: true, capacity: true } },
        },
      });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code !== "P2002" || attempt === 4) throw error;
    }
  }
  throw new Error("BOOKING_ID_GENERATION_FAILED");
}

export async function cancelRentalById(id: string, userId: string, isAdmin: boolean) {
  const booking = await db.booking.findUnique({ where: { id } });
  if (!booking) return null;
  if (!isAdmin && booking.userId !== userId) return "FORBIDDEN" as const;
  if (booking.status === "CANCELLED") return "ALREADY_CANCELLED" as const;
  return db.booking.update({ where: { id }, data: { status: "CANCELLED" } });
}

export async function deleteRentalAsAdminWithTimeGuard(id: string) {
  const booking = await db.booking.findUnique({
    where: { id },
    select: { id: true, startTime: true },
  });
  if (!booking) return null;
  if (booking.startTime.getTime() <= Date.now()) return "BOOKING_LOCKED_BY_TIME" as const;

  await db.booking.delete({ where: { id } });
  return { id: booking.id };
}
