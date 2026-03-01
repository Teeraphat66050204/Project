import { addDays, format, isSameDay, parseISO, startOfDay } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { ApiError, getAvailableCars, getCarAvailability, getCarById, type Car, type CarAvailabilityBooking } from "../../lib/api";

type CarDetailPageProps = {
  carId: string;
};

type AvailabilityRow = {
  date: Date;
  available: boolean;
  slots: string[];
};

type BookingQuery = {
  location: string;
  pickupAt: string;
  returnAt: string;
};

type LatLngPoint = {
  lat: number;
  lng: number;
};

type CarSpecs = {
  type: "SUV" | "Sedan" | "Sport";
  transmission: "Auto" | "Manual";
  fuel: "Petrol" | "Hybrid" | "Diesel" | "Electric";
  engine: string;
};

const BRAND_IMAGES: Record<string, string> = {
  toyota: "https://pngimg.com/uploads/toyota/toyota_PNG1933.png",
  honda: "https://pngimg.com/uploads/honda/honda_PNG10347.png",
  mazda: "https://pngimg.com/uploads/mazda/mazda_PNG57.png",
  mitsubishi: "https://pngimg.com/uploads/mitsubishi/mitsubishi_PNG188.png",
  nissan: "https://pngimg.com/uploads/nissan/nissan_PNG71.png",
  audi: "https://pngimg.com/uploads/audi/audi_PNG1734.png",
  jaguar: "https://pngimg.com/uploads/jaguar/jaguar_PNG81.png",
  volvo: "https://pngimg.com/uploads/volvo/volvo_PNG50.png",
  acura: "https://pngimg.com/uploads/acura/acura_PNG12173.png",
};

const MODEL_GALLERY_BY_KEY: Record<string, string[]> = {
  "honda-civic": [BRAND_IMAGES.honda],
  "toyota-yaris": [BRAND_IMAGES.toyota],
  "mazda-cx5": [BRAND_IMAGES.mazda],
  "mitsubishi-pajero-sport": [BRAND_IMAGES.mitsubishi],
  "nissan-almera": [BRAND_IMAGES.nissan],
  "audi-a4": [BRAND_IMAGES.audi],
};

const MODEL_GALLERY_BY_ID: Record<string, string[]> = {
  "demo-honda-civic": MODEL_GALLERY_BY_KEY["honda-civic"],
  "demo-toyota-yaris": MODEL_GALLERY_BY_KEY["toyota-yaris"],
  "demo-mazda-cx5": MODEL_GALLERY_BY_KEY["mazda-cx5"],
  "demo-mitsubishi-pajero": MODEL_GALLERY_BY_KEY["mitsubishi-pajero-sport"],
  "demo-nissan-almera": MODEL_GALLERY_BY_KEY["nissan-almera"],
  "demo-audi-a4": MODEL_GALLERY_BY_KEY["audi-a4"],
};

const FALLBACK_CAR_IMAGE = "https://pngimg.com/d/porsche_PNG10606.png";
const GOOGLE_MAPS_API_KEY = import.meta.env.PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

const DEMO_CARS: Car[] = [
  { id: "demo-honda-civic", name: "Honda Civic", seats: 5 },
  { id: "demo-toyota-yaris", name: "Toyota Yaris", seats: 5 },
  { id: "demo-mazda-cx5", name: "Mazda CX-5", seats: 5 },
  { id: "demo-mitsubishi-pajero", name: "Mitsubishi Pajero Sport", seats: 7 },
  { id: "demo-nissan-almera", name: "Nissan Almera", seats: 5 },
  { id: "demo-audi-a4", name: "Audi A4", seats: 5 },
];

function inferBrandKey(name: string): string {
  const lower = name.toLowerCase();
  return Object.keys(BRAND_IMAGES).find((item) => lower.includes(item)) ?? "";
}

function inferBrandLabel(name: string): string {
  const key = inferBrandKey(name);
  return key ? key.toUpperCase() : "CAR";
}

function inferImage(name: string): string {
  const key = inferBrandKey(name);
  return key ? BRAND_IMAGES[key] : FALLBACK_CAR_IMAGE;
}

