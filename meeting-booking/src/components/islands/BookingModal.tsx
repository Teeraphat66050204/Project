import { format } from "date-fns";

type BookingModalProps = {
  open: boolean;
  carName: string;
  start: Date | null;
  end: Date | null;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function BookingModal({
  open,
  carName,
  start,
  end,
  submitting,
  onCancel,
  onConfirm,
}: BookingModalProps) {
  if (!open || !start || !end) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Confirm rental</h2>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p>
            <span className="font-medium text-slate-900">Car:</span> {carName}
          </p>
          <p>
            <span className="font-medium text-slate-900">Date:</span> {format(start, "EEEE, MMM d, yyyy")}
          </p>
          <p>
            <span className="font-medium text-slate-900">Time:</span> {format(start, "HH:mm")} - {format(end, "HH:mm")}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
