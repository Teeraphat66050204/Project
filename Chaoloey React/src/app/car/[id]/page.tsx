import { findCatalogByName, getCarFallbackImage } from "@/data/cars";
import { getCarById, listAvailableCars } from "@/models/car.model";
import { BookingSummary } from "@/components/BookingSummary";
import { FallbackImage } from "@/components/ui/FallbackImage";

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
        <p className="status-banner">ไม่พบรถ</p>
      </main>
    );
  }

  const car = findCatalogByName(row.name);
  if (!car) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="status-banner">ไม่พบข้อมูลรถ</p>
      </main>
    );
  }

  const pickup = q.pickup || "";
  const dropoff = q.dropoff || "";
  const location = q.location || "";

  const pickupDate = pickup ? new Date(pickup) : null;
  const dropoffDate = dropoff ? new Date(dropoff) : null;

  const hasValidRange = Boolean(
    pickupDate &&
      dropoffDate &&
      !Number.isNaN(pickupDate.getTime()) &&
      !Number.isNaN(dropoffDate.getTime()) &&
      dropoffDate > pickupDate,
  );

  let availableForSelection = false;
  if (hasValidRange && pickupDate && dropoffDate) {
    const availableCars = await listAvailableCars(pickupDate, dropoffDate);
    availableForSelection = availableCars.some((item) => item.id === row.id);
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <a href="/search" className="text-sm text-[rgba(249,250,251,0.70)] hover:text-[#F9FAFB]">
        ← กลับไปผลการค้นหา
      </a>

      <section className="mt-4 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <section className="card-premium p-6">
          <FallbackImage
            src={car.image}
            fallbackSrc={getCarFallbackImage(car.id)}
            alt={car.name}
            className="h-[340px] w-full rounded-2xl border border-white/10 object-cover"
          />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="h-20 rounded-2xl border border-white/10 bg-gradient-to-br from-[#F59E0B]/20 to-transparent" />
            <div className="h-20 rounded-2xl border border-white/10 bg-gradient-to-br from-[#F59E0B]/20 to-transparent" />
            <div className="h-20 rounded-2xl border border-white/10 bg-gradient-to-br from-[#F59E0B]/20 to-transparent" />
          </div>
        </section>

        <section className="card-premium p-6">
          <p className="text-xs uppercase tracking-wide text-[rgba(249,250,251,0.70)]">{car.brand} - {car.type}</p>
          <h1 className="mt-2 text-3xl font-black">{car.name}</h1>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-[rgba(249,250,251,0.82)]">
            <span className="badge">{car.seats} ที่นั่ง</span>
            <span className="badge">{car.gear}</span>
            <span className="badge">{car.fuel}</span>
            <span className="badge border-[#F59E0B]/60 text-[#F59E0B]">★ {car.rating.toFixed(1)}</span>
          </div>

          <div className="mt-6">
            <BookingSummary
              carId={row.id}
              pricePerDay={car.pricePerDay}
              location={location}
              initialPickup={pickup}
              initialDropoff={dropoff}
              availableForSelection={hasValidRange ? availableForSelection : false}
            />
          </div>
        </section>
      </section>
    </main>
  );
}
