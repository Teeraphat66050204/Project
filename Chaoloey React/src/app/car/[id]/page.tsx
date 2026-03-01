import { findCatalogByName } from "@/data/cars";
import { getCarById, listAvailableCars } from "@/models/car.model";

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
  const p = await params;
  const q = await searchParams;

  const row = await getCarById(p.id);
  if (!row) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="status-banner">Car not found.</p>
      </main>
    );
  }

  const car = findCatalogByName(row.name);
  if (!car) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="status-banner">Car metadata not found.</p>
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
        ← Back to results
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
          <p className="text-xs uppercase tracking-wide text-[rgba(249,250,251,0.70)]">{car.brand} · {car.type}</p>
          <h1 className="mt-2 text-3xl font-black">{car.name}</h1>
          <p className="mt-3 text-sm text-[rgba(249,250,251,0.70)]">
            <span className="text-3xl font-black text-[#F59E0B]">{car.pricePerDay.toLocaleString()}</span> THB / day
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-[rgba(249,250,251,0.82)]">
            <span className="badge">{car.seats} seats</span>
            <span className="badge">{car.gear}</span>
            <span className="badge">{car.fuel}</span>
            <span className="badge border-[#F59E0B]/60 text-[#F59E0B]">★ {car.rating.toFixed(1)}</span>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-[#111827] p-4">
            <h2 className="font-semibold">Selected schedule</h2>
            <p className="mt-2 text-sm text-[rgba(249,250,251,0.75)]">
              {pickupDate && dropoffDate ? `${pickupDate.toLocaleString()} to ${dropoffDate.toLocaleString()}` : "Pickup and drop-off date/time are missing."}
            </p>
            <p className="mt-2 text-sm text-[rgba(249,250,251,0.75)]">Location: {location || "-"}</p>
          </div>

          <div className="mt-4">
            {available ? (
              <span className="badge border-emerald-400/50 text-emerald-400">Available for selected dates</span>
            ) : (
              <span className="badge border-red-400/60 text-red-400">Unavailable for selected dates</span>
            )}
          </div>

          <div className="mt-6">
            {available ? (
              <a href={`/booking?${bookingParams.toString()}`} className="btn-base btn-primary px-6 py-3">Continue booking</a>
            ) : (
              <a href="/search" className="btn-base btn-outline px-6 py-3">Back to search</a>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
