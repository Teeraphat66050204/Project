import {
  addDays,
  differenceInMinutes,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
  setHours,
  setMinutes,
} from "date-fns";
import type { Rental } from "../../lib/api";

export type ViewMode = "day" | "week";

const BUSINESS_START_HOUR = 8;
const BUSINESS_END_HOUR = 20;
const SLOT_MINUTES = 30;
const ROW_HEIGHT = 28;
const TOTAL_SLOTS = ((BUSINESS_END_HOUR - BUSINESS_START_HOUR) * 60) / SLOT_MINUTES;

type BookingTimelineProps = {
  selectedDate: Date;
  viewMode: ViewMode;
  rentals: Rental[];
  selectionStart: Date | null;
  selectionEnd: Date | null;
  onSlotClick: (slotStart: Date, slotEnd: Date) => void;
};

type DayColumn = {
  key: string;
  label: string;
  date: Date;
};

function atTime(base: Date, hour: number, minute: number): Date {
  return setMinutes(setHours(startOfDay(base), hour), minute);
}

function slotTimes(day: Date, slotIndex: number): { start: Date; end: Date } {
  const minuteOffset = slotIndex * SLOT_MINUTES;
  const hour = BUSINESS_START_HOUR + Math.floor(minuteOffset / 60);
  const minute = minuteOffset % 60;
  const start = atTime(day, hour, minute);
  const end = new Date(start.getTime() + SLOT_MINUTES * 60_000);
  return { start, end };
}

function clampBookingToBusinessHours(day: Date, rental: Rental): { top: number; height: number } | null {
  const bookingStart = new Date(rental.startTime);
  const bookingEnd = new Date(rental.endTime);

  const businessStart = atTime(day, BUSINESS_START_HOUR, 0);
  const businessEnd = atTime(day, BUSINESS_END_HOUR, 0);

  const start = bookingStart > businessStart ? bookingStart : businessStart;
  const end = bookingEnd < businessEnd ? bookingEnd : businessEnd;

  if (start >= end) return null;

  const topMinutes = differenceInMinutes(start, businessStart);
  const heightMinutes = differenceInMinutes(end, start);

  return {
    top: (topMinutes / SLOT_MINUTES) * ROW_HEIGHT,
    height: Math.max((heightMinutes / SLOT_MINUTES) * ROW_HEIGHT, 12),
  };
}

function slotIsSelected(
  slotStart: Date,
  slotEnd: Date,
  selectionStart: Date | null,
  selectionEnd: Date | null,
): boolean {
  if (!selectionStart) return false;
  if (!selectionEnd) return selectionStart.getTime() === slotStart.getTime();
  return slotStart >= selectionStart && slotEnd <= selectionEnd;
}

function buildColumns(selectedDate: Date, viewMode: ViewMode): DayColumn[] {
  if (viewMode === "day") {
    return [{ key: selectedDate.toISOString(), label: format(selectedDate, "EEE d MMM"), date: selectedDate }];
  }

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    return {
      key: date.toISOString(),
      label: format(date, "EEE d"),
      date,
    };
  });
}

export function BookingTimeline({
  selectedDate,
  viewMode,
  rentals,
  selectionStart,
  selectionEnd,
  onSlotClick,
}: BookingTimelineProps) {
  const columns = buildColumns(selectedDate, viewMode);
  const height = TOTAL_SLOTS * ROW_HEIGHT;

  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
      <div className="min-w-[720px]">
        <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: `80px repeat(${columns.length}, minmax(0, 1fr))` }}>
          <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">Time</div>
          {columns.map((column) => (
            <div
              key={column.key}
              className={[
                "px-3 py-2 text-center text-sm font-medium",
                isSameDay(column.date, new Date()) ? "text-slate-900" : "text-slate-600",
              ].join(" ")}
            >
              {column.label}
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns: `80px repeat(${columns.length}, minmax(0, 1fr))` }}>
          <div className="border-r border-slate-200 bg-slate-50">
            {Array.from({ length: TOTAL_SLOTS }, (_, slotIndex) => {
              const hour = BUSINESS_START_HOUR + Math.floor(slotIndex / 2);
              const label = slotIndex % 2 === 0 ? `${String(hour).padStart(2, "0")}:00` : "";
              return (
                <div
                  key={`label-${slotIndex}`}
                  style={{ height: `${ROW_HEIGHT}px` }}
                  className="border-b border-slate-200 px-2 text-[11px] text-slate-500"
                >
                  {label}
                </div>
              );
            })}
          </div>

          {columns.map((column) => {
            const dayBookings = rentals.filter((rental) => {
              const start = new Date(rental.startTime);
              const end = new Date(rental.endTime);
              return isSameDay(start, column.date) || isSameDay(end, column.date);
            });

            return (
              <div key={column.key} className="relative border-r border-slate-200 last:border-r-0" style={{ height: `${height}px` }}>
                <div className="absolute inset-0 z-0">
                  {Array.from({ length: TOTAL_SLOTS }, (_, slotIndex) => (
                    <div key={`grid-${column.key}-${slotIndex}`} style={{ height: `${ROW_HEIGHT}px` }} className="border-b border-slate-200" />
                  ))}
                </div>

                <div className="absolute inset-0 z-10">
                  {dayBookings.map((rental) => {
                    const bounds = clampBookingToBusinessHours(column.date, rental);
                    if (!bounds) return null;

                    return (
                      <div
                        key={rental.id}
                        className="pointer-events-none absolute left-1 right-1 rounded-md bg-rose-200 px-2 py-1 text-xs text-rose-900"
                        style={{ top: `${bounds.top + 1}px`, height: `${bounds.height - 2}px` }}
                        title={`${format(new Date(rental.startTime), "HH:mm")} - ${format(new Date(rental.endTime), "HH:mm")}`}
                      >
                        <div className="truncate font-medium">{rental.user?.name ?? "Reserved"}</div>
                        <div className="truncate text-[11px]">{format(new Date(rental.startTime), "HH:mm")} - {format(new Date(rental.endTime), "HH:mm")}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="absolute inset-0 z-20">
                  {Array.from({ length: TOTAL_SLOTS }, (_, slotIndex) => {
                    const slot = slotTimes(column.date, slotIndex);
                    const selected = slotIsSelected(slot.start, slot.end, selectionStart, selectionEnd);

                    return (
                      <button
                        key={`slot-${column.key}-${slotIndex}`}
                        type="button"
                        className={[
                          "block w-full border-b border-transparent text-left transition",
                          selected ? "bg-sky-100" : "hover:bg-slate-100/80",
                        ].join(" ")}
                        style={{ height: `${ROW_HEIGHT}px` }}
                        onClick={() => onSlotClick(slot.start, slot.end)}
                        aria-label={`Select ${format(slot.start, "MMM d HH:mm")}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
