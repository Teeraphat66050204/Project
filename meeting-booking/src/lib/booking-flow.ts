import type { Car } from "../data/cars";

export const ADDON_PRICING = {
  insurancePerDay: 350,
  gpsPerDay: 120,
  childSeatPerDay: 150,
  serviceRate: 0.08,
  taxRate: 0.07,
};

export function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function isDateRangeValid(pickup: Date | null, dropoff: Date | null): boolean {
  if (!pickup || !dropoff) return false;
  return dropoff.getTime() > pickup.getTime();
}

export function isDateInPast(value: Date | null): boolean {
  if (!value) return false;
  return value.getTime() < Date.now();
}

export function getRentalDays(pickup: Date, dropoff: Date): number {
  const diffMs = dropoff.getTime() - pickup.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, days);
}

export function isCarAvailableMock(carId: string, pickup: Date, dropoff: Date): boolean {
  const span = Math.floor((dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60));
  const seed = `${carId}-${pickup.toISOString().slice(0, 13)}-${span}`;
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return hash % 5 !== 0;
}

export function calculatePricing(input: {
  car: Car;
  pickup: Date;
  dropoff: Date;
  insurance: boolean;
  gps: boolean;
  childSeat: boolean;
}) {
  const days = getRentalDays(input.pickup, input.dropoff);
  const base = input.car.pricePerDay * days;
  const service = Math.round(base * ADDON_PRICING.serviceRate);
  const insurance = input.insurance ? ADDON_PRICING.insurancePerDay * days : 0;
  const gps = input.gps ? ADDON_PRICING.gpsPerDay * days : 0;
  const childSeat = input.childSeat ? ADDON_PRICING.childSeatPerDay * days : 0;
  const subtotal = base + service + insurance + gps + childSeat;
  const tax = Math.round(subtotal * ADDON_PRICING.taxRate);
  const total = subtotal + tax;
  return { days, base, service, insurance, gps, childSeat, tax, total };
}

export function formatDateTime(value: Date): string {
  return value.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildBookingId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BK-${y}${m}${d}-${rand}`;
}
