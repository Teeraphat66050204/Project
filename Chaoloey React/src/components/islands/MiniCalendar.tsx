import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useEffect, useMemo, useState } from "react";

type MiniCalendarProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
};

export function MiniCalendar({ selectedDate, onSelectDate }: MiniCalendarProps) {
  const [displayMonth, setDisplayMonth] = useState<Date>(startOfMonth(selectedDate));

  useEffect(() => {
    if (!isSameMonth(selectedDate, displayMonth)) {
      setDisplayMonth(startOfMonth(selectedDate));
    }
  }, [selectedDate, displayMonth]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(displayMonth);
    const monthEnd = endOfMonth(displayMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [displayMonth]);

  const weekDays = useMemo(() => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, index) => format(addDays(monday, index), "EEEEE"));
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
          onClick={() => setDisplayMonth((current) => subMonths(current, 1))}
        >
          Prev
        </button>
        <p className="text-sm font-semibold text-slate-800">{format(displayMonth, "MMMM yyyy")}</p>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
          onClick={() => setDisplayMonth((current) => addMonths(current, 1))}
        >
          Next
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
        {weekDays.map((label) => (
          <div key={label} className="py-1 font-medium">
            {label}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const muted = !isSameMonth(day, displayMonth);

          return (
            <button
              key={day.toISOString()}
              type="button"
              className={[
                "h-8 rounded-md text-xs transition",
                muted ? "text-slate-400" : "text-slate-700",
                isToday(day) ? "font-semibold" : "font-normal",
                isSelected ? "bg-slate-900 text-white" : "hover:bg-slate-100",
              ].join(" ")}
              onClick={() => onSelectDate(day)}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}