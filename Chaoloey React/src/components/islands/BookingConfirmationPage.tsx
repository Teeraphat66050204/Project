import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { ApiError, getCheckoutConfirmation, type BookingConfirmation, type Rental } from "../../lib/api";

type ConfirmationState = {
  booking: Rental;
  confirmation: BookingConfirmation;
};

function buildQrData(state: ConfirmationState): string {
  return JSON.stringify({
    bookingId: state.booking.id,
    receiptNo: state.confirmation.receiptNo,
    car: state.booking.car?.name,
    pickupAt: state.booking.startTime,
    returnAt: state.booking.endTime,
    location: state.confirmation.pickupLocation ?? "",
  });
}

export function BookingConfirmationPage() {
  const [bookingId, setBookingId] = useState("");
  const [state, setState] = useState<ConfirmationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setBookingId(params.get("bookingId") ?? "");
  }, []);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const result = await getCheckoutConfirmation(bookingId);
        if (!active) return;
        setState(result);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.code : "Failed to load confirmation");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [bookingId]);

  const qrUrl = useMemo(() => {
    if (!state) return "";
    const data = buildQrData(state);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}`;
  }, [state]);

  const handleDownloadReceipt = () => {
    if (!state) return;
    const lines = [
      "CHAOLOEY RECEIPT",
      `Receipt No: ${state.confirmation.receiptNo}`,
      `Transaction: ${state.confirmation.transactionId}`,
      `Booking ID: ${state.booking.id}`,
      `Car: ${state.booking.car?.name ?? "-"}`,
      `Pickup: ${state.booking.startTime}`,
      `Return: ${state.booking.endTime}`,
      `Pickup location: ${state.confirmation.pickupLocation ?? "-"}`,
      `Amount: ${state.confirmation.amount.toLocaleString()} ${state.confirmation.currency}`,
      `Email: ${state.confirmation.emailTo}`,
    ].join("\n");

    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state.confirmation.receiptNo}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[#eef2f7] py-8 text-slate-900">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <h1 className="text-4xl font-black text-[#071c45]">Booking Confirmation</h1>

        {loading && <p className="mt-4 text-sm text-slate-600">Loading confirmation...</p>}
        {!loading && !bookingId && (
          <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Missing booking ID.
          </p>
        )}
        {error && <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

        {!loading && state && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,280px]">
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/70 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-blue-600">BOOKING ID</p>
                  <p className="text-lg font-bold text-slate-900">{state.booking.id}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-blue-600">RECEIPT NO</p>
                  <p className="text-lg font-bold text-slate-900">{state.confirmation.receiptNo}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-blue-600">CAR</p>
                  <p className="text-base font-semibold text-slate-900">{state.booking.car?.name ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-blue-600">STATUS</p>
                  <p className="text-base font-semibold text-emerald-700">{state.booking.status.toLowerCase()}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold tracking-wide text-blue-600">PICKUP - RETURN</p>
                  <p className="text-sm text-slate-700">
                    {format(new Date(state.booking.startTime), "dd MMM yyyy HH:mm")} - {format(new Date(state.booking.endTime), "dd MMM yyyy HH:mm")}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold tracking-wide text-blue-600">PICKUP LOCATION</p>
                  <p className="text-sm text-slate-700">{state.confirmation.pickupLocation || "-"}</p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p>Email confirmation: <span className="font-semibold text-emerald-700">{state.confirmation.emailStatus}</span></p>
                <p>Receipt saved and available for download.</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={handleDownloadReceipt} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                  Download Receipt
                </button>
                <a href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                  Back to home
                </a>
              </div>
            </section>

            <aside className="rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-lg shadow-slate-200/70">
              <p className="text-sm font-semibold text-slate-700">QR Code</p>
              {qrUrl && <img src={qrUrl} alt="Booking QR Code" className="mx-auto mt-3 h-[220px] w-[220px] rounded-lg border border-slate-200" />}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