function inferSpecs(name: string, seats: number): CarSpecs {
  const lower = name.toLowerCase();
  const isSport = ["sport", "gt", "gtr", "rs", "amg"].some((item) => lower.includes(item));
  const isSuv = ["cx", "x5", "x3", "suv", "pajero", "fortuner"].some((item) => lower.includes(item));

  const type: CarSpecs["type"] = isSport ? "Sport" : isSuv ? "SUV" : "Sedan";
  const transmission: CarSpecs["transmission"] = seats >= 7 ? "Auto" : lower.includes("almera") ? "Manual" : "Auto";
  const fuel: CarSpecs["fuel"] = type === "Sport" ? "Petrol" : seats >= 7 ? "Diesel" : "Hybrid";
  const engine = type === "Sport" ? "2.5L Turbo" : type === "SUV" ? "2.4L" : "1.8L";

  return { type, transmission, fuel, engine };
}

function normalizeModelKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function inferModelKey(name: string): string {
  const key = normalizeModelKey(name);
  if (key.includes("honda") && key.includes("civic")) return "honda-civic";
  if (key.includes("toyota") && key.includes("yaris")) return "toyota-yaris";
  if (key.includes("mazda") && key.includes("cx-5")) return "mazda-cx5";
  if (key.includes("mitsubishi") && key.includes("pajero") && key.includes("sport")) return "mitsubishi-pajero-sport";
  if (key.includes("nissan") && key.includes("almera")) return "nissan-almera";
  if (key.includes("audi") && key.includes("a4")) return "audi-a4";
  return "";
}

function buildGallery(car: Car): string[] {
  const byId = MODEL_GALLERY_BY_ID[car.id];
  if (byId?.length) return byId.slice(0, 3);

  const modelKey = inferModelKey(car.name);
  const byModel = modelKey ? MODEL_GALLERY_BY_KEY[modelKey] : undefined;
  if (byModel?.length) return byModel.slice(0, 3);

  return [FALLBACK_CAR_IMAGE];
}

function handleCarImageError(event: { currentTarget: HTMLImageElement }) {
  const target = event.currentTarget;
  if (target.src === FALLBACK_CAR_IMAGE) return;
  target.src = FALLBACK_CAR_IMAGE;
}

function formatSlot(booking: CarAvailabilityBooking): string {
  const start = parseISO(booking.startTime);
  const end = parseISO(booking.endTime);
  return `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`;
}

