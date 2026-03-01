import { fail, ok } from "@/lib/http";
import { chargePayment, PaymentError, type PaymentMethod } from "@/services/payment.service";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    amount?: number;
    currency?: "THB";
    method?: PaymentMethod;
    description?: string;
  };

  if (!body.amount || !body.currency || !body.method) return fail("INVALID_INPUT", 400);

  try {
    const result = await chargePayment({
      amount: body.amount,
      currency: body.currency,
      method: body.method,
      description: body.description,
    });
    return ok(result, 201);
  } catch (error) {
    if (error instanceof PaymentError) return fail(error.code, error.statusCode);
    return fail("INTERNAL_ERROR", 500);
  }
}
