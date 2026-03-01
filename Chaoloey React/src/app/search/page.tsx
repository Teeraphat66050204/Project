import { findCatalogByName } from "@/data/cars";
import { listAvailableCars } from "@/models/car.model";
import SearchPersistor from "@/components/search/SearchPersistor";

type SearchParams = {
  location?: string;
  pickup?: string;
  dropoff?: string;
  type?: string;
  brand?: string;
  price?: string;
  sort?: string;
};

const locationOptions = ["Bangkok", "Chiang Mai", "Phuket", "Pattaya"];

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const location = (params.location || "").trim();
  const pickup = params.pickup || "";
  const dropoff = params.dropoff || "";
  const type = params.type || "all";
  const brand = params.brand || "all";
  const price = params.price || "all";
  const sort = params.sort || "recommended";

  const pickupDate = pickup ? new Date(pickup) : null;
  const dropoffDate = dropoff ? new Date(dropoff) : null;

  let baseRows: Awaited<ReturnType<typeof listAvailableCars>> = [];
  const errors: string[] = [];
  if (!location) errors.push("Location is required.");
  if (!pickupDate || !dropoffDate) errors.push("Pick-up and drop-off date/time are required.");
  if (pickupDate && pickupDate < new Date()) errors.push("Pick-up cannot be in the past.");
  if (pickupDate && dropoffDate && dropoffDate <= pickupDate) errors.push("Drop-off must be later than pick-up.");

  if (!errors.length && pickupDate && dropoffDate) {
    baseRows = await listAvailableCars(pickupDate, dropoffDate);
  }

  const enriched = baseRows
    .map((row) => {
      const meta = findCatalogByName(row.name);
      if (!meta) return null;
      return {
        roomId: row.id,
        ...meta,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const brands = Array.from(new Set(enriched.map((car) => car.brand))).sort((a, b) => a.localeCompare(b));

  let filtered = enriched
    .filter((car) => (type === "all" ? true : car.type.toLowerCase() === type.toLowerCase()))
    .filter((car) => (brand === "all" ? true : car.brand === brand))
    .filter((car) => {
      if (price === "under-2500") return car.pricePerDay < 2500;
      if (price === "2500-3500") return car.pricePerDay >= 2500 && car.pricePerDay <= 3500;
      if (price === "above-3500") return car.pricePerDay > 3500;
      return true;
    });

  filtered = [...filtered].sort((a, b) => {
    if (sort === "price-asc") return a.pricePerDay - b.pricePerDay;
    if (sort === "price-desc") return b.pricePerDay - a.pricePerDay;
    if (sort === "rating") return b.rating - a.rating;
    return b.rating - a.rating || a.pricePerDay - b.pricePerDay;
  });

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-5">
        <h1 className="text-3xl font-black">Search results</h1>
        <p className="mt-2 text-sm text-[rgba(249,250,251,0.70)]">
          Location: <span className="font-semibold text-[#F9FAFB]">{location || "-"}</span>
          {pickupDate && dropoffDate ? <> · {pickupDate.toLocaleString()} to {dropoffDate.toLocaleString()}</> : null}
        </p>
      </header>

      <section className="card-premium p-5">
        <form id="search-filters-form" className="grid gap-4 md:grid-cols-5" method="GET" action="/search">
          <SearchPersistor />
          <input type="hidden" name="pickup" value={pickup} />
          <input type="hidden" name="dropoff" value={dropoff} />

          <div>
            <label htmlFor="location" className="mb-2 block text-sm font-semibold">Location</label>
            <select id="location" name="location" defaultValue={location} className="input-premium">
              <option value="">Select city</option>
              {locationOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="price" className="mb-2 block text-sm font-semibold">Price range</label>
            <select id="price" name="price" defaultValue={price} className="input-premium">
              <option value="all">All prices</option>
              <option value="under-2500">Under 2,500 THB</option>
              <option value="2500-3500">2,500 - 3,500 THB</option>
              <option value="above-3500">Above 3,500 THB</option>
            </select>
          </div>

          <div>
            <label htmlFor="type" className="mb-2 block text-sm font-semibold">Type</label>
            <select id="type" name="type" defaultValue={type} className="input-premium">
              <option value="all">All types</option>
              <option value="sedan">Sedan</option>
              <option value="suv">SUV</option>
              <option value="sport">Sport</option>
            </select>
          </div>

          <div>
            <label htmlFor="brand" className="mb-2 block text-sm font-semibold">Brand</label>
            <select id="brand" name="brand" defaultValue={brand} className="input-premium">
              <option value="all">All brands</option>
              {brands.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sort" className="mb-2 block text-sm font-semibold">Sort by</label>
              <select id="sort" name="sort" defaultValue={sort} className="input-premium">
                <option value="recommended">Recommended</option>
                <option value="price-asc">Price low to high</option>
                <option value="price-desc">Price high to low</option>
                <option value="rating">Rating</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-base btn-outline w-full px-4 py-3">Apply</button>
            </div>
          </div>
        </form>
      </section>

      {errors.length > 0 ? (
        <section className="mt-5 space-y-2">
          {errors.map((msg) => (
            <p key={msg} className="status-banner">{msg}</p>
          ))}
        </section>
      ) : filtered.length === 0 ? (
        <section className="card-premium mt-5 p-8 text-center">
          <span className="badge border-red-400/70 text-red-400">No cars available</span>
          <h2 className="mt-4 text-2xl font-black">No cars match your current filters</h2>
          <p className="mt-2 text-sm text-[rgba(249,250,251,0.70)]">Try changing your dates, location, or selecting a wider price range.</p>
        </section>
      ) : (
        <section className="mt-5">
          <p className="mb-3 text-sm text-[rgba(249,250,251,0.70)]">{filtered.length} cars available</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((car) => {
              const detailParams = new URLSearchParams();
              if (pickup) detailParams.set("pickup", pickup);
              if (dropoff) detailParams.set("dropoff", dropoff);
              if (location) detailParams.set("location", location);
              const href = `/car/${car.roomId}${detailParams.toString() ? `?${detailParams.toString()}` : ""}`;

              return (
                <article key={car.roomId} className="card-premium p-4">
                  <img src={car.image} alt={car.name} className="h-44 w-full rounded-xl border border-white/10 object-cover" />
                  <p className="mt-3 text-xs uppercase tracking-wide text-white/60">{car.brand} · {car.type}</p>
                  <h2 className="mt-1 text-3xl font-bold">{car.name}</h2>
                  <p className="mt-2 text-xl font-bold text-[#F59E0B]">{car.pricePerDay.toLocaleString()} THB <span className="text-base font-medium text-white/70">/ day</span></p>
                  <p className="mt-2 text-sm text-white/70">{car.seats} seats · {car.gear} · {car.fuel} · ★ {car.rating.toFixed(1)}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <a href={href} className="btn-base btn-outline text-center">View details</a>
                    <a href={href} className="btn-base btn-primary text-center">Rent now</a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
