export function getPricePerDay(carName: string, seats = 5): number {
  const lower = carName.toLowerCase();
  if (lower.includes("pajero")) return 3400;
  if (lower.includes("cx-5")) return 3200;
  if (lower.includes("civic")) return 2500;
  if (lower.includes("almera")) return 2200;
  if (lower.includes("yaris")) return 2100;
  if (seats >= 7) return 3300;
  if (seats >= 5) return 2500;
  return 2200;
}

