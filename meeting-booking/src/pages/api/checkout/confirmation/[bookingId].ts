import type { APIRoute } from "astro";
import { requireAuth } from "../../../../lib/guard";
import { prisma } from "../../../../lib/db";
import { getRentalById } from "../../../../services/rental.service";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async (ctx) => {
  const session = requireAuth(ctx);
  if (session instanceof Response) return session;

  try {
    const bookingId = ctx.params?.bookingId;
    if (!bookingId) return json({ error: "MISSING_ID" }, 400);

    const booking = await getRentalById(bookingId);
    if (!booking) return json({ error: "NOT_FOUND" }, 404);
    if (session.role !== "admin" && booking.userId !== session.sub) return json({ error: "FORBIDDEN" }, 403);

    const confirmation = (await prisma.bookingConfirmation.findUnique({
      where: { bookingId },
    })) as any;
    if (!confirmation) return json({ error: "NOT_FOUND" }, 404);

    return json({
      ok: true,
      data: {
        booking: {
          id: booking.id,
          status: booking.status,
          startTime: booking.startTime,
          endTime: booking.endTime,
          car: booking.room
            ? {
                id: booking.room.id,
                name: booking.room.name,
                seats: booking.room.capacity,
              }
            : undefined,
        },
        confirmation: {
          receiptNo: confirmation.receiptNo,
          transactionId: confirmation.transactionId,
          paymentMethod: confirmation.paymentMethod,
          amount: confirmation.amount,
          currency: confirmation.currency,
          pickupLocation: confirmation.pickupLocation,
          emailTo: confirmation.emailTo,
          emailStatus: confirmation.emailStatus,
          emailSentAt: confirmation.emailSentAt,
        },
      },
    });
  } catch (error) {
    console.error(error);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
};
