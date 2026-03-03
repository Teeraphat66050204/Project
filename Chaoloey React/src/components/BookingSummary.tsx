"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DateTimeRangeModal } from "@/components/DateTimeRangeModal";
import { billingDays, durationThaiLabel, formatThaiDateTime, isValidRange } from "@/utils/dateFormat";

type BookingSummaryProps = {
  carId: string;
  pricePerDay: number;
  location: string;
  initialPickup: string;
  initialDropoff: string;
  availableForSelection: boolean;
};

export function BookingSummary({
  carId,
  pricePerDay,
  location,
  initialPickup,
  initialDropoff,
  availableForSelection,
}: BookingSummaryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pickup, setPickup] = useState<Date | null>(initialPickup ? new Date(initialPickup) : null);
  const [dropoff, setDropoff] = useState<Date | null>(initialDropoff ? new Date(initialDropoff) : null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSeed, setModalSeed] = useState(0);

  const hasValid = useMemo(() => isValidRange(pickup, dropoff), [pickup, dropoff]);
  const daysCount = hasValid && dropoff ? billingDays(pickup!, dropoff) : 0;
  const totalPrice = daysCount * pricePerDay;

  const bookingParams = new URLSearchParams();
  bookingParams.set("carId", carId);
  if (location) bookingParams.set("location", location);
  if (hasValid && pickup && dropoff) {
    bookingParams.set("pickup", pickup.toISOString());
    bookingParams.set("dropoff", dropoff.toISOString());
  }

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-[#111827] p-6">
        <p className="text-sm font-semibold text-[#F9FAFB]">ช่วงเวลาที่เลือก</p>
        {hasValid && dropoff ? (
          <>
            <p className="mt-2 text-sm leading-6 text-[rgba(249,250,251,0.85)]">
              รับรถ: {formatThaiDateTime(pickup!)} — คืนรถ: {formatThaiDateTime(dropoff)}
            </p>
            <p className="mt-1 text-sm text-[rgba(249,250,251,0.75)]">{durationThaiLabel(pickup!, dropoff)}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-[rgba(249,250,251,0.75)]">ยังไม่ได้เลือกช่วงวันเวลา</p>
        )}

        <button
          type="button"
          className="btn-base btn-outline mt-4 px-4 py-2 text-sm"
          onClick={() => {
            setModalSeed((value) => value + 1);
            setModalOpen(true);
          }}
        >
          แก้ไขวันเวลา
        </button>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-[#111827] p-6">
        <p className="text-sm font-semibold text-[#F9FAFB]">สรุปราคา</p>
        <div className="mt-3 space-y-2 text-sm text-[rgba(249,250,251,0.85)]">
          <p>{pricePerDay.toLocaleString("th-TH")} บาท/วัน</p>
          <p>จำนวนวัน: {daysCount} วัน</p>
          <p className="border-t border-white/10 pt-2 text-xl font-black text-[#F9FAFB]">
            ราคารวม: {totalPrice.toLocaleString("th-TH")} บาท
          </p>
        </div>
        <div className="mt-4 rounded-xl border border-dashed border-white/20 p-3 text-xs text-[rgba(249,250,251,0.65)]">
          พื้นที่ Add-ons (เร็วๆ นี้)
        </div>
      </section>

      <section className="mt-4 space-y-3">
        {hasValid && !availableForSelection ? (
          <p className="text-sm font-semibold text-[#EF4444]">ช่วงเวลานี้รถคันนี้ไม่ว่าง กรุณาเปลี่ยนวันเวลา</p>
        ) : null}
        <button
          type="button"
          className="btn-base btn-primary w-full px-6 py-3 text-base"
          disabled={!hasValid || !availableForSelection}
          onClick={() => router.push(`/booking?${bookingParams.toString()}`)}
        >
          ดำเนินการจองต่อ
        </button>
      </section>

      <DateTimeRangeModal
        key={modalSeed}
        open={modalOpen}
        initialPickup={pickup}
        initialDropoff={dropoff}
        onClose={() => setModalOpen(false)}
        onConfirm={(nextPickup, nextDropoff) => {
          setPickup(nextPickup);
          setDropoff(nextDropoff);
          setModalOpen(false);

          const params = new URLSearchParams();
          if (location) params.set("location", location);
          params.set("pickup", nextPickup.toISOString());
          params.set("dropoff", nextDropoff.toISOString());
          router.replace(`${pathname}?${params.toString()}`);
        }}
      />
    </>
  );
}
