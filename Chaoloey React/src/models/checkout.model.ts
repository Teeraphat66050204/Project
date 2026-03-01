import { db } from "@/lib/db";

export async function upsertGuestUserByEmail(email: string, name?: string) {
  const lowered = email.trim().toLowerCase();
  return db.user.upsert({
    where: { email: lowered },
    update: { name: name?.trim() || "Customer" },
    create: { email: lowered, name: name?.trim() || "Customer", role: "member", password: null },
  });
}

export async function createHold(input: {
  userId: string;
  roomId: string;
  startTime: Date;
  endTime: Date;
  location: string;
}) {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  return db.bookingHold.create({
    data: {
      userId: input.userId,
      roomId: input.roomId,
      startTime: input.startTime,
      endTime: input.endTime,
      expiresAt,
      location: input.location,
    },
    include: { room: true },
  });
}

export async function findHoldById(id: string) {
  return db.bookingHold.findUnique({
    where: { id },
    include: {
      room: true,
      user: true,
    },
  });
}

export async function releaseHold(id: string) {
  await db.bookingHold.delete({ where: { id } }).catch(() => null);
}

export async function createBookingAndConfirmation(input: {
  holdId: string;
  paymentMethod: "card" | "promptpay" | "paypal";
  amount: number;
  customerEmail: string;
  customerName: string;
  transactionId: string;
  emailStatus?: string;
  emailSentAt?: Date | null;
}) {
  const hold = await findHoldById(input.holdId);
  if (!hold) throw new Error("HOLD_NOT_FOUND");
  if (hold.expiresAt.getTime() <= Date.now()) {
    await releaseHold(hold.id);
    throw new Error("HOLD_EXPIRED");
  }

  const overlap = await db.booking.findFirst({
    where: {
      roomId: hold.roomId,
      status: "CONFIRMED",
      startTime: { lt: hold.endTime },
      endTime: { gt: hold.startTime },
    },
    select: { id: true },
  });
  if (overlap) throw new Error("TIME_OVERLAP");

  const booking = await db.booking.create({
    data: {
      userId: hold.userId,
      roomId: hold.roomId,
      startTime: hold.startTime,
      endTime: hold.endTime,
      status: "CONFIRMED",
    },
    include: { room: true },
  });

  const receiptNo = `RCPT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000 + 1000)}`;

  const confirmation = await db.bookingConfirmation.create({
    data: {
      bookingId: booking.id,
      transactionId: input.transactionId,
      receiptNo,
      paymentMethod: input.paymentMethod,
      amount: Math.round(input.amount),
      currency: "THB",
      pickupLocation: hold.location,
      emailTo: input.customerEmail.trim().toLowerCase(),
      emailStatus: input.emailStatus ?? "SENT",
      emailSentAt: input.emailSentAt ?? new Date(),
    },
  });

  await releaseHold(hold.id);
  return { booking, confirmation };
}

export async function findConfirmationByBookingId(bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      room: true,
      user: true,
      confirmation: true,
    },
  });
  return booking;
}

