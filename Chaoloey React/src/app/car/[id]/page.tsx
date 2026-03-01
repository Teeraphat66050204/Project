import { cookies } from "next/headers";
import { findCatalogByName } from "@/data/cars";
import { getCarById, listAvailableCars } from "@/models/car.model";
import { LANGUAGE_COOKIE, normalizeLanguage } from "@/lib/i18n";

type SearchParams = {
  pickup?: string;
  dropoff?: string;
  location?: string;
};

export const dynamic = "force-dynamic";

export default async function CarDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const cookieStore = await cookies();
  const lang = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value);
  const locale = lang === "th" ? "th-TH" : "en-US";
  const t = lang === "th"
    ? {
        back: "\u2190 \u0e01\u0e25\u0e31\u0e1a\u0e44\u0e1b\u0e1c\u0e25\u0e01\u0e32\u0e23\u0e04\u0e49\u0e19\u0e2b\u0e32",
        notFound: "\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e23\u0e16",
        noMeta: "\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e23\u0e16",
        perDay: "/ \u0e27\u0e31\u0e19",
        seats: "\u0e17\u0e35\u0e48\u0e19\u0e31\u0e48\u0e07",
        selectedSchedule: "\u0e0a\u0e48\u0e27\u0e07\u0e40\u0e27\u0e25\u0e32\u0e17\u0e35\u0e48\u0e40\u0e25\u0e37\u0e2d\u0e01",
        missingSchedule: "\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49\u0e23\u0e30\u0e1a\u0e38\u0e27\u0e31\u0e19\u0e40\u0e27\u0e25\u0e32\u0e23\u0e31\u0e1a\u0e41\u0e25\u0e30\u0e04\u0e37\u0e19\u0e23\u0e16",
        location: "\u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48",
        available: "\u0e27\u0e48\u0e32\u0e07\u0e15\u0e32\u0e21\u0e0a\u0e48\u0e27\u0e07\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e40\u0e25\u0e37\u0e2d\u0e01",
        unavailable: "\u0e44\u0e21\u0e48\u0e27\u0e48\u0e32\u0e07\u0e15\u0e32\u0e21\u0e0a\u0e48\u0e27\u0e07\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e40\u0e25\u0e37\u0e2d\u0e01",
        continueBooking: "\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23\u0e08\u0e2d\u0e07\u0e15\u0e48\u0e2d",
        backToSearch: "\u0e01\u0e25\u0e31\u0e1a\u0e44\u0e1b\u0e04\u0e49\u0e19\u0e2b\u0e32",
        to: "\u0e16\u0e36\u0e07",
      }
    : {
        back: "\u2190 Back to results",
        notFound: "Car not found.",
        noMeta: "Car metadata not found.",
        perDay: "/ day",
        seats: "seats",
        selectedSchedule: "Selected schedule",
        missingSchedule: "Pickup and drop-off date/time are missing.",
        location: "Location",
        available: "Available for selected dates",
        unavailable: "Unavailable for selected dates",
        continueBooking: "Continue booking",
        backToSearch: "Back to search",
        to: "to",
      };

  const p = await params;
  const q = await searchParams;

  const row = await getCarById(p.id);
  if (!row) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="status-banner">{t.notFound}</p>
      </main>
    );
  }

  const car = findCatalogByName(row.name);
  if (!car) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="status-banner">{t.noMeta}</p>
      </main>
    );
  }

  const pickup = q.pickup || "";
  const dropoff = q.dropoff || "";
  const location = q.location || "";

  const pickupDate = pickup ? new Date(pickup) : null;
  const dropoffDate = dropoff ? new Date(dropoff) : null;
  let available = false;

  if (pickupDate && dropoffDate && !Number.isNaN(pickupDate.getTime()) && !Number.isNaN(dropoffDate.getTime()) && dropoffDate > pickupDate) {
    const availableCars = await listAvailableCars(pickupDate, dropoffDate);
    available = availableCars.some((item) => item.id === row.id);
  }

  const bookingParams = new URLSearchParams({
    carId: row.id,
    pickup,
    dropoff,
    location,
  });

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <a href="/search" className="text-sm text-[rgba(249,250,251,0.70)] hover:text-[#F9FAFB]">
        {t.back}
      </a>

      <section className="mt-4 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <section className="card-premium p-5">
          <img src={car.image} alt={car.name} className="h-[340px] w-full rounded-2xl border border-white/10 object-cover" />
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="h-20 rounded-2xl border border-white/10 bg-gradient-to-br from-[#F59E0B]/20 to-transparent" />
            <div className="h-20 rounded-2xl border border-white/10 bg-gradient-to-br from-[#F59E0B]/20 to-transparent" />
            <div className="h-20 rounded-2xl border border-white/10 bg-gradient-to-br from-[#F59E0B]/20 to-transparent" />
          </div>
        </section>

        <section className="card-premium p-6">
          <p className="text-xs uppercase tracking-wide text-[rgba(249,250,251,0.70)]">{car.brand} - {car.type}</p>
          <h1 className="mt-2 text-3xl font-black">{car.name}</h1>
          <p className="mt-3 text-sm text-[rgba(249,250,251,0.70)]">
            <span className="text-3xl font-black text-[#F59E0B]">{car.pricePerDay.toLocaleString(locale)}</span> THB {t.perDay}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-[rgba(249,250,251,0.82)]">
            <span className="badge">{car.seats} {t.seats}</span>
            <span className="badge">{car.gear}</span>
            <span className="badge">{car.fuel}</span>
            <span className="badge border-[#F59E0B]/60 text-[#F59E0B]">★ {car.rating.toFixed(1)}</span>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-[#111827] p-4">
            <h2 className="font-semibold">{t.selectedSchedule}</h2>
            <p className="mt-2 text-sm text-[rgba(249,250,251,0.75)]">
              {pickupDate && dropoffDate ? `${pickupDate.toLocaleString(locale)} ${t.to} ${dropoffDate.toLocaleString(locale)}` : t.missingSchedule}
            </p>
            <p className="mt-2 text-sm text-[rgba(249,250,251,0.75)]">{t.location}: {location || "-"}</p>
          </div>

          <div className="mt-4">
            {available ? (
              <span className="badge border-emerald-400/50 text-emerald-400">{t.available}</span>
            ) : (
              <span className="badge border-red-400/60 text-red-400">{t.unavailable}</span>
            )}
          </div>

          <div className="mt-6">
            {available ? (
              <a href={`/booking?${bookingParams.toString()}`} className="btn-base btn-primary px-6 py-3">{t.continueBooking}</a>
            ) : (
              <a href="/search" className="btn-base btn-outline px-6 py-3">{t.backToSearch}</a>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

