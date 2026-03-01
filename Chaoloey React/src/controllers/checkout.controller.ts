import { fail, ok } from "@/lib/http";
import { completeCheckoutPayment, createCheckoutHold, getCheckoutConfirmation, getHoldSummary } from "@/services/checkout.service";

export async function createHoldController(body: {
  carId?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  customerEmail?: string;
  customerName?: string;
}) {
  if (!body.carId || !body.startTime || !body.endTime || !body.location || !body.customerEmail) {
    return fail("INVALID_INPUT", 400);
  }
  try {
    const hold = await createCheckoutHold({
      carId: body.carId,
      startTime: body.startTime,
      endTime: body.endTime,
      location: body.location,
      customerEmail: body.customerEmail,
      customerName: body.customerName,
    });
    return ok(hold, 201);
  } catch (error) {
    return fail((error as Error).message || "HOLD_FAILED", 409);
  }
}

export async function holdDetailController(id: string) {
  try {
    const hold = await getHoldSummary(id);
    return ok(hold);
  } catch (error) {
    const code = (error as Error).message || "HOLD_NOT_FOUND";
    return fail(code, code === "HOLD_NOT_FOUND" ? 404 : 409);
  }
}

export async function completeCheckoutController(body: {
  holdId?: string;
  customerEmail?: string;
  customerName?: string;
  method?: "card" | "promptpay" | "paypal";
  paymentMethod?: "card" | "promptpay" | "paypal";
  amount?: number;
  addons?: { insurance?: boolean; gps?: boolean; childSeat?: boolean };
}) {
  const paymentMethod = body.paymentMethod || body.method;
  if (!body.holdId || !body.customerEmail || !body.customerName || !paymentMethod) {
    return fail("INVALID_INPUT", 400);
  }
  try {
    const result = await completeCheckoutPayment({
      holdId: body.holdId,
      customerEmail: body.customerEmail,
      customerName: body.customerName,
      paymentMethod,
      amount: body.amount,
      addons: {
        insurance: Boolean(body.addons?.insurance),
        gps: Boolean(body.addons?.gps),
        childSeat: Boolean(body.addons?.childSeat),
      },
    });
    return ok(result, 201);
  } catch (error) {
    return fail((error as Error).message || "CHECKOUT_FAILED", 409);
  }
}

export async function confirmationController(bookingId: string) {
  try {
    const data = await getCheckoutConfirmation(bookingId);
    return ok(data);
  } catch (error) {
    return fail((error as Error).message || "NOT_FOUND", 404);
  }
}

