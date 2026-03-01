import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";

function generateReceiptNo() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `RCPT-${yyyy}${mm}${dd}-${suffix}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      bookingId?: string;
      carName?: string;
      pickup?: string;
      dropoff?: string;
      location?: string;
      total?: number;
      customerName?: string;
      customerEmail?: string;
      transactionId?: string;
    };

    if (
      !body.bookingId?.trim() ||
      !body.carName?.trim() ||
      !body.pickup ||
      !body.dropoff ||
      !body.customerEmail?.trim() ||
      !body.customerName?.trim() ||
      !Number.isFinite(body.total) ||
      Number(body.total) <= 0
    ) {
      return fail("INVALID_INPUT", 400);
    }

    const startTime = new Date(body.pickup);
    const endTime = new Date(body.dropoff);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || endTime <= startTime) {
      return fail("INVALID_TIME_RANGE", 400);
    }

    const email = body.customerEmail.trim().toLowerCase();
    const customerName = body.customerName.trim();
    const user = await db.user.upsert({
      where: { email },
      update: { name: customerName || "Customer" },
      create: { email, name: customerName || "Customer", role: "member", password: null },
      select: { id: true },
    });

    let room = await db.room.findFirst({
      where: { name: body.carName.trim() },
      select: { id: true },
    });
    if (!room) {
      room = await db.room.create({
        data: { name: body.carName.trim(), capacity: 5 },
        select: { id: true },
      });
    }

    let booking = await db.booking.findFirst({
      where: { userId: user.id, roomId: room.id, startTime, endTime },
      select: { id: true },
    });
    if (!booking) {
      booking = await db.booking.create({
        data: { userId: user.id, roomId: room.id, startTime, endTime, status: "CONFIRMED" },
        select: { id: true },
      });
    }

    const existing = await db.bookingConfirmation.findUnique({
      where: { bookingId: booking.id },
      select: { id: true },
    });
    if (!existing) {
      await db.bookingConfirmation.create({
        data: {
          bookingId: booking.id,
          transactionId: body.transactionId?.trim() || `TX-${Date.now()}`,
          receiptNo: generateReceiptNo(),
          paymentMethod: "card",
          amount: Math.round(Number(body.total)),
          currency: "THB",
          pickupLocation: body.location?.trim() || null,
          emailTo: email,
          emailStatus: "SENT",
          emailSentAt: new Date(),
        },
      });
    }

    return ok({ bookingId: booking.id });
  } catch {
    return fail("INTERNAL_ERROR", 500);
  }
}
