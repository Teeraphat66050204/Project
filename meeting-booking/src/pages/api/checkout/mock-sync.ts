import type { APIRoute } from "astro";
import { prisma } from "../../../lib/db";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function generateReceiptNo() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `RCPT-${yyyy}${mm}${dd}-${suffix}`;
}

export const POST: APIRoute = async (ctx) => {
  try {
    const raw = await ctx.request.text().catch(() => "");
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    const body = (parsed ?? {}) as {
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
      return json({ error: "INVALID_INPUT" }, 400);
    }

    const startTime = new Date(body.pickup);
    const endTime = new Date(body.dropoff);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || endTime <= startTime) {
      return json({ error: "INVALID_TIME_RANGE" }, 400);
    }

    const email = body.customerEmail.trim().toLowerCase();
    const customerName = body.customerName.trim();

    const user = await prisma.user.upsert({
      where: { email },
      update: { name: customerName || "Customer" },
      create: {
        email,
        name: customerName || "Customer",
        role: "member",
        password: null,
      },
      select: { id: true },
    });

    let room = await prisma.room.findFirst({
      where: { name: body.carName.trim() },
      select: { id: true },
    });
    if (!room) {
      room = await prisma.room.create({
        data: {
          name: body.carName.trim(),
          capacity: 5,
        },
        select: { id: true },
      });
    }

    let booking = await prisma.booking.findFirst({
      where: {
        userId: user.id,
        roomId: room.id,
        startTime,
        endTime,
      },
      select: { id: true },
    });

    if (!booking) {
      booking = await prisma.booking.create({
        data: {
          userId: user.id,
          roomId: room.id,
          startTime,
          endTime,
          status: "CONFIRMED",
        },
        select: { id: true },
      });
    }

    const existingConfirmation = await prisma.bookingConfirmation.findUnique({
      where: { bookingId: booking.id },
      select: { id: true },
    });

    if (!existingConfirmation) {
      await prisma.bookingConfirmation.create({
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

    return json({
      ok: true,
      data: {
        bookingId: booking.id,
      },
    });
  } catch (error) {
    console.error(error);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
};

