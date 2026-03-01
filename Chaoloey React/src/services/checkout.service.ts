import { getSessionFromCookies } from "@/lib/auth";
import { getPricePerDay } from "@/lib/car-pricing";
import { calculatePricing } from "@/lib/pricing";
import { createBookingAndConfirmation, createHold, findConfirmationByBookingId, findHoldById, upsertGuestUserByEmail } from "@/models/checkout.model";
import { sendConfirmationEmail } from "@/services/notification.service";
import { chargePayment } from "@/services/payment.service";

export async function createCheckoutHold(input: {
  carId: string;
  startTime: string;
  endTime: string;
  location: string;
  customerEmail: string;
  customerName?: string;
}) {
  const start = new Date(input.startTime);
  const end = new Date(input.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new Error("INVALID_TIME_RANGE");
  if (!input.location.trim()) throw new Error("MISSING_LOCATION");
  if (start < new Date()) throw new Error("START_TIME_IN_PAST");

  const session = await getSessionFromCookies();
  const userId = session?.sub ?? (await upsertGuestUserByEmail(input.customerEmail, input.customerName)).id;

  const hold = await createHold({
    userId,
    roomId: input.carId,
    startTime: start,
    endTime: end,
    location: input.location,
  });

  return {
    id: hold.id,
    expiresAt: hold.expiresAt,
    car: { id: hold.room.id, name: hold.room.name, seats: hold.room.capacity, pricePerDay: getPricePerDay(hold.room.name, hold.room.capacity) },
    pickup: hold.startTime,
    dropoff: hold.endTime,
    location: hold.location,
  };
}

export async function getHoldSummary(id: string) {
  const hold = await findHoldById(id);
  if (!hold) throw new Error("HOLD_NOT_FOUND");
  if (hold.expiresAt.getTime() <= Date.now()) throw new Error("HOLD_EXPIRED");

  return {
    id: hold.id,
    expiresAt: hold.expiresAt,
    car: { id: hold.room.id, name: hold.room.name, seats: hold.room.capacity, pricePerDay: getPricePerDay(hold.room.name, hold.room.capacity) },
    pickup: hold.startTime,
    dropoff: hold.endTime,
    location: hold.location,
    customer: { name: hold.user.name, email: hold.user.email },
  };
}

export async function completeCheckoutPayment(input: {
  holdId: string;
  customerEmail: string;
  customerName: string;
  paymentMethod: "card" | "promptpay" | "paypal";
  addons: { insurance: boolean; gps: boolean; childSeat: boolean };
  amount?: number;
}) {
  const hold = await findHoldById(input.holdId);
  if (!hold) throw new Error("HOLD_NOT_FOUND");
  if (hold.expiresAt.getTime() <= Date.now()) throw new Error("HOLD_EXPIRED");

  const pricing = calculatePricing({
    pricePerDay: getPricePerDay(hold.room.name, hold.room.capacity),
    pickupISO: hold.startTime.toISOString(),
    dropoffISO: hold.endTime.toISOString(),
    insurance: input.addons.insurance,
    gps: input.addons.gps,
    childSeat: input.addons.childSeat,
  });

  const chargeAmount = input.amount && Number.isFinite(input.amount) && input.amount > 0 ? Math.round(input.amount) : pricing.total;
  const payment = await chargePayment({
    amount: chargeAmount,
    currency: "THB",
    method: input.paymentMethod,
    description: `Car rental payment for ${hold.room.name}`,
  });

  const result = await createBookingAndConfirmation({
    holdId: input.holdId,
    paymentMethod: input.paymentMethod,
    amount: chargeAmount,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    transactionId: payment.transactionId,
    emailStatus: "PENDING",
    emailSentAt: null,
  });

  const emailResult = await sendConfirmationEmail({
    to: input.customerEmail.trim().toLowerCase(),
    subject: `Booking Confirmation ${result.confirmation.receiptNo}`,
    bookingId: result.booking.id,
    receiptNo: result.confirmation.receiptNo,
    carName: hold.room.name,
    pickupAt: hold.startTime.toISOString(),
    returnAt: hold.endTime.toISOString(),
    location: hold.location || "",
    total: chargeAmount,
  });

  return {
    booking: {
      id: result.booking.id,
      status: result.booking.status,
      carId: result.booking.roomId,
      startTime: result.booking.startTime,
      endTime: result.booking.endTime,
      car: {
        id: hold.room.id,
        name: hold.room.name,
        seats: hold.room.capacity,
      },
    },
    payment,
    confirmation: {
      id: result.confirmation.id,
      receiptNo: result.confirmation.receiptNo,
      transactionId: result.confirmation.transactionId,
      pickupLocation: result.confirmation.pickupLocation,
      emailStatus: emailResult.status,
      emailSentAt: emailResult.sentAt,
    },
    bookingId: result.booking.id,
    transactionId: result.confirmation.transactionId,
    amount: result.confirmation.amount,
  };
}

export async function getCheckoutConfirmation(bookingId: string) {
  const row = await findConfirmationByBookingId(bookingId);
  if (!row || !row.confirmation) throw new Error("NOT_FOUND");
  return {
    booking: {
      id: row.id,
      status: row.status,
      startTime: row.startTime,
      endTime: row.endTime,
      car: { id: row.room.id, name: row.room.name, seats: row.room.capacity, pricePerDay: getPricePerDay(row.room.name, row.room.capacity) },
      customer: { id: row.user.id, name: row.user.name, email: row.user.email },
    },
    confirmation: {
      receiptNo: row.confirmation.receiptNo,
      transactionId: row.confirmation.transactionId,
      paymentMethod: row.confirmation.paymentMethod,
      amount: row.confirmation.amount,
      currency: row.confirmation.currency,
      pickupLocation: row.confirmation.pickupLocation,
      emailTo: row.confirmation.emailTo,
      emailStatus: row.confirmation.emailStatus,
      emailSentAt: row.confirmation.emailSentAt,
    },
  };
}
