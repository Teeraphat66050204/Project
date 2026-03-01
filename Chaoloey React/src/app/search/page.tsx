import { cookies } from "next/headers";
import { findCatalogByName } from "@/data/cars";
import { listAvailableCars } from "@/models/car.model";
import SearchPersistor from "@/components/search/SearchPersistor";
import { LANGUAGE_COOKIE, normalizeLanguage } from "@/lib/i18n";

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
  const cookieStore = await cookies();
  const lang = normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value);
  const t = lang === "th"
    ? {
        title: "\u0e1c\u0e25\u0e01\u0e32\u0e23\u0e04\u0e49\u0e19\u0e2b\u0e32",
        location: "\u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48",
        selectCity: "\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e40\u0e21\u0e37\u0e2d\u0e07",
        priceRange: "\u0e0a\u0e48\u0e27\u0e07\u0e23\u0e32\u0e04\u0e32",
        allPrices: "\u0e23\u0e32\u0e04\u0e32\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14",
        under2500: "\u0e15\u0e48\u0e33\u0e01\u0e27\u0e48\u0e32 2,500 \u0e1a\u0e32\u0e17",
        from2500to3500: "2,500 - 3,500 \u0e1a\u0e32\u0e17",
        above3500: "\u0e21\u0e32\u0e01\u0e01\u0e27\u0e48\u0e32 3,500 \u0e1a\u0e32\u0e17",
        type: "\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e23\u0e16",
        allTypes: "\u0e17\u0e38\u0e01\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17",
        brand: "\u0e41\u0e1a\u0e23\u0e19\u0e14\u0e4c",
        allBrands: "\u0e17\u0e38\u0e01\u0e41\u0e1a\u0e23\u0e19\u0e14\u0e4c",
        sortBy: "\u0e40\u0e23\u0e35\u0e22\u0e07\u0e15\u0e32\u0e21",
        recommended: "\u0e41\u0e19\u0e30\u0e19\u0e33",
        lowToHigh: "\u0e23\u0e32\u0e04\u0e32\u0e15\u0e48\u0e33\u0e44\u0e1b\u0e2a\u0e39\u0e07",
        highToLow: "\u0e23\u0e32\u0e04\u0e32\u0e2a\u0e39\u0e07\u0e44\u0e1b\u0e15\u0e48\u0e33",
        rating: "\u0e04\u0e30\u0e41\u0e19\u0e19",
        apply: "\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19",
        noCars: "\u0e44\u0e21\u0e48\u0e21\u0e35\u0e23\u0e16\u0e27\u0e48\u0e32\u0e07",
        noCarsTitle: "\u0e44\u0e21\u0e48\u0e21\u0e35\u0e23\u0e16\u0e17\u0e35\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e1a\u0e15\u0e31\u0e27\u0e01\u0e23\u0e2d\u0e07",
        noCarsDesc: "\u0e25\u0e2d\u0e07\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e27\u0e31\u0e19\u0e40\u0e27\u0e25\u0e32 \u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48 \u0e2b\u0e23\u0e37\u0e2d\u0e02\u0e22\u0e32\u0e22\u0e0a\u0e48\u0e27\u0e07\u0e23\u0e32\u0e04\u0e32",
        carsAvailable: "\u0e04\u0e31\u0e19\u0e17\u0e35\u0e48\u0e1e\u0e23\u0e49\u0e2d\u0e21\u0e43\u0e2b\u0e49\u0e08\u0e2d\u0e07",
        view: "\u0e14\u0e39\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14",
        rent: "\u0e40\u0e0a\u0e48\u0e32\u0e17\u0e31\u0e19\u0e17\u0e35",
        perDay: "/ \u0e27\u0e31\u0e19",
        seats: "\u0e17\u0e35\u0e48\u0e19\u0e31\u0e48\u0e07",
        reqLocation: "\u0e15\u0e49\u0e2d\u0e07\u0e23\u0e30\u0e1a\u0e38\u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48",
        reqDates: "\u0e15\u0e49\u0e2d\u0e07\u0e23\u0e30\u0e1a\u0e38\u0e27\u0e31\u0e19\u0e40\u0e27\u0e25\u0e32\u0e23\u0e31\u0e1a\u0e41\u0e25\u0e30\u0e04\u0e37\u0e19\u0e23\u0e16",
        pickupPast: "\u0e27\u0e31\u0e19\u0e40\u0e27\u0e25\u0e32\u0e23\u0e31\u0e1a\u0e23\u0e16\u0e15\u0e49\u0e2d\u0e07\u0e44\u0e21\u0e48\u0e40\u0e1b\u0e47\u0e19\u0e40\u0e27\u0e25\u0e32\u0e43\u0e19\u0e2d\u0e14\u0e35\u0e15",
        dropoffAfter: "\u0e27\u0e31\u0e19\u0e40\u0e27\u0e25\u0e32\u0e04\u0e37\u0e19\u0e23\u0e16\u0e15\u0e49\u0e2d\u0e07\u0e2b\u0e25\u0e31\u0e07\u0e27\u0e31\u0e19\u0e40\u0e27\u0e25\u0e32\u0e23\u0e31\u0e1a\u0e23\u0e16",
      }
    : {
        title: "Search results",
        location: "Location",
        selectCity: "Select city",
        priceRange: "Price range",
        allPrices: "All prices",
        under2500: "Under 2,500 THB",
        from2500to3500: "2,500 - 3,500 THB",
        above3500: "Above 3,500 THB",
        type: "Type",
        allTypes: "All types",
        brand: "Brand",
        allBrands: "All brands",
        sortBy: "Sort by",
        recommended: "Recommended",
        lowToHigh: "Price low to high",
        highToLow: "Price high to low",
        rating: "Rating",
        apply: "Apply",
        noCars: "No cars available",
        noCarsTitle: "No cars match your current filters",
        noCarsDesc: "Try changing your dates, location, or selecting a wider price range.",
        carsAvailable: "cars available",
        view: "View details",
        rent: "Rent now",
        perDay: "/ day",
        seats: "seats",
        reqLocation: "Location is required.",
        reqDates: "Pick-up and drop-off date/time are required.",
        pickupPast: "Pick-up cannot be in the past.",
        dropoffAfter: "Drop-off must be later than pick-up.",
      };

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
  if (!location) errors.push(t.reqLocation);
  if (!pickupDate || !dropoffDate) errors.push(t.reqDates);
  if (pickupDate && pickupDate < new Date()) errors.push(t.pickupPast);
  if (pickupDate && dropoffDate && dropoffDate <= pickupDate) errors.push(t.dropoffAfter);

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

  const locale = lang === "th" ? "th-TH" : "en-US";

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-5">
        <h1 className="text-3xl font-black">{t.title}</h1>
        <p className="mt-2 text-sm text-[rgba(249,250,251,0.70)]">
          {t.location}: <span className="font-semibold text-[#F9FAFB]">{location || "-"}</span>
          {pickupDate && dropoffDate ? <> - {pickupDate.toLocaleString(locale)} to {dropoffDate.toLocaleString(locale)}</> : null}
        </p>
      </header>

      <section className="card-premium p-5">
        <form id="search-filters-form" className="grid gap-4 md:grid-cols-5" method="GET" action="/search">
          <SearchPersistor />
          <input type="hidden" name="pickup" value={pickup} />
          <input type="hidden" name="dropoff" value={dropoff} />

          <div>
            <label htmlFor="location" className="mb-2 block text-sm font-semibold">{t.location}</label>
            <select id="location" name="location" defaultValue={location} className="input-premium">
              <option value="">{t.selectCity}</option>
              {locationOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="price" className="mb-2 block text-sm font-semibold">{t.priceRange}</label>
            <select id="price" name="price" defaultValue={price} className="input-premium">
              <option value="all">{t.allPrices}</option>
              <option value="under-2500">{t.under2500}</option>
              <option value="2500-3500">{t.from2500to3500}</option>
              <option value="above-3500">{t.above3500}</option>
            </select>
          </div>

          <div>
            <label htmlFor="type" className="mb-2 block text-sm font-semibold">{t.type}</label>
            <select id="type" name="type" defaultValue={type} className="input-premium">
              <option value="all">{t.allTypes}</option>
              <option value="sedan">Sedan</option>
              <option value="suv">SUV</option>
              <option value="sport">Sport</option>
            </select>
          </div>

          <div>
            <label htmlFor="brand" className="mb-2 block text-sm font-semibold">{t.brand}</label>
            <select id="brand" name="brand" defaultValue={brand} className="input-premium">
              <option value="all">{t.allBrands}</option>
              {brands.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sort" className="mb-2 block text-sm font-semibold">{t.sortBy}</label>
              <select id="sort" name="sort" defaultValue={sort} className="input-premium">
                <option value="recommended">{t.recommended}</option>
                <option value="price-asc">{t.lowToHigh}</option>
                <option value="price-desc">{t.highToLow}</option>
                <option value="rating">{t.rating}</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-base btn-outline w-full px-4 py-3">{t.apply}</button>
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
          <span className="badge border-red-400/70 text-red-400">{t.noCars}</span>
          <h2 className="mt-4 text-2xl font-black">{t.noCarsTitle}</h2>
          <p className="mt-2 text-sm text-[rgba(249,250,251,0.70)]">{t.noCarsDesc}</p>
        </section>
      ) : (
        <section className="mt-5">
          <p className="mb-3 text-sm text-[rgba(249,250,251,0.70)]">{filtered.length} {t.carsAvailable}</p>
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
                  <p className="mt-3 text-xs uppercase tracking-wide text-white/60">{car.brand} - {car.type}</p>
                  <h2 className="mt-1 text-3xl font-bold">{car.name}</h2>
                  <p className="mt-2 text-xl font-bold text-[#F59E0B]">{car.pricePerDay.toLocaleString()} THB <span className="text-base font-medium text-white/70">{t.perDay}</span></p>
                  <p className="mt-2 text-sm text-white/70">{car.seats} {t.seats} - {car.gear} - {car.fuel} - {car.rating.toFixed(1)}★</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <a href={href} className="btn-base btn-outline text-center">{t.view}</a>
                    <a href={href} className="btn-base btn-primary text-center">{t.rent}</a>
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
