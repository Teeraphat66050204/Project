import { getCarById, listAvailableCars, listCarAvailabilityDays, listCars } from "@/models/car.model";

export async function getCars() {
  return listCars();
}

export async function getCar(id: string) {
  return getCarById(id);
}

export async function getAvailable(input: { from: string; to: string }) {
  const from = new Date(input.from);
  const to = new Date(input.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    throw new Error("INVALID_TIME_RANGE");
  }
  return listAvailableCars(from, to);
}

export async function getAvailabilityByDays(input: { id: string; from?: string; days?: string }) {
  const from = input.from ? new Date(input.from) : new Date();
  if (Number.isNaN(from.getTime())) throw new Error("INVALID_FROM");

  const daysRaw = input.days ? Number(input.days) : 14;
  const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(31, Math.floor(daysRaw))) : 14;
  return listCarAvailabilityDays(input.id, from, days);
}
