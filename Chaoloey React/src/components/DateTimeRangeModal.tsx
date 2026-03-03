"use client";

import { useMemo, useState } from "react";

type DateTimeRangeModalProps = {
  open: boolean;
  initialPickup: Date | null;
  initialDropoff: Date | null;
  onClose: () => void;
  onConfirm: (pickup: Date, dropoff: Date) => void;
};

const QUICK_TIMES = ["09:00", "12:00", "15:00", "18:00"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateInput(date: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInput(date: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function combineDateTime(datePart: string, timePart: string): Date | null {
  if (!datePart || !timePart) return null;
  const date = new Date(`${datePart}T${timePart}:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function addDays(datePart: string, days: number): string {
  if (!datePart) return "";
  const date = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return toDateInput(date);
}

function halfHourOptions(): string[] {
  const out: string[] = [];
  for (let h = 0; h < 24; h += 1) {
    out.push(`${pad(h)}:00`);
    out.push(`${pad(h)}:30`);
  }
  return out;
}

export function DateTimeRangeModal({
  open,
  initialPickup,
  initialDropoff,
  onClose,
  onConfirm,
}: DateTimeRangeModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [pickupDate, setPickupDate] = useState(() => toDateInput(initialPickup));
  const [pickupTime, setPickupTime] = useState(() => toTimeInput(initialPickup) || "09:00");
  const [dropoffDate, setDropoffDate] = useState(() => toDateInput(initialDropoff));
  const [dropoffTime, setDropoffTime] = useState(() => toTimeInput(initialDropoff) || toTimeInput(initialPickup) || "09:00");
  const [sameDropoffTime, setSameDropoffTime] = useState(
    () => Boolean(initialPickup && initialDropoff && toTimeInput(initialPickup) === toTimeInput(initialDropoff)),
  );

  const pickup = useMemo(() => combineDateTime(pickupDate, pickupTime), [pickupDate, pickupTime]);
  const dropoff = useMemo(() => combineDateTime(dropoffDate, dropoffTime), [dropoffDate, dropoffTime]);

  const pickupError = useMemo(() => {
    if (!pickupDate || !pickupTime) return "กรุณาระบุวันและเวลารับรถ";
    if (!pickup) return "รูปแบบวันเวลารับรถไม่ถูกต้อง";
    if (pickup < new Date()) return "วันเวลารับรถต้องไม่เป็นเวลาในอดีต";
    return "";
  }, [pickupDate, pickupTime, pickup]);

  const dropoffError = useMemo(() => {
    if (!dropoffDate || !dropoffTime) return "กรุณาระบุวันและเวลาคืนรถ";
    if (!dropoff) return "รูปแบบวันเวลาคืนรถไม่ถูกต้อง";
    if (pickup && dropoff <= pickup) return "วันเวลาคืนรถต้องหลังวันเวลารับรถ";
    return "";
  }, [dropoffDate, dropoffTime, dropoff, pickup]);

  const canConfirm = Boolean(!pickupError && !dropoffError && pickup && dropoff);
  const times = useMemo(() => halfHourOptions(), []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-0 sm:p-6">
      <div className="flex min-h-full items-end sm:items-center sm:justify-center">
        <div className="w-full rounded-t-2xl border border-white/10 bg-[#1F2937] p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#F9FAFB]">แก้ไขวันเวลา</h3>
            <button type="button" className="btn-base btn-ghost px-3 py-2 text-xs" onClick={onClose}>
              ยกเลิก
            </button>
          </div>

          <div className="mb-4 flex gap-2">
            <button
              type="button"
              className={`btn-base px-3 py-2 text-xs ${step === 1 ? "btn-primary" : "btn-outline"}`}
              onClick={() => setStep(1)}
            >
              ขั้นตอน 1: รับรถ
            </button>
            <button
              type="button"
              className={`btn-base px-3 py-2 text-xs ${step === 2 ? "btn-primary" : "btn-outline"}`}
              onClick={() => setStep(2)}
            >
              ขั้นตอน 2: คืนรถ
            </button>
          </div>

          {step === 1 ? (
            <section className="space-y-3 rounded-2xl border border-white/10 bg-[#111827] p-4">
              <p className="text-sm font-semibold text-[#F9FAFB]">วันเวลารับรถ</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="pickup-date" className="mb-1 block text-xs text-[rgba(249,250,251,0.8)]">วันที่รับรถ</label>
                  <input
                    id="pickup-date"
                    type="date"
                    className="input-premium"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[rgba(249,250,251,0.8)]">เวลารับรถ (ด่วน)</label>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_TIMES.map((time) => (
                      <button
                        key={time}
                        type="button"
                        className={`btn-base px-3 py-1.5 text-xs ${pickupTime === time ? "btn-primary" : "btn-outline"}`}
                        onClick={() => {
                          setPickupTime(time);
                          if (sameDropoffTime) setDropoffTime(time);
                        }}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="pickup-time-adv" className="mb-1 block text-xs text-[rgba(249,250,251,0.8)]">เวลาแบบละเอียด</label>
                <select
                  id="pickup-time-adv"
                  className="input-premium"
                  value={pickupTime}
                  onChange={(e) => {
                    setPickupTime(e.target.value);
                    if (sameDropoffTime) setDropoffTime(e.target.value);
                  }}
                >
                  {times.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              {pickupError ? <p className="text-sm font-medium text-[#EF4444]">{pickupError}</p> : null}

              <div className="pt-1">
                <button type="button" className="btn-base btn-primary px-4 py-2 text-sm" onClick={() => setStep(2)}>
                  ต่อไป: เลือกวันคืนรถ
                </button>
              </div>
            </section>
          ) : (
            <section className="space-y-3 rounded-2xl border border-white/10 bg-[#111827] p-4">
              <p className="text-sm font-semibold text-[#F9FAFB]">วันเวลาคืนรถ</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="dropoff-date" className="mb-1 block text-xs text-[rgba(249,250,251,0.8)]">วันที่คืนรถ</label>
                  <input
                    id="dropoff-date"
                    type="date"
                    className="input-premium"
                    value={dropoffDate}
                    onChange={(e) => setDropoffDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[rgba(249,250,251,0.8)]">Preset วันคืนรถ</label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-base btn-outline px-3 py-1.5 text-xs" onClick={() => setDropoffDate(addDays(pickupDate, 1))}>
                      +1 วัน
                    </button>
                    <button type="button" className="btn-base btn-outline px-3 py-1.5 text-xs" onClick={() => setDropoffDate(addDays(pickupDate, 3))}>
                      +3 วัน
                    </button>
                    <button type="button" className="btn-base btn-outline px-3 py-1.5 text-xs" onClick={() => setDropoffDate(addDays(pickupDate, 7))}>
                      +7 วัน
                    </button>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-[#F9FAFB]">
                <input
                  type="checkbox"
                  checked={sameDropoffTime}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSameDropoffTime(checked);
                    if (checked) setDropoffTime(pickupTime);
                  }}
                  className="h-4 w-4 accent-[#F59E0B]"
                />
                เวลาเดียวกันกับรับรถ
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-[rgba(249,250,251,0.8)]">เวลาคืนรถ (ด่วน)</label>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_TIMES.map((time) => (
                      <button
                        key={time}
                        type="button"
                        className={`btn-base px-3 py-1.5 text-xs ${dropoffTime === time ? "btn-primary" : "btn-outline"}`}
                        onClick={() => {
                          setSameDropoffTime(false);
                          setDropoffTime(time);
                        }}
                        disabled={sameDropoffTime}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="dropoff-time-adv" className="mb-1 block text-xs text-[rgba(249,250,251,0.8)]">เวลาแบบละเอียด</label>
                  <select
                    id="dropoff-time-adv"
                    className="input-premium"
                    value={dropoffTime}
                    onChange={(e) => {
                      setSameDropoffTime(false);
                      setDropoffTime(e.target.value);
                    }}
                    disabled={sameDropoffTime}
                  >
                    {times.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              {dropoffError ? <p className="text-sm font-medium text-[#EF4444]">{dropoffError}</p> : null}
            </section>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            <button type="button" className="btn-base btn-outline px-4 py-2 text-sm" onClick={onClose}>
              ยกเลิก
            </button>
            <button
              type="button"
              className="btn-base btn-primary px-4 py-2 text-sm"
              disabled={!canConfirm}
              onClick={() => {
                if (!pickup || !dropoff || !canConfirm) return;
                onConfirm(pickup, dropoff);
              }}
            >
              ยืนยันช่วงเวลา
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
