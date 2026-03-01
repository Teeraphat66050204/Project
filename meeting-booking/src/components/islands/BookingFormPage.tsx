import { differenceInMinutes, format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { ApiError, createBookingHold, getCarById, getMe, type Car, type SessionUser } from "../../lib/api";
import { PRICE_RULES, calculateBookingPricing } from "../../lib/pricing";

type BookingQuery = {
  carId: string;
  location: string;
  pickupAt: string;
  returnAt: string;
};

type FormState = {
  fullName: string;
  phone: string;
  email: string;
  licenseNo: string;
};

type AddonsState = {
  extraInsurance: boolean;
  gps: boolean;
  childSeat: boolean;
};

const DEMO_CARS: Car[] = [
  { id: "demo-honda-civic", name: "Honda Civic", seats: 5 },
  { id: "demo-toyota-yaris", name: "Toyota Yaris", seats: 5 },
  { id: "demo-mazda-cx5", name: "Mazda CX-5", seats: 5 },
  { id: "demo-mitsubishi-pajero", name: "Mitsubishi Pajero Sport", seats: 7 },
  { id: "demo-nissan-almera", name: "Nissan Almera", seats: 5 },
  { id: "demo-audi-a4", name: "Audi A4", seats: 5 },
];

function emptyQuery(): BookingQuery {
  return {
    carId: "",
    location: "",
    pickupAt: "",
    returnAt: "",
  };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

function isValidLicense(value: string): boolean {
  return value.trim().length >= 5;
}

export function BookingFormPage() {
  const [query, setQuery] = useState<BookingQuery>(emptyQuery());
  const [car, setCar] = useState<Car | null>(null);
  const [loadingCar, setLoadingCar] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>({
    fullName: "",
    phone: "",
    email: "",
    licenseNo: "",
  });
  const [addons, setAddons] = useState<AddonsState>({
    extraInsurance: false,
    gps: false,
    childSeat: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [viewer, setViewer] = useState<SessionUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showAuthPromo, setShowAuthPromo] = useState(false);
  const [loginNextPath, setLoginNextPath] = useState("/booking");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLoginNextPath(`${window.location.pathname}${window.location.search}`);
    setQuery({
      carId: params.get("carId") ?? "",
      location: params.get("location") ?? "",
      pickupAt: params.get("pickupAt") ?? "",
      returnAt: params.get("returnAt") ?? "",
    });
  }, []);

  useEffect(() => {
    if (!query.carId) {
      setLoadingCar(false);
      return;
    }
    let active = true;
    setLoadingCar(true);
    setError("");

    void (async () => {
      try {
        const demoCar = DEMO_CARS.find((item) => item.id === query.carId);
        const data = demoCar ?? (await getCarById(query.carId));
        if (!active) return;
        setCar(data);
      } catch (err) {
        if (!active) return;
        const message = err instanceof ApiError ? err.code : "Failed to load car";
        setError(message);
      } finally {
        if (active) setLoadingCar(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [query.carId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const me = await getMe();
        if (!active) return;
        setViewer(me);
        setForm((prev) => ({
          ...prev,
          fullName: prev.fullName || me.name,
          email: prev.email || me.email,
        }));
      } catch {
        if (!active) return;
        setViewer(null);
      } finally {
        if (active) setCheckingAuth(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const rentalDays = useMemo(() => {
    if (!query.pickupAt || !query.returnAt) return 1;
    const start = new Date(query.pickupAt);
    const end = new Date(query.returnAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 1;
    const minutes = differenceInMinutes(end, start);
    return Math.max(1, Math.ceil(minutes / (24 * 60)));
  }, [query.pickupAt, query.returnAt]);

  const pricing = useMemo(
    () =>
      calculateBookingPricing({
        seats: car?.seats ?? 2,
        rentalDays,
        addons,
        isMember: Boolean(viewer),
      }),
    [addons, car?.seats, rentalDays, viewer],
  );
  const {
    baseRatePerDay,
    rentalFee,
    serviceFee,
    insuranceFee,
    gpsFee,
    childSeatFee,
    memberDiscount,
    tax,
    total,
  } = pricing;

  const parsedPickup = useMemo(() => new Date(query.pickupAt), [query.pickupAt]);
  const parsedDropoff = useMemo(() => new Date(query.returnAt), [query.returnAt]);
  const hasValidDateRange = useMemo(
    () =>
      Boolean(
      query.pickupAt &&
      query.returnAt &&
      !Number.isNaN(parsedPickup.getTime()) &&
      !Number.isNaN(parsedDropoff.getTime()) &&
      parsedDropoff > parsedPickup),
    [parsedDropoff, parsedPickup, query.pickupAt, query.returnAt],
  );
  const hasValidContact = useMemo(
    () =>
      form.fullName.trim().length >= 2 &&
      isValidPhone(form.phone) &&
      isValidEmail(form.email) &&
      isValidLicense(form.licenseNo),
    [form.email, form.fullName, form.licenseNo, form.phone],
  );
  const hasLocation = Boolean(query.location.trim());

  const canProceed = Boolean(
    hasValidContact &&
      car &&
      query.carId &&
      hasValidDateRange &&
      hasLocation,
  );
  const handleProceedToPayment = async () => {
    if (!canProceed || !car) return;
    setSubmitting(true);
    setError("");

    try {
      const hold = await createBookingHold({
        carId: query.carId,
        startTime: parsedPickup.toISOString(),
        endTime: parsedDropoff.toISOString(),
        location: query.location.trim(),
        customerEmail: form.email,
      });

      const draft = {
        holdId: hold.id,
        holdExpiresAt: hold.expiresAt,
        carId: query.carId,
        carName: car.name,
        location: query.location,
        pickupAt: query.pickupAt,
        returnAt: query.returnAt,
        form,
        addons,
        pricing: {
          rentalFee,
          serviceFee,
          insuranceFee,
          gpsFee,
          childSeatFee,
          memberDiscount,
          tax,
          total,
        },
      };

      window.sessionStorage.setItem("bookingDraft", JSON.stringify(draft));
      window.location.href = "/payment";
    } catch (err) {
      if (err instanceof ApiError && err.code === "UNAUTHORIZED") {
        setShowAuthPromo(true);
      } else {
        setError(err instanceof ApiError ? err.code : "Failed to create booking hold");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#eef2f7] py-8 text-slate-900">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <a href={query.carId ? `/cars/${query.carId}` : "/"} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          Back
        </a>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr,360px]">
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/70 sm:p-8">
            <p className="text-xs font-semibold tracking-wide text-blue-600">BOOKING FORM</p>
            <h1 className="mt-2 text-4xl font-black text-[#071c45]">Enter Information</h1>
            {!checkingAuth && !viewer && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Sign in before checkout to unlock member discount 5%.
              </p>
            )}
            {!checkingAuth && viewer && (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Signed in as {viewer.email}. Member discount 5% is active.
              </p>
            )}

            {loadingCar && <p className="mt-4 text-sm text-slate-500">Loading selected car...</p>}
            {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Full name
                <input value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" placeholder="Name Surname" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Phone
                <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" placeholder="08x-xxx-xxxx" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Email
                <input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" placeholder="you@email.com" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Driver license no.
                <input value={form.licenseNo} onChange={(e) => setForm((prev) => ({ ...prev, licenseNo: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" placeholder="License number" />
              </label>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-bold text-[#071c45]">Add-ons</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                  <input type="checkbox" checked={addons.extraInsurance} onChange={(e) => setAddons((prev) => ({ ...prev, extraInsurance: e.target.checked }))} />
                  Extra insurance
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                  <input type="checkbox" checked={addons.gps} onChange={(e) => setAddons((prev) => ({ ...prev, gps: e.target.checked }))} />
                  GPS
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                  <input type="checkbox" checked={addons.childSeat} onChange={(e) => setAddons((prev) => ({ ...prev, childSeat: e.target.checked }))} />
                  Child seat
                </label>
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-lg font-bold text-[#071c45]">Price List</h2>
              <div className="mt-3 grid gap-2 text-sm text-slate-700">
                <p className="flex items-center justify-between">
                  <span>Base rate / day</span>
                  <span>{PRICE_RULES.baseRatePerDay.toLocaleString()} Baht</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Seat surcharge / seat / day</span>
                  <span>{PRICE_RULES.seatRatePerDay.toLocaleString()} Baht</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Service fee</span>
                  <span>{Math.round(PRICE_RULES.serviceFeeRate * 100)}%</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Extra insurance / day</span>
                  <span>{PRICE_RULES.extraInsurancePerDay.toLocaleString()} Baht</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>GPS / day</span>
                  <span>{PRICE_RULES.gpsPerDay.toLocaleString()} Baht</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Child seat / day</span>
                  <span>{PRICE_RULES.childSeatPerDay.toLocaleString()} Baht</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Member discount</span>
                  <span>{Math.round(PRICE_RULES.memberDiscountRate * 100)}%</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Tax</span>
                  <span>{Math.round(PRICE_RULES.taxRate * 100)}%</span>
                </p>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Current base daily rate: {baseRatePerDay.toLocaleString()} Baht (based on selected car seats).
              </p>
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/70">
            <h2 className="text-xl font-black text-[#071c45]">Booking Summary</h2>
            <p className="mt-2 text-sm text-slate-500">{car?.name ?? "Selected car"}</p>
            <p className="text-sm text-slate-500">{query.location || "Location not selected"}</p>
            <p className="mt-2 text-sm text-slate-500">
              {query.pickupAt && query.returnAt
                ? `${format(new Date(query.pickupAt), "dd MMM yyyy HH:mm")} - ${format(new Date(query.returnAt), "dd MMM yyyy HH:mm")}`
                : "Date not selected"}
            </p>
            <p className="text-sm font-semibold text-slate-700">{rentalDays} day(s)</p>
            {!hasLocation && <p className="mt-2 text-xs font-medium text-rose-700">Please select pickup location.</p>}
            {!hasValidDateRange && <p className="mt-2 text-xs font-medium text-rose-700">Please select valid pickup and drop-off date/time.</p>}
            {!hasValidContact && <p className="mt-2 text-xs font-medium text-rose-700">Please complete valid name, phone, email, and license number.</p>}

            <div className="mt-5 space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-slate-500">Car rental</span><span>{rentalFee.toLocaleString()} Baht</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Service fee</span><span>{serviceFee.toLocaleString()} Baht</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Insurance</span><span>{insuranceFee.toLocaleString()} Baht</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">GPS</span><span>{gpsFee.toLocaleString()} Baht</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Child seat</span><span>{childSeatFee.toLocaleString()} Baht</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Member discount</span><span className="text-emerald-600">-{memberDiscount.toLocaleString()} Baht</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Tax (7%)</span><span>{tax.toLocaleString()} Baht</span></div>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-slate-900">Total</span>
                <span className="text-2xl font-black text-[#071c45]">{total.toLocaleString()} Baht</span>
              </div>
            </div>

            <button
              type="button"
              disabled={!canProceed || submitting}
              className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              onClick={() => void handleProceedToPayment()}
            >
              {submitting ? "Preparing payment..." : "Proceed to Payment"}
            </button>
          </aside>
        </div>
      </div>
      {showAuthPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold tracking-wide text-blue-600">MEMBER BENEFIT</p>
            <h2 className="mt-2 text-2xl font-black text-[#071c45]">Sign up and save 5%</h2>
            <p className="mt-3 text-sm text-slate-600">
              Create your account with Google and continue booking instantly with a 5% discount.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setShowAuthPromo(false)}
              >
                Not now
              </button>
              <a
                href={`/signup?next=${encodeURIComponent(loginNextPath)}`}
                className="rounded-xl bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
              >
                Sign up / Sign in
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
