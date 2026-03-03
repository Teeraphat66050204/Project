import {
  addDays,
  addWeeks,
  differenceInMinutes,
  endOfDay,
  endOfWeek,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
  subDays,
  subWeeks,
} from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { ApiError, createRental, getCars, getRentals, type Car, type Rental } from "../../lib/api";
import { BookingModal } from "./BookingModal";
import { BookingTimeline, type ViewMode } from "./BookingTimeline";
import { MiniCalendar } from "./MiniCalendar";
import { CarSelect } from "./CarSelect";
import { ToastViewport, type ToastItem } from "./ToastViewport";

const MAX_DURATION_MINUTES = 720;

function overlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
}

function toastId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type BookingCalendarCoreProps = {
  initialCarId?: string;
};

export function BookingCalendar({ initialCarId = "" }: BookingCalendarCoreProps) {
  return <BookingCalendarCore initialCarId={initialCarId} />;
}

export function BookingCalendarCore({ initialCarId = "" }: BookingCalendarCoreProps) {
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCarId, setSelectedCarId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [rentals, setRentals] = useState<Rental[]>([]);

  const [carsLoading, setCarsLoading] = useState<boolean>(true);
  const [rentalsLoading, setRentalsLoading] = useState<boolean>(false);
  const [carsError, setCarsError] = useState<string>("");
  const [rentalsError, setRentalsError] = useState<string>("");

  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const range = useMemo(() => {
    if (viewMode === "day") {
      return { from: startOfDay(selectedDate), to: endOfDay(selectedDate) };
    }

    return {
      from: startOfWeek(selectedDate, { weekStartsOn: 1 }),
      to: endOfWeek(selectedDate, { weekStartsOn: 1 }),
    };
  }, [selectedDate, viewMode]);

  const selectedCar = useMemo(
    () => cars.find((car) => car.id === selectedCarId) ?? null,
    [cars, selectedCarId],
  );

  const pushToast = (type: ToastItem["type"], message: string) => {
    const id = toastId();
    setToasts((current) => [...current, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3500);
  };

  const dismissToast = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const loadCars = async () => {
    setCarsLoading(true);
    setCarsError("");

    try {
      const data = await getCars();
      setCars(data);
      if (data.length > 0) {
        setSelectedCarId((current) => {
          if (current) return current;
          if (initialCarId && data.some((car) => car.id === initialCarId)) return initialCarId;
          return data[0].id;
        });
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.code : "Failed to load cars";
      setCarsError(message);
    } finally {
      setCarsLoading(false);
    }
  };

  const loadRentals = async () => {
    if (!selectedCarId) {
      setRentals([]);
      return;
    }

    setRentalsLoading(true);
    setRentalsError("");

    try {
      const data = await getRentals({ carId: selectedCarId, from: range.from, to: range.to });
      setRentals(data);
    } catch (error) {
      const message = error instanceof ApiError ? error.code : "Failed to load rentals";
      setRentalsError(message);
    } finally {
      setRentalsLoading(false);
    }
  };

  useEffect(() => {
    void loadCars();
  }, []);

  useEffect(() => {
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsModalOpen(false);
    void loadRentals();
  }, [selectedCarId, range.from.getTime(), range.to.getTime()]);

  const handleSlotClick = (slotStart: Date, slotEnd: Date) => {
    if (!selectionStart || selectionEnd) {
      const slotTaken = rentals.some((rental) =>
        overlap(slotStart, slotEnd, new Date(rental.startTime), new Date(rental.endTime)),
      );
      if (slotTaken) {
        pushToast("error", "This car is already reserved in this slot.");
        return;
      }

      setSelectionStart(slotStart);
      setSelectionEnd(null);
      return;
    }

    if (!isSameDay(selectionStart, slotStart)) {
      pushToast("error", "Start and end must be on the same day.");
      setSelectionStart(slotStart);
      setSelectionEnd(null);
      return;
    }

    if (slotStart <= selectionStart) {
      setSelectionStart(slotStart);
      setSelectionEnd(null);
      return;
    }

    const duration = differenceInMinutes(slotEnd, selectionStart);
    if (duration > MAX_DURATION_MINUTES) {
      pushToast("error", "Rental cannot exceed 12 hours in this planner.");
      return;
    }

    const hasOverlap = rentals.some((rental) =>
      overlap(selectionStart, slotEnd, new Date(rental.startTime), new Date(rental.endTime)),
    );

    if (hasOverlap) {
      pushToast("error", "Selected range overlaps an existing rental.");
      return;
    }

    setSelectionEnd(slotEnd);
    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedCarId || !selectionStart || !selectionEnd) return;

    setIsSubmitting(true);

    try {
      await createRental({
        carId: selectedCarId,
        startTime: selectionStart.toISOString(),
        endTime: selectionEnd.toISOString(),
      });

      pushToast("success", "Rental created.");
      setIsModalOpen(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      await loadRentals();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "TIME_OVERLAP") {
          pushToast("error", "TIME_OVERLAP: this car was just booked.");
        } else if (
          error.code === "MIN_RENTAL_DURATION" ||
          error.code === "MAX_RENTAL_DURATION" ||
          error.code === "START_TIME_IN_PAST" ||
          error.code === "INVALID_INPUT"
        ) {
          pushToast("error", error.code);
        } else {
          pushToast("error", `Rental failed: ${error.code}`);
        }
      } else {
        pushToast("error", "Rental failed.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const goPrevious = () => {
    setSelectedDate((current) => (viewMode === "day" ? subDays(current, 1) : subWeeks(current, 1)));
  };

  const goNext = () => {
    setSelectedDate((current) => (viewMode === "day" ? addDays(current, 1) : addWeeks(current, 1)));
  };

  const title =
    viewMode === "day"
      ? format(selectedDate, "EEEE, MMMM d, yyyy")
      : `${format(range.from, "MMM d")} - ${format(range.to, "MMM d, yyyy")}`;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Rent a car</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => setSelectedDate(startOfDay(new Date()))}
          >
            Today
          </button>
          <button
            type="button"
            className={[
              "rounded-md border px-3 py-2 text-sm",
              viewMode === "day"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-100",
            ].join(" ")}
            onClick={() => setViewMode("day")}
          >
            Day
          </button>
          <button
            type="button"
            className={[
              "rounded-md border px-3 py-2 text-sm",
              viewMode === "week"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-100",
            ].join(" ")}
            onClick={() => setViewMode("week")}
          >
            Week
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px,1fr]">
        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {carsLoading ? (
              <p className="text-sm text-slate-500">Loading cars...</p>
            ) : carsError ? (
              <div className="space-y-2">
                <p className="text-sm text-rose-700">Failed to load cars: {carsError}</p>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
                  onClick={() => void loadCars()}
                >
                  Retry
                </button>
              </div>
            ) : cars.length === 0 ? (
              <p className="text-sm text-slate-500">No cars available.</p>
            ) : (
              <CarSelect cars={cars} value={selectedCarId} onChange={setSelectedCarId} />
            )}
          </div>

          <MiniCalendar selectedDate={selectedDate} onSelectDate={(date) => setSelectedDate(startOfDay(date))} />
        </aside>

        <section className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              onClick={goPrevious}
            >
              Prev
            </button>
            <p className="text-sm font-medium text-slate-800">{title}</p>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              onClick={goNext}
            >
              Next
            </button>
          </div>

          {rentalsError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <p>Failed to load rentals: {rentalsError}</p>
              <button
                type="button"
                className="mt-2 rounded-md border border-rose-300 px-3 py-1.5 text-sm hover:bg-rose-100"
                onClick={() => void loadRentals()}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {rentalsLoading && <p className="text-sm text-slate-500">Loading rentals...</p>}
              {!rentalsLoading && rentals.length === 0 && (
                <p className="text-sm text-slate-500">No rentals in this range.</p>
              )}
              <BookingTimeline
                selectedDate={selectedDate}
                viewMode={viewMode}
                rentals={rentals}
                selectionStart={selectionStart}
                selectionEnd={selectionEnd}
                onSlotClick={handleSlotClick}
              />
            </>
          )}
        </section>
      </div>

      <BookingModal
        open={isModalOpen}
        carName={selectedCar?.name ?? "Car"}
        start={selectionStart}
        end={selectionEnd}
        submitting={isSubmitting}
        onCancel={() => setIsModalOpen(false)}
        onConfirm={() => void handleConfirm()}
      />
    </div>
  );
}

