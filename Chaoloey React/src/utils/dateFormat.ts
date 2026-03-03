const DAY_MS = 24 * 60 * 60 * 1000;

export function formatThaiDateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const datePart = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return `${datePart} ${timePart}`;
}

export function diffHours(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / (60 * 60 * 1000)));
}

export function billingDays(from: Date, to: Date): number {
  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / DAY_MS));
}

export function durationThaiLabel(from: Date, to: Date): string {
  const hours = diffHours(from, to);
  if (hours < 24) return `รวม ${hours} ชั่วโมง`;
  const days = Math.max(1, Math.ceil(hours / 24));
  return `รวม ${days} วัน`;
}

export function isValidRange(from: Date | null, to: Date | null): boolean {
  if (!from || !to) return false;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return false;
  return to > from;
}
