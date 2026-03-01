import { prisma } from "../lib/db";
import { createRental, RentalError } from "./rental.service";
import { chargePayment, type PaymentMethod } from "./payment.service";
import { sendConfirmationEmail } from "./notification.service";
import { cleanupExpiredHolds, getBookingHoldById, isActiveHold, releaseBookingHold } from "./hold.service";

export type CompleteCheckoutInput = {
  holdId: string;
  customerEmail: string;
  customerName: string;
  method: PaymentMethod;
  amount: number;
};

export class CheckoutError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
  }
}

function generateReceiptNo() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `RCPT-${yyyy}${mm}${dd}-${suffix}`;
}

export async function completeCheckout(input: CompleteCheckoutInput) {
  await cleanupExpiredHolds();

  if (!input.customerEmail.trim()) {
    throw new CheckoutError("MISSING_EMAIL", "Customer email is required");
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new CheckoutError("INVALID_AMOUNT", "Amount must be greater than 0");
  }

  const hold = await getBookingHoldById(input.holdId);
  if (!hold) {
    throw new CheckoutError("HOLD_NOT_FOUND", "Booking hold not found", 404);
  }
  if (!isActiveHold(hold.expiresAt)) {
    await releaseBookingHold(hold.id);
    throw new CheckoutError("HOLD_EXPIRED", "Booking hold expired. Please search again.", 409);
  }

  const payment = await chargePayment({
    amount: input.amount,
    currency: "THB",
    method: input.method,
    description: `Car rental payment for ${hold.roomId}`,
  });

  let rental;
  try {
    rental = await createRental(hold.userId, {
      carId: hold.roomId,
      startTime: new Date(hold.startTime).toISOString(),
      endTime: new Date(hold.endTime).toISOString(),
    });
  } catch (error) {
    if (error instanceof RentalError) {
      throw new CheckoutError(error.code, error.message, error.statusCode);
    }
    throw error;
  }

  const receiptNo = generateReceiptNo();

  const emailResult = await sendConfirmationEmail({
    to: input.customerEmail,
    subject: `Booking Confirmation ${receiptNo}`,
    bookingId: rental.id,
    receiptNo,
    carName: rental.room?.name ?? "Car",
    pickupAt: rental.startTime.toISOString(),
    returnAt: rental.endTime.toISOString(),
    location: hold.location ?? "",
    total: input.amount,
  });

  const confirmation = (await prisma.bookingConfirmation.create({
    data: {
      bookingId: rental.id,
      transactionId: payment.transactionId,
      receiptNo,
      paymentMethod: input.method,
      amount: input.amount,
      currency: "THB",
      pickupLocation: hold.location || null,
      emailTo: input.customerEmail,
      emailStatus: emailResult.status,
      emailSentAt: new Date(emailResult.sentAt),
    } as any,
  })) as any;

  await releaseBookingHold(hold.id);

  return {
    booking: {
      id: rental.id,
      status: rental.status,
      carId: rental.roomId,
      startTime: rental.startTime,
      endTime: rental.endTime,
      car: rental.room
        ? {
            id: rental.room.id,
            name: rental.room.name,
            seats: rental.room.capacity,
          }
        : undefined,
    },
    payment,
    confirmation: {
      id: confirmation.id,
      receiptNo: confirmation.receiptNo,
      transactionId: confirmation.transactionId,
      pickupLocation: confirmation.pickupLocation,
      emailStatus: confirmation.emailStatus,
      emailSentAt: confirmation.emailSentAt,
    },
  };
}
