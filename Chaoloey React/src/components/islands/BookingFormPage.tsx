import { differenceInMinutes, format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { ApiError, createBookingHold, getCarById, getMe, type Car, type SessionUser } from "../../lib/api";
import { PRICE_RULES, calculateBookingPricing } from "../../lib/pricing";
import { useLanguage } from "@/components/providers/LanguageProvider";

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
  const { lang } = useLanguage();
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
  const t = lang === "th"
    ? {
        back: "กลับ",
        bookingForm: "แบบฟอร์มการจอง",
        title: "กรอกข้อมูลการจอง",
        memberDiscountActive: "เข้าสู่ระบบแล้วที่ {email} ส่วนลดสมาชิก 5% ถูกใช้งานแล้ว",
        signInHint: "เข้าสู่ระบบก่อนชำระเงินเพื่อรับส่วนลดสมาชิก 5%",
        loadingCar: "กำลังโหลดรถที่เลือก...",
        fullName: "ชื่อ-นามสกุล",
        phone: "เบอร์โทร",
        email: "อีเมล",
        licenseNo: "เลขใบขับขี่",
        addons: "บริการเสริม",
        extraInsurance: "ประกันเพิ่มเติม",
        gps: "GPS",
        childSeat: "ที่นั่งเด็ก",
        priceList: "รายการราคา",
        baseRate: "ราคาพื้นฐาน / วัน",
        seatSurcharge: "ค่าที่นั่งเพิ่ม / ที่นั่ง / วัน",
        serviceFee: "ค่าบริการ",
        insurancePerDay: "ประกันเพิ่ม / วัน",
        gpsPerDay: "GPS / วัน",
        childSeatPerDay: "ที่นั่งเด็ก / วัน",
        memberDiscount: "ส่วนลดสมาชิก",
        tax: "ภาษี",
        currentBaseRate: "อัตรารายวันปัจจุบัน: {rate} บาท (อ้างอิงจากจำนวนที่นั่งรถที่เลือก)",
        summary: "สรุปการจอง",
        locationNotSelected: "ยังไม่เลือกสถานที่",
        dateNotSelected: "ยังไม่เลือกวันเวลา",
        daySuffix: "วัน",
        needLocation: "กรุณาเลือกสถานที่รับรถ",
        needDateRange: "กรุณาเลือกวันเวลารับ-คืนรถที่ถูกต้อง",
        needContact: "กรุณากรอกชื่อ เบอร์โทร อีเมล และเลขใบขับขี่ให้ถูกต้อง",
        carRental: "ค่าเช่ารถ",
        insurance: "ประกัน",
        total: "รวมทั้งหมด",
        proceed: "ไปหน้าชำระเงิน",
        preparing: "กำลังเตรียมข้อมูลชำระเงิน...",
        notNow: "ไว้ก่อน",
        signUpIn: "สมัคร / เข้าสู่ระบบ",
        memberBenefit: "สิทธิพิเศษสมาชิก",
        memberSaveTitle: "สมัครแล้วลดทันที 5%",
        memberSaveDesc: "สมัครด้วย Google แล้วจองต่อได้ทันทีพร้อมรับส่วนลด 5%",
      }
    : {
        back: "Back",
        bookingForm: "BOOKING FORM",
        title: "Enter Information",
        memberDiscountActive: "Signed in as {email}. Member discount 5% is active.",
        signInHint: "Sign in before checkout to unlock member discount 5%.",
        loadingCar: "Loading selected car...",
        fullName: "Full name",
        phone: "Phone",
        email: "Email",
        licenseNo: "Driver license no.",
        addons: "Add-ons",
        extraInsurance: "Extra insurance",
        gps: "GPS",
        childSeat: "Child seat",
        priceList: "Price List",
        baseRate: "Base rate / day",
        seatSurcharge: "Seat surcharge / seat / day",
        serviceFee: "Service fee",
        insurancePerDay: "Extra insurance / day",
        gpsPerDay: "GPS / day",
        childSeatPerDay: "Child seat / day",
        memberDiscount: "Member discount",
        tax: "Tax",
        currentBaseRate: "Current base daily rate: {rate} Baht (based on selected car seats).",
        summary: "Booking Summary",
        locationNotSelected: "Location not selected",
        dateNotSelected: "Date not selected",
        daySuffix: "day(s)",
        needLocation: "Please select pickup location.",
        needDateRange: "Please select valid pickup and drop-off date/time.",
        needContact: "Please complete valid name, phone, email, and license number.",
        carRental: "Car rental",
        insurance: "Insurance",
        total: "Total",
        proceed: "Proceed to Payment",
        preparing: "Preparing payment...",
        notNow: "Not now",
        signUpIn: "Sign up / Sign in",
        memberBenefit: "MEMBER BENEFIT",
        memberSaveTitle: "Sign up and save 5%",
        memberSaveDesc: "Create your account with Google and continue booking instantly with a 5% discount.",
      };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLoginNextPath(`${window.location.pathname}${window.location.search}`);
    setQuery({
      carId: params.get("carId") ?? "",
      location: params.get("location") ?? "",
      pickupAt: params.get("pickupAt") ?? params.get("pickup") ?? "",
      returnAt: params.get("returnAt") ?? params.get("dropoff") ?? "",
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

  const handleProceedToPayment = async () => {
    if (!car) return;
    if (!hasLocation) {
      setError(t.needLocation);
      return;
    }
    if (!hasValidDateRange) {
      setError(t.needDateRange);
      return;
    }
    if (!hasValidContact) {
      setError(t.needContact);
      return;
    }
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
          {t.back}
        </a>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr,360px]">
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/70 sm:p-8">
            <p className="text-xs font-semibold tracking-wide text-blue-600">{t.bookingForm}</p>
            <h1 className="mt-2 text-4xl font-black text-[#071c45]">{t.title}</h1>
            {!checkingAuth && !viewer && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {t.signInHint}
              </p>
            )}
            {!checkingAuth && viewer && (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {t.memberDiscountActive.replace("{email}", viewer.email)}
              </p>
            )}

            {loadingCar && <p className="mt-4 text-sm text-slate-500">{t.loadingCar}</p>}
            {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                {t.fullName}
                <input value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" placeholder="Name Surname" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                {t.phone}
                <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" placeholder="08x-xxx-xxxx" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                {t.email}
                <input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" placeholder="you@email.com" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                {t.licenseNo}
                <input value={form.licenseNo} onChange={(e) => setForm((prev) => ({ ...prev, licenseNo: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" placeholder="License number" />
              </label>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-bold text-[#071c45]">{t.addons}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                  <input type="checkbox" checked={addons.extraInsurance} onChange={(e) => setAddons((prev) => ({ ...prev, extraInsurance: e.target.checked }))} />
                  {t.extraInsurance}
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                  <input type="checkbox" checked={addons.gps} onChange={(e) => setAddons((prev) => ({ ...prev, gps: e.target.checked }))} />
                  {t.gps}
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                  <input type="checkbox" checked={addons.childSeat} onChange={(e) => setAddons((prev) => ({ ...prev, childSeat: e.target.checked }))} />
                  {t.childSeat}
                </label>
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-lg font-bold text-[#071c45]">{t.priceList}</h2>
              <div className="mt-3 grid gap-2 text-sm text-slate-700">
                <p className="flex items-center justify-between">
                  <span>{t.baseRate}</span>
                  <span>{PRICE_RULES.baseRatePerDay.toLocaleString()} Baht</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>{t.seatSurcharge}</span>
                  <span>{PRICE_RULES.seatRatePerDay.toLocaleString()} Baht</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>{t.serviceFee}</span>
                  <span>{Math.round(PRICE_RULES.serviceFeeRate * 100)}%</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>{t.insurancePerDay}</span>
                  <span>{PRICE_RULES.extraInsurancePerDay.toLocaleString()} Baht</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>{t.gpsPerDay}</span>
                  <span>{PRICE_RULES.gpsPerDay.toLocaleString()} Baht</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>{t.childSeatPerDay}</span>
                  <span>{PRICE_RULES.childSeatPerDay.toLocaleString()} Baht</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>{t.memberDiscount}</span>
                  <span>{Math.round(PRICE_RULES.memberDiscountRate * 100)}%</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>{t.tax}</span>
                  <span>{Math.round(PRICE_RULES.taxRate * 100)}%</span>
                </p>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {t.currentBaseRate.replace("{rate}", baseRatePerDay.toLocaleString())}
              </p>
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/70">
            <h2 className="text-xl font-black text-[#071c45]">{t.summary}</h2>
            <p className="mt-2 text-sm text-slate-500">{car?.name ?? "Selected car"}</p>
            <p className="text-sm text-slate-500">{query.location || t.locationNotSelected}</p>
            <p className="mt-2 text-sm text-slate-500">
              {query.pickupAt && query.returnAt
                ? `${format(new Date(query.pickupAt), "dd MMM yyyy HH:mm")} - ${format(new Date(query.returnAt), "dd MMM yyyy HH:mm")}`
                : t.dateNotSelected}
            </p>
            <p className="text-sm font-semibold text-slate-700">{rentalDays} {t.daySuffix}</p>
            {!hasLocation && <p className="mt-2 text-xs font-medium text-rose-700">{t.needLocation}</p>}
            {!hasValidDateRange && <p className="mt-2 text-xs font-medium text-rose-700">{t.needDateRange}</p>}
            {!hasValidContact && <p className="mt-2 text-xs font-medium text-rose-700">{t.needContact}</p>}

            <div className="mt-5 space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-slate-500">{t.carRental}</span><span>{rentalFee.toLocaleString()} Baht</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">{t.serviceFee}</span><span>{serviceFee.toLocaleString()} Baht</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">{t.insurance}</span><span>{insuranceFee.toLocaleString()} Baht</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">GPS</span><span>{gpsFee.toLocaleString()} Baht</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">{t.childSeat}</span><span>{childSeatFee.toLocaleString()} Baht</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">{t.memberDiscount}</span><span className="text-emerald-600">-{memberDiscount.toLocaleString()} Baht</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">{t.tax} (7%)</span><span>{tax.toLocaleString()} Baht</span></div>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-slate-900">{t.total}</span>
                <span className="text-2xl font-black text-[#071c45]">{total.toLocaleString()} Baht</span>
              </div>
            </div>

            <button
              type="button"
              disabled={submitting}
              className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              onClick={() => void handleProceedToPayment()}
            >
              {submitting ? t.preparing : t.proceed}
            </button>
          </aside>
        </div>
      </div>
      {showAuthPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold tracking-wide text-blue-600">{t.memberBenefit}</p>
            <h2 className="mt-2 text-2xl font-black text-[#071c45]">{t.memberSaveTitle}</h2>
            <p className="mt-3 text-sm text-slate-600">
              {t.memberSaveDesc}
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setShowAuthPromo(false)}
              >
                {t.notNow}
              </button>
              <a
                href={`/signup?next=${encodeURIComponent(loginNextPath)}`}
                className="rounded-xl bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
              >
                {t.signUpIn}
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
