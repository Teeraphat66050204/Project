import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { ApiError, completeCheckout, type PaymentMethod } from "../../lib/api";

type BookingDraft = {
  holdId: string;
  holdExpiresAt: string;
  carId: string;
  carName: string;
  location: string;
  pickupAt: string;
  returnAt: string;
  form: {
    fullName: string;
    phone: string;
    email: string;
    licenseNo: string;
  };
  addons: {
    extraInsurance: boolean;
    gps: boolean;
    childSeat: boolean;
  };
  pricing: {
    rentalFee: number;
    serviceFee: number;
    insuranceFee: number;
    gpsFee: number;
    childSeatFee: number;
    memberDiscount?: number;
    tax: number;
    total: number;
  };
};

export function PaymentPage() {
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ transactionId: string; bookingId: string } | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const raw = window.sessionStorage.getItem("bookingDraft");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as BookingDraft;
      setDraft(parsed);
    } catch {
      setDraft(null);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const canPay = useMemo(() => {
    if (!draft) return false;
    if (!draft.carId || !draft.pickupAt || !draft.returnAt) return false;
    if (!draft.holdId || !draft.holdExpiresAt) return false;
    return draft.pricing.total > 0;
  }, [draft]);

  const holdRemainingSec = useMemo(() => {
    if (!draft?.holdExpiresAt) return 0;
    const diff = Math.floor((new Date(draft.holdExpiresAt).getTime() - now) / 1000);
    return diff > 0 ? diff : 0;
  }, [draft?.holdExpiresAt, now]);

  const handlePay = async () => {
    if (!draft || !canPay) return;
    if (holdRemainingSec <= 0) {
      setError("HOLD_EXPIRED");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const checkout = await completeCheckout({
        holdId: draft.holdId,
        customerEmail: draft.form.email,
        customerName: draft.form.fullName,
        method,
        amount: draft.pricing.total,
      });

      setSuccess({
        transactionId: checkout.confirmation.transactionId,
        bookingId: checkout.booking.id,
      });
      window.sessionStorage.removeItem("bookingDraft");
      window.location.href = `/booking-confirmation?bookingId=${encodeURIComponent(checkout.booking.id)}`;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("Please sign in before completing payment.");
        } else {
          setError(err.code);
        }
      } else {
        setError("Payment failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!draft) {
    return (
      <main className="min-h-screen bg-[#eef2f7] py-8 text-slate-900">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No booking draft found. Please go back and complete Enter Information first.
          </p>
          <a href="/" className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700">Back to home</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef2f7] py-8 text-slate-900">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <a href="/booking" className="text-sm font-semibold text-blue-600 hover:text-blue-700">Back</a>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr,340px]">
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/70 sm:p-8">
            <p className="text-xs font-semibold tracking-wide text-blue-600">PAYMENT</p>
            <h1 className="mt-2 text-4xl font-black text-[#071c45]">Choose payment method</h1>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 ${method === "card" ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}>
                <input type="radio" checked={method === "card"} onChange={() => setMethod("card")} />
                Credit/Debit Card
              </label>
              <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 ${method === "promptpay" ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}>
                <input type="radio" checked={method === "promptpay"} onChange={() => setMethod("promptpay")} />
                PromptPay
              </label>
              <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 ${method === "paypal" ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}>
                <input type="radio" checked={method === "paypal"} onChange={() => setMethod("paypal")} />
                PayPal
              </label>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p>Gateway: <span className="font-semibold">Connected (mock integration)</span></p>
              <p className="mt-1">
                Hold expires in:{" "}
                <span className={`font-semibold ${holdRemainingSec > 0 ? "text-slate-800" : "text-rose-700"}`}>
                  {holdRemainingSec > 0 ? `${Math.floor(holdRemainingSec / 60)}:${String(holdRemainingSec % 60).padStart(2, "0")}` : "Expired"}
                </span>
              </p>
              {method === "card" && <p className="mt-1">Card payment via secure tokenized flow.</p>}
              {method === "promptpay" && <p className="mt-1">PromptPay flow will show QR in production gateway.</p>}
              {method === "paypal" && <p className="mt-1">PayPal redirection flow in production gateway.</p>}
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <p className="font-semibold text-slate-900">Booking detail</p>
              <p className="mt-1 text-slate-600">{draft.carName}</p>
              <p className="text-slate-600">{draft.location || "Location not selected"}</p>
              <p className="text-slate-600">{format(new Date(draft.pickupAt), "dd MMM yyyy HH:mm")} - {format(new Date(draft.returnAt), "dd MMM yyyy HH:mm")}</p>
            </div>

            {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

            {success ? (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <p className="font-semibold">Payment success</p>
                <p className="mt-1">Transaction: {success.transactionId}</p>
                <p>Booking ID: {success.bookingId}</p>
                <p>Status: confirmed</p>
                <a href="/" className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                  Back to home
                </a>
              </div>
            ) : (
              <button
                type="button"
                disabled={!canPay || loading || holdRemainingSec <= 0}
                onClick={() => void handlePay()}
                className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {loading ? "Processing payment..." : holdRemainingSec <= 0 ? "Hold expired" : "Pay now"}
              </button>
            )}
          </section>

          <aside className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/70">
            <h2 className="text-xl font-black text-[#071c45]">Payment Summary</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-slate-500">Car rental</span><span>{draft.pricing.rentalFee.toLocaleString()} Baht</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Service fee</span><span>{draft.pricing.serviceFee.toLocaleString()} Baht</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Insurance</span><span>{draft.pricing.insuranceFee.toLocaleString()} Baht</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">GPS</span><span>{draft.pricing.gpsFee.toLocaleString()} Baht</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Child seat</span><span>{draft.pricing.childSeatFee.toLocaleString()} Baht</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Member discount</span><span className="text-emerald-600">-{(draft.pricing.memberDiscount ?? 0).toLocaleString()} Baht</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Tax</span><span>{draft.pricing.tax.toLocaleString()} Baht</span></div>
            </div>
            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-slate-900">Total</span>
                <span className="text-2xl font-black text-[#071c45]">{draft.pricing.total.toLocaleString()} Baht</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
