"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type CarDatePickerProps = {
  pickup: string;
  dropoff: string;
  location: string;
  labels: {
    open: string;
    pickup: string;
    dropoff: string;
    prevDay: string;
    nextDay: string;
    apply: string;
    cancel: string;
    invalid: string;
  };
};

function toDateTimeLocalValue(value: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = parsed.getFullYear();
  const mm = pad(parsed.getMonth() + 1);
  const dd = pad(parsed.getDate());
  const hh = pad(parsed.getHours());
  const min = pad(parsed.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function toIsoString(value: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

function shiftLocalValue(value: string, days: number): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  parsed.setDate(parsed.getDate() + days);
  return toDateTimeLocalValue(parsed.toISOString());
}

export function CarDatePicker({ pickup, dropoff, location, labels }: CarDatePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pickupValue, setPickupValue] = useState(() => toDateTimeLocalValue(pickup));
  const [dropoffValue, setDropoffValue] = useState(() => toDateTimeLocalValue(dropoff));

  const invalidRange = useMemo(() => {
    if (!pickupValue || !dropoffValue) return false;
    const from = new Date(pickupValue);
    const to = new Date(dropoffValue);
    return Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from;
  }, [pickupValue, dropoffValue]);

  const apply = () => {
    if (invalidRange) return;
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    const pickupIso = toIsoString(pickupValue);
    const dropoffIso = toIsoString(dropoffValue);
    if (pickupIso) params.set("pickup", pickupIso);
    if (dropoffIso) params.set("dropoff", dropoffIso);
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  };

  return (
    <div className="mt-3">
      <button type="button" className="btn-base btn-outline px-3 py-2 text-xs" onClick={() => setOpen((v) => !v)}>
        {labels.open}
      </button>

      {open ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-[#0F172A] p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[rgba(249,250,251,0.80)]" htmlFor="pickup-input">
                {labels.pickup}
              </label>
              <input
                id="pickup-input"
                type="datetime-local"
                value={pickupValue}
                onChange={(e) => setPickupValue(e.target.value)}
                className="input-premium"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[rgba(249,250,251,0.80)]" htmlFor="dropoff-input">
                {labels.dropoff}
              </label>
              <input
                id="dropoff-input"
                type="datetime-local"
                value={dropoffValue}
                onChange={(e) => setDropoffValue(e.target.value)}
                className="input-premium"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-base btn-outline px-3 py-2 text-xs"
              onClick={() => {
                setPickupValue((v) => shiftLocalValue(v, -1));
                setDropoffValue((v) => shiftLocalValue(v, -1));
              }}
              disabled={!pickupValue || !dropoffValue}
            >
              {labels.prevDay}
            </button>
            <button
              type="button"
              className="btn-base btn-outline px-3 py-2 text-xs"
              onClick={() => {
                setPickupValue((v) => shiftLocalValue(v, 1));
                setDropoffValue((v) => shiftLocalValue(v, 1));
              }}
              disabled={!pickupValue || !dropoffValue}
            >
              {labels.nextDay}
            </button>
            <button type="button" className="btn-base btn-outline px-3 py-2 text-xs" onClick={() => setOpen(false)}>
              {labels.cancel}
            </button>
            <button type="button" className="btn-base btn-primary px-3 py-2 text-xs" onClick={apply} disabled={invalidRange}>
              {labels.apply}
            </button>
          </div>

          {invalidRange ? <p className="mt-2 text-xs text-red-400">{labels.invalid}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