function toLocalDateTimeInput(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

async function reverseGeocodeWithGoogle(point: LatLngPoint): Promise<string | null> {
  if (!GOOGLE_MAPS_API_KEY) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${point.lat},${point.lng}`);
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

  const response = await fetch(url.toString());
  if (!response.ok) return null;

  const payload = (await response.json()) as { status?: string; results?: Array<{ formatted_address?: string }> };
  if (payload.status !== "OK") return null;
  return payload.results?.[0]?.formatted_address ?? null;
}

export function CarDetailPage({ carId }: CarDetailPageProps) {
  const [car, setCar] = useState<Car | null>(null);
  const [bookings, setBookings] = useState<CarAvailabilityBooking[]>([]);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [query, setQuery] = useState<BookingQuery>({ location: "", pickupAt: "", returnAt: "" });
  const [rangeAvailable, setRangeAvailable] = useState(true);
  const [rangeChecked, setRangeChecked] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ placeId: string; description: string }>>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapPickerError, setMapPickerError] = useState("");
  const [mapPoint, setMapPoint] = useState<LatLngPoint | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const placesAutocompleteRef = useRef<any>(null);
  const locationDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const now = new Date();
    const defaultPickup = format(new Date(now.getTime() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm");
    const defaultReturn = format(new Date(now.getTime() + 3 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm");

    setQuery({
      location: params.get("location") ?? "",
      pickupAt: toLocalDateTimeInput(params.get("pickupAt") ?? defaultPickup),
      returnAt: toLocalDateTimeInput(params.get("returnAt") ?? defaultReturn),
    });
  }, []);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;

    let mounted = true;
    void (async () => {
      try {
        setOptions({
          key: GOOGLE_MAPS_API_KEY,
          v: "weekly",
        });
        const places = await importLibrary("places");
        if (!mounted) return;
        placesAutocompleteRef.current = new places.AutocompleteService();
      } catch {
        placesAutocompleteRef.current = null;
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!showLocationSuggestions) return;
    if (!query.location.trim() || query.location.trim().length < 2) {
      setLocationSuggestions([]);
      return;
    }
    if (!placesAutocompleteRef.current) return;

    if (locationDebounceRef.current) {
      window.clearTimeout(locationDebounceRef.current);
    }

    locationDebounceRef.current = window.setTimeout(() => {
      placesAutocompleteRef.current.getPlacePredictions(
        { input: query.location, language: "th", region: "th" },
        (predictions: any[] | null) => {
          const list = (predictions ?? []).slice(0, 6).map((item) => ({
            placeId: item.place_id,
            description: item.description,
          }));
          setLocationSuggestions(list);
        },
      );
    }, 220);

    return () => {
      if (locationDebounceRef.current) window.clearTimeout(locationDebounceRef.current);
    };
  }, [query.location, showLocationSuggestions]);

  useEffect(() => {
    if (!mapPickerOpen || !GOOGLE_MAPS_API_KEY || !mapContainerRef.current) return;

    let mounted = true;
    let clickListener: { remove: () => void } | null = null;
    let marker: any = null;

    void (async () => {
      try {
        setMapPickerError("");
        setOptions({
          key: GOOGLE_MAPS_API_KEY,
          v: "weekly",
        });
        const maps = await importLibrary("maps");
        const markerLib = await importLibrary("marker");
        if (!mounted || !mapContainerRef.current) return;

        const center = mapPoint ?? { lat: 13.7563, lng: 100.5018 };
        const map = new maps.Map(mapContainerRef.current, {
          center,
          zoom: mapPoint ? 14 : 11,
          mapTypeControl: false,
          streetViewControl: false,
        });

        if (mapPoint) {
          marker = new markerLib.Marker({ map, position: mapPoint });
        }

        clickListener = map.addListener("click", (event: any) => {
          const lat = event?.latLng?.lat?.();
          const lng = event?.latLng?.lng?.();
          if (typeof lat !== "number" || typeof lng !== "number") return;
          setMapPoint({ lat, lng });

          if (marker) marker.setMap(null);
          marker = new markerLib.Marker({ map, position: { lat, lng } });
        });
      } catch {
        setMapPickerError("Unable to load Google Map.");
      }
    })();

    return () => {
      mounted = false;
      clickListener?.remove();
      if (marker) marker.setMap(null);
    };
  }, [mapPickerOpen, mapPoint]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    void (async () => {
      try {
        const demoCar = DEMO_CARS.find((item) => item.id === carId);
        const carData = demoCar ?? (await getCarById(carId));
        const availability = demoCar
          ? { bookings: [] as CarAvailabilityBooking[] }
          : await getCarAvailability(carId, { from: new Date(), days });

        if (!active) return;
        setCar(carData);
        setBookings(availability.bookings);
      } catch (err) {
        if (!active) return;
        const message = err instanceof ApiError ? err.code : "Failed to load car detail";
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [carId, days]);

  const specs = useMemo(() => (car ? inferSpecs(car.name, car.seats) : null), [car]);
  const gallery = useMemo(() => (car ? buildGallery(car) : []), [car]);

  useEffect(() => {
    setActiveImage(0);
  }, [carId]);

  const selectedRangeText = useMemo(() => {
    if (!query.pickupAt || !query.returnAt) return "No selected date range from previous step.";
    const pickup = new Date(query.pickupAt);
    const dropoff = new Date(query.returnAt);
    if (Number.isNaN(pickup.getTime()) || Number.isNaN(dropoff.getTime())) return "No selected date range from previous step.";
    return `${format(pickup, "dd MMM yyyy HH:mm")} to ${format(dropoff, "dd MMM yyyy HH:mm")}`;
  }, [query.pickupAt, query.returnAt]);

  useEffect(() => {
    if (!query.pickupAt || !query.returnAt || !carId) {
      setRangeChecked(false);
      setRangeAvailable(true);
      return;
    }

    const from = new Date(query.pickupAt);
    const to = new Date(query.returnAt);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
      setRangeChecked(true);
      setRangeAvailable(false);
      return;
    }

    let active = true;
    setRangeChecked(false);

    void (async () => {
      try {
        const available = await getAvailableCars({ from, to });
        if (!active) return;
        setRangeAvailable(available.some((item) => item.id === carId));
      } catch {
        if (!active) return;
        setRangeAvailable(false);
      } finally {
        if (active) setRangeChecked(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [carId, query.pickupAt, query.returnAt]);

  const continueBookingHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("carId", carId);
    if (query.location) params.set("location", query.location);
    if (query.pickupAt) params.set("pickupAt", query.pickupAt);
    if (query.returnAt) params.set("returnAt", query.returnAt);
    return `/booking?${params.toString()}`;
  }, [carId, query.location, query.pickupAt, query.returnAt]);

  const handleConfirmMapPicker = async () => {
    if (!mapPoint) {
      setMapPickerError("Please click a point on the map first.");
      return;
    }

    const resolvedAddress = await reverseGeocodeWithGoogle(mapPoint);
    setQuery((prev) => ({
      ...prev,
      location: resolvedAddress ?? `${mapPoint.lat.toFixed(6)}, ${mapPoint.lng.toFixed(6)}`,
    }));
    setMapPickerOpen(false);
    setMapPickerError("");
  };

  const pricePerDay = useMemo(() => (car ? 1500 + car.seats * 150 : 0), [car]);
  const selectedDays = useMemo(() => {
    if (!query.pickupAt || !query.returnAt) return 1;
    const from = new Date(query.pickupAt);
    const to = new Date(query.returnAt);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) return 1;
    return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));
  }, [query.pickupAt, query.returnAt]);
  const selectedRangePrice = pricePerDay * selectedDays;

  const availabilityRows = useMemo<AvailabilityRow[]>(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: days }, (_, index) => {
      const date = addDays(today, index);
      const sameDayBookings = bookings.filter((item) => isSameDay(parseISO(item.startTime), date));
      return {
        date,
        available: sameDayBookings.length === 0,
        slots: sameDayBookings.map(formatSlot),
      };
    });
  }, [bookings, days]);

  return (
    <main className="min-h-screen bg-[#eef2f7] pb-14 pt-8 text-slate-900">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <a href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          Back to home
        </a>

        {loading && <p className="mt-6 text-sm text-slate-600">Loading car detail...</p>}
        {error && <p className="mt-6 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

        {!loading && !error && car && specs && (
          <>
            <section className="mt-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/70 sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
                <div>
                  <div className="rounded-2xl bg-[#f5f7fb] p-4">
                    <img
                      src={gallery[activeImage] ?? inferImage(car.name)}
                      alt={car.name}
                      className="mx-auto h-64 w-full object-contain"
                      onError={handleCarImageError}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {gallery.map((image, index) => (
                      <button
                        type="button"
                        key={`${image}-${index}`}
                        onClick={() => setActiveImage(index)}
                        className={`rounded-xl border p-2 ${activeImage === index ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}
                      >
                        <img src={image} alt={`${car.name} angle ${index + 1}`} className="h-20 w-full object-contain" onError={handleCarImageError} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold tracking-wide text-blue-600">CAR DETAIL</p>
                  <h1 className="mt-2 text-4xl font-black text-[#071c45]">{car.name}</h1>
                  <p className="mt-2 text-sm text-slate-500">{inferBrandLabel(car.name)}</p>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><span className="text-slate-500">Engine</span><p className="font-semibold text-slate-900">{specs.engine}</p></div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><span className="text-slate-500">Seats</span><p className="font-semibold text-slate-900">{car.seats}</p></div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><span className="text-slate-500">Transmission</span><p className="font-semibold text-slate-900">{specs.transmission}</p></div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><span className="text-slate-500">Type</span><p className="font-semibold text-slate-900">{specs.type}</p></div>
                  </div>

                  <p className="mt-5 text-sm text-slate-500">Price</p>
                  <p className="text-4xl font-black text-[#071c45]">{pricePerDay.toLocaleString()} Baht <span className="text-base font-semibold text-slate-500">/ day</span></p>
                  <p className="mt-1 text-sm text-slate-500">Selected range total: <span className="font-semibold text-slate-800">{selectedRangePrice.toLocaleString()} Baht</span></p>

                  {!rangeChecked ? (
                    <p className="mt-6 text-sm text-slate-500">Checking availability...</p>
                  ) : rangeAvailable ? (
                    <a href={continueBookingHref} className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
                      Continue Booking
                    </a>
                  ) : (
                    <button type="button" disabled className="mt-6 inline-flex cursor-not-allowed rounded-xl bg-slate-300 px-5 py-3 text-sm font-semibold text-white">
                      Not available for selected range
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-3">
              <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-1">
                <p className="text-xs font-semibold tracking-wide text-blue-600">SELECTED RANGE</p>
                <p className="mt-2 text-sm text-slate-700">{selectedRangeText}</p>
                <p className="mt-2 text-sm text-slate-500">Location: {query.location || "Not selected"}</p>

                <div className="mt-3 space-y-2">
                  <label className="block text-xs font-semibold text-slate-500">
                    PICKUP
                    <input
                      type="datetime-local"
                      value={query.pickupAt}
                      onChange={(e) => setQuery((prev) => ({ ...prev, pickupAt: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-300"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-500">
                    DROP-OFF
                    <input
                      type="datetime-local"
                      value={query.returnAt}
                      min={query.pickupAt || undefined}
                      onChange={(e) => setQuery((prev) => ({ ...prev, returnAt: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-300"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-500">
                    LOCATION
                    <div className="relative mt-1">
                      <input
                        ref={locationInputRef}
                        type="text"
                        value={query.location}
                        onChange={(e) => setQuery((prev) => ({ ...prev, location: e.target.value }))}
                        onFocus={() => setShowLocationSuggestions(true)}
                        onBlur={() => {
                          window.setTimeout(() => setShowLocationSuggestions(false), 150);
                        }}
                        placeholder="Enter pickup location"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 pr-24 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!GOOGLE_MAPS_API_KEY) {
                            setMapPickerError("Missing PUBLIC_GOOGLE_MAPS_API_KEY");
                            return;
                          }
                          setMapPickerOpen(true);
                        }}
                        className="absolute right-1 top-1 rounded-md border border-blue-200 px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
                      >
                        Map
                      </button>
                      {showLocationSuggestions && locationSuggestions.length > 0 && (
                        <ul className="absolute left-0 right-0 top-[38px] z-20 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                          {locationSuggestions.map((item) => (
                            <li key={item.placeId}>
                              <button
                                type="button"
                                className="w-full rounded-md px-2 py-2 text-left text-xs text-slate-700 hover:bg-blue-50"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setQuery((prev) => ({ ...prev, location: item.description }));
                                  setLocationSuggestions([]);
                                  setShowLocationSuggestions(false);
                                }}
                              >
                                {item.description}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </label>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-1">
                <p className="text-xs font-semibold tracking-wide text-blue-600">CANCELLATION POLICY</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  <li>Free cancellation within 24 hours after booking.</li>
                  <li>50% refund if cancelled 24 hours before pickup.</li>
                  <li>No refund for same-day cancellation.</li>
                </ul>
              </article>

              <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-1">
                <p className="text-xs font-semibold tracking-wide text-blue-600">INSURANCE TERMS</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  <li>Basic insurance included in daily rate.</li>
                  <li>Customer deductible starts at 10,000 Baht.</li>
                  <li>Optional full coverage is available at pickup.</li>
                </ul>
              </article>
            </section>

            <section className="mt-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/70 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-3xl font-black text-[#071c45]">Car availability</h2>
                <label className="text-xs font-semibold text-slate-500">
                  SHOW DAYS
                  <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="ml-2 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700"
                  >
                    <option value={7}>7</option>
                    <option value={14}>14</option>
                    <option value={21}>21</option>
                    <option value={30}>30</option>
                  </select>
                </label>
              </div>

              <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[680px] divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Day</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Booked slots</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {availabilityRows.map((row) => (
                      <tr key={row.date.toISOString()}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{format(row.date, "dd MMM yyyy")}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{format(row.date, "EEEE")}</td>
                        <td className="px-4 py-3 text-sm">
                          {row.available ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Available</span>
                          ) : (
                            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">Booked</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{row.slots.length > 0 ? row.slots.join(", ") : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {mapPickerOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
                <div className="w-full max-w-3xl rounded-2xl bg-white p-4 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Pick location from Google Map</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setMapPickerOpen(false);
                        setMapPickerError("");
                      }}
                      className="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>

                  <div ref={mapContainerRef} className="mt-3 h-[380px] w-full rounded-xl border border-slate-200" />

                  {mapPoint && (
                    <p className="mt-2 text-xs text-slate-500">
                      Selected point: {mapPoint.lat.toFixed(6)}, {mapPoint.lng.toFixed(6)}
                    </p>
                  )}
                  {mapPickerError && <p className="mt-2 text-sm text-rose-600">{mapPickerError}</p>}

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMapPickerOpen(false);
                        setMapPickerError("");
                      }}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleConfirmMapPicker()}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Use this location
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}


