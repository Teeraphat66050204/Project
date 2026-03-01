export type Car = {
  id: string;
  name: string;
  seats: number;
};

export type CarAvailabilityBooking = {
  startTime: string;
  endTime: string;
};

export type CarAvailability = {
  from: string;
  days: number;
  bookings: CarAvailabilityBooking[];
  car: Car;
};

export type RentalUser = {
  id: string;
  name: string;
  email: string;
};

export type RentalCar = {
  id: string;
  name: string;
  seats?: number;
};

export type Rental = {
  id: string;
  carId: string;
  userId: string;
  startTime: string;
  endTime: string;
  status: string;
  user?: RentalUser;
  car?: RentalCar;
};

export type BookingConfirmation = {
  receiptNo: string;
  transactionId: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  pickupLocation?: string | null;
  emailTo: string;
  emailStatus: string;
  emailSentAt?: string | null;
};

export type CheckoutResult = {
  booking: {
    id: string;
    status: string;
    carId: string;
    startTime: string;
    endTime: string;
    car?: RentalCar;
  };
  payment: PaymentChargeResult;
  confirmation: {
    id: string;
    receiptNo: string;
    transactionId: string;
    pickupLocation?: string | null;
    emailStatus: string;
    emailSentAt?: string | null;
  };
};

export type CreateRentalPayload = {
  carId: string;
  startTime: string;
  endTime: string;
};

export type PaymentMethod = "card" | "promptpay" | "paypal";

export type ChargePaymentPayload = {
  amount: number;
  currency: "THB";
  method: PaymentMethod;
  description?: string;
};

export type PaymentChargeResult = {
  provider: "MOCK_GATEWAY";
  transactionId: string;
  status: "succeeded";
  paidAt: string;
};

export type CompleteCheckoutPayload = {
  holdId: string;
  customerEmail: string;
  customerName: string;
  method: PaymentMethod;
  amount: number;
};

export type BookingHold = {
  id: string;
  expiresAt: string;
};

export type CreateBookingHoldPayload = {
  carId: string;
  startTime: string;
  endTime: string;
  location?: string;
  customerEmail?: string;
};

export type SessionUser = {
  sub: string;
  role: "admin" | "member";
  email: string;
  name: string;
};

export type AdminDashboardCard = {
  id: string;
  label: string;
  value: string;
  deltaText: string;
  trend: "up" | "down" | "flat";
};

export type AdminDashboardAppointment = {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  carName: string;
  pickupAt: string;
  returnAt: string;
  pickupLocation: string;
  status: string;
  amount: number;
};

export type AdminDashboardTrendPoint = {
  date: string;
  bookings: number;
  revenue: number;
};

export type AdminDashboardData = {
  cards: AdminDashboardCard[];
  todayAppointments: AdminDashboardAppointment[];
  upcomingAppointments: AdminDashboardAppointment[];
  trend: AdminDashboardTrendPoint[];
};

type SuccessEnvelope<T> = {
  ok: true;
  data: T;
};

type ErrorEnvelope = {
  error?: string;
  message?: string;
  issues?: unknown;
};

export class ApiError extends Error {
  status: number;
  code: string;
  issues?: unknown;

  constructor(status: number, code: string, message?: string, issues?: unknown) {
    super(message ?? code);
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const errorBody = (body ?? {}) as ErrorEnvelope;
    throw new ApiError(
      res.status,
      errorBody.error ?? `HTTP_${res.status}`,
      errorBody.message,
      errorBody.issues,
    );
  }

  const envelope = body as SuccessEnvelope<T>;
  if (!envelope || envelope.ok !== true) {
    throw new ApiError(500, "INVALID_API_RESPONSE", "Unexpected API response format");
  }

  return envelope.data;
}

export async function login(email: string, password: string): Promise<{ id: string; name: string; email: string; role: string }> {
  return request<{ id: string; name: string; email: string; role: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ id: string; name: string; email: string; role: string }> {
  return request<{ id: string; name: string; email: string; role: string }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function logout(): Promise<boolean> {
  return request<boolean>("/api/auth/logout", { method: "POST" });
}

export async function getMe(): Promise<SessionUser> {
  return request<SessionUser>("/api/auth/me", { method: "GET" });
}

export async function getCars(): Promise<Car[]> {
  return request<Car[]>("/api/cars", { method: "GET" });
}

export async function getAvailableCars(params: { from: Date; to: Date }): Promise<Car[]> {
  const url = new URL("/api/cars/available", window.location.origin);
  url.searchParams.set("from", params.from.toISOString());
  url.searchParams.set("to", params.to.toISOString());

  return request<Car[]>(url.toString(), { method: "GET" });
}

export async function getCarById(id: string): Promise<Car> {
  return request<Car>(`/api/cars/${id}`, { method: "GET" });
}

export async function getCarAvailability(id: string, params?: { from?: Date; days?: number }): Promise<CarAvailability> {
  const url = new URL(`/api/cars/${id}/availability`, window.location.origin);
  if (params?.from) url.searchParams.set("from", params.from.toISOString());
  if (params?.days) url.searchParams.set("days", String(params.days));

  return request<CarAvailability>(url.toString(), { method: "GET" });
}

export async function getRentals(params: { carId: string; from: Date; to: Date }): Promise<Rental[]> {
  const url = new URL("/api/rentals", window.location.origin);
  url.searchParams.set("carId", params.carId);
  url.searchParams.set("from", params.from.toISOString());
  url.searchParams.set("to", params.to.toISOString());

  return request<Rental[]>(url.toString(), { method: "GET" });
}

export async function getRentalById(id: string): Promise<Rental> {
  return request<Rental>(`/api/rentals/${id}`, { method: "GET" });
}

export async function createRental(payload: CreateRentalPayload): Promise<Rental> {
  return request<Rental>("/api/rentals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function chargePayment(payload: ChargePaymentPayload): Promise<PaymentChargeResult> {
  return request<PaymentChargeResult>("/api/payments/charge", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function completeCheckout(payload: CompleteCheckoutPayload): Promise<CheckoutResult> {
  return request<CheckoutResult>("/api/checkout/complete", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createBookingHold(payload: CreateBookingHoldPayload): Promise<BookingHold> {
  return request<BookingHold>("/api/checkout/hold", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCheckoutConfirmation(bookingId: string): Promise<{ booking: Rental; confirmation: BookingConfirmation }> {
  return request<{ booking: Rental; confirmation: BookingConfirmation }>(`/api/checkout/confirmation/${bookingId}`, {
    method: "GET",
  });
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  return request<AdminDashboardData>("/api/admin/dashboard", { method: "GET" });
}

export async function deleteAdminBooking(bookingId: string): Promise<{ id: string }> {
  return request<{ id: string }>(`/api/admin/bookings/${encodeURIComponent(bookingId)}`, {
    method: "DELETE",
  });
}
