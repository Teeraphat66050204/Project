export const PRICE_RULES = {
  baseRatePerDay: 1500,
  seatRatePerDay: 150,
  serviceFeeRate: 0.08,
  extraInsurancePerDay: 350,
  gpsPerDay: 120,
  childSeatPerDay: 150,
  memberDiscountRate: 0.05,
  taxRate: 0.07,
} as const;

export type BookingPricingInput = {
  seats: number;
  rentalDays: number;
  addons: {
    extraInsurance: boolean;
    gps: boolean;
    childSeat: boolean;
  };
  isMember: boolean;
};

export function calcBaseRatePerDay(seats: number): number {
  return PRICE_RULES.baseRatePerDay + Math.max(1, seats) * PRICE_RULES.seatRatePerDay;
}

export function calculateBookingPricing(input: BookingPricingInput) {
  const normalizedDays = Math.max(1, Math.floor(input.rentalDays));
  const baseRatePerDay = calcBaseRatePerDay(input.seats);
  const rentalFee = baseRatePerDay * normalizedDays;
  const serviceFee = Math.round(rentalFee * PRICE_RULES.serviceFeeRate);
  const insuranceFee = input.addons.extraInsurance ? normalizedDays * PRICE_RULES.extraInsurancePerDay : 0;
  const gpsFee = input.addons.gps ? normalizedDays * PRICE_RULES.gpsPerDay : 0;
  const childSeatFee = input.addons.childSeat ? normalizedDays * PRICE_RULES.childSeatPerDay : 0;
  const subTotal = rentalFee + serviceFee + insuranceFee + gpsFee + childSeatFee;
  const memberDiscount = input.isMember ? Math.round(subTotal * PRICE_RULES.memberDiscountRate) : 0;
  const discountedSubTotal = Math.max(0, subTotal - memberDiscount);
  const tax = Math.round(discountedSubTotal * PRICE_RULES.taxRate);
  const total = discountedSubTotal + tax;

  return {
    baseRatePerDay,
    rentalFee,
    serviceFee,
    insuranceFee,
    gpsFee,
    childSeatFee,
    memberDiscount,
    tax,
    total,
  };
}

export type PricingInput = {
  pricePerDay: number;
  pickupISO: string;
  dropoffISO: string;
  insurance: boolean;
  gps: boolean;
  childSeat: boolean;
};

export type Pricing = {
  days: number;
  base: number;
  service: number;
  insurance: number;
  gps: number;
  childSeat: number;
  tax: number;
  total: number;
};

export function calculatePricing(input: PricingInput): Pricing {
  const pickup = new Date(input.pickupISO);
  const dropoff = new Date(input.dropoffISO);
  const ms = Math.max(0, dropoff.getTime() - pickup.getTime());
  const days = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));

  const base = input.pricePerDay * days;
  const service = Math.round(base * 0.08);
  const insurance = input.insurance ? 350 * days : 0;
  const gps = input.gps ? 120 * days : 0;
  const childSeat = input.childSeat ? 150 * days : 0;
  const subtotal = base + service + insurance + gps + childSeat;
  const tax = Math.round(subtotal * 0.07);
  const total = subtotal + tax;

  return { days, base, service, insurance, gps, childSeat, tax, total };
}
