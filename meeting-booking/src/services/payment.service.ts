export type PaymentMethod = "card" | "promptpay" | "paypal";

export type ChargePaymentInput = {
  amount: number;
  currency: "THB";
  method: PaymentMethod;
  description?: string;
};

export type ChargePaymentResult = {
  provider: "MOCK_GATEWAY";
  transactionId: string;
  status: "succeeded";
  paidAt: string;
};

export class PaymentError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
  }
}

export async function chargePayment(input: ChargePaymentInput): Promise<ChargePaymentResult> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new PaymentError("INVALID_AMOUNT", "Amount must be greater than 0");
  }

  if (!["card", "promptpay", "paypal"].includes(input.method)) {
    throw new PaymentError("INVALID_PAYMENT_METHOD", "Unsupported payment method");
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    provider: "MOCK_GATEWAY",
    transactionId: `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    status: "succeeded",
    paidAt: new Date().toISOString(),
  };
}

