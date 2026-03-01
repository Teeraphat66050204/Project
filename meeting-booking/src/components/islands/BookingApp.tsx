import { useEffect, useMemo, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { format } from "date-fns";
import { ApiError, getAvailableCars, getCars, getMe, logout, type Car, type SessionUser } from "../../lib/api";
import { BookingCalendar } from "./BookingCalendar";

type AuthState = "loading" | "guest" | "authenticated";

type DealCard = {
  id: string;
  name: string;
  image: string;
  seats: number;
  transmission: string;
  fuel: string;
  pricePerDay: number;
};

type SearchSort = "popular" | "price-asc" | "rating";

type SearchResultCar = {
  id: string;
  name: string;
  seats: number;
  image: string;
  pricePerDay: number;
  type: "SUV" | "Sedan" | "Sport";
  brand: string;
  transmission: "Auto" | "Manual";
  fuel: "Petrol" | "Hybrid" | "Diesel" | "Electric";
  rating: number;
  popularity: number;
};

type LatLngPoint = {
  lat: number;
  lng: number;
};

const BRAND_NAMES = ["HONDA", "JAGUAR", "NISSAN", "VOLVO", "AUDI", "ACURA"];
const SPORT_KEYWORDS = ["sport", "gtr", "gt", "amg", "rs", "911", "supra"];
const SUV_KEYWORDS = ["suv", "cx", "cr-v", "x5", "x3", "q5", "q7", "fortuner", "everest"];
const ROOM_KEYWORDS = ["room", "studio", "pod", "meeting", "conference", "à¸«à¹‰à¸­à¸‡", "à¸›à¸£à¸°à¸Šà¸¸à¸¡"];
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
const FALLBACK_CAR_IMAGE = "https://pngimg.com/d/porsche_PNG10606.png";
const KNOWN_BRANDS = Object.keys(BRAND_IMAGES);
const GOOGLE_MAPS_API_KEY = import.meta.env.PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
const TIME_OPTIONS = Array.from({ length: 25 }, (_, idx) => {
  const total = 8 * 60 + idx * 30;
  const hours = String(Math.floor(total / 60)).padStart(2, "0");
  const minutes = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
});
const DEMO_CARS: Car[] = [
  { id: "demo-honda-civic", name: "Honda Civic", seats: 5 },
  { id: "demo-toyota-yaris", name: "Toyota Yaris", seats: 5 },
  { id: "demo-mazda-cx5", name: "Mazda CX-5", seats: 5 },
  { id: "demo-mitsubishi-pajero", name: "Mitsubishi Pajero Sport", seats: 7 },
  { id: "demo-nissan-almera", name: "Nissan Almera", seats: 5 },
  { id: "demo-audi-a4", name: "Audi A4", seats: 5 },
];

const TESTIMONIALS = [
  {
    name: "Charlie Johnson",
    text: "I feel very secure when using ChaoLoey services. The team is enthusiastic and the driver is always on time.",
    image: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=700",
    stars: 5.0,
  },
  {
    name: "Emily Wilson",
    text: "The booking experience is fast and clear. I can find the right car and complete everything in minutes.",
    image: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=700",
    stars: 4.8,
  },
  {
    name: "David Lee",
    text: "Car condition is excellent and support is responsive when I need help. Strongly recommended.",
    image: "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=700",
    stars: 4.9,
  },
];

function mapOAuthError(code: string): string {
  if (code.startsWith("GOOGLE_")) return `Google login failed: ${code}`;
  return `Social login failed: ${code}`;
}

function toInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function nextSaturday(base: Date): Date {
  const copy = new Date(base);
  const diff = (6 - copy.getDay() + 7) % 7;
  copy.setDate(copy.getDate() + diff);
  return copy;
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

function inferBrand(name: string): string {
  const lowerName = name.toLowerCase();
  const brandKey = KNOWN_BRANDS.find((brand) => lowerName.includes(brand));
  return brandKey ? brandKey.toUpperCase() : "OTHER";
}

function inferType(name: string, index: number): "SUV" | "Sedan" | "Sport" {
  const lowerName = name.toLowerCase();
  if (SPORT_KEYWORDS.some((keyword) => lowerName.includes(keyword))) return "Sport";
  if (SUV_KEYWORDS.some((keyword) => lowerName.includes(keyword))) return "SUV";
  return index % 3 === 0 ? "SUV" : index % 3 === 1 ? "Sedan" : "Sport";
}

function inferImage(name: string): string {
  const lowerName = name.toLowerCase();
  const brandKey = KNOWN_BRANDS.find((brand) => lowerName.includes(brand));
  return brandKey ? BRAND_IMAGES[brandKey] : FALLBACK_CAR_IMAGE;
}

function isLikelyCar(item: Car): boolean {
  const lowerName = item.name.toLowerCase();
  if (ROOM_KEYWORDS.some((keyword) => lowerName.includes(keyword))) return false;
  return KNOWN_BRANDS.some((brand) => lowerName.includes(brand));
}

function decorateSearchCars(items: Car[]): SearchResultCar[] {
  const filtered = items.filter(isLikelyCar);
  const source = filtered.length > 0 ? filtered : DEMO_CARS;

  return source.map((car, index) => {
    const type = inferType(car.name, index);
    const transmission = index % 2 === 0 ? "Auto" : "Manual";
    const fuel = index % 4 === 0 ? "Electric" : index % 4 === 1 ? "Hybrid" : index % 4 === 2 ? "Petrol" : "Diesel";
    const base = type === "Sport" ? 3600 : type === "SUV" ? 2700 : 1900;

    return {
      id: car.id,
      name: car.name,
      seats: Math.max(2, Math.min(car.seats, 8)),
      image: inferImage(car.name),
      brand: inferBrand(car.name),
      type,
      transmission,
      fuel,
      pricePerDay: base + (index % 5) * 220,
      rating: Number((4.3 + (index % 7) * 0.1).toFixed(1)),
      popularity: 100 - index * 3 + car.seats,
    };
  });
}

function buildDeals(cars: Car[]): DealCard[] {
  const source = cars.filter(isLikelyCar);
  const items = (source.length > 0 ? source : DEMO_CARS).slice(0, 8);

  return items.map((car, index) => ({
    image: inferImage(car.name),
    id: car.id,
    name: car.name,
    seats: Math.max(2, Math.min(car.seats, 8)),
    transmission: index % 2 === 0 ? "Auto" : "Manual",
    fuel: index % 3 === 0 ? "Petrol" : index % 3 === 1 ? "Hybrid" : "Diesel",
    pricePerDay: 1500 + index * 250,
  }));
}

export function BookingApp() {
  const todayInput = toInputDate(new Date());
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [cars, setCars] = useState<Car[]>([]);

  const [location, setLocation] = useState("");
  const [pickupDate, setPickupDate] = useState(todayInput);
  const [pickupTime, setPickupTime] = useState("09:00");
  const [returnDate, setReturnDate] = useState(todayInput);
  const [returnTime, setReturnTime] = useState("11:00");
  const [notice, setNotice] = useState("");
  const [searchErrors, setSearchErrors] = useState<{ location?: string; pickup?: string; dropoff?: string }>({});
  const [showPlanner, setShowPlanner] = useState(false);
  const [plannerCarId, setPlannerCarId] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapPoint, setMapPoint] = useState<LatLngPoint | null>(null);
  const [mapPickerError, setMapPickerError] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ placeId: string; description: string }>>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultCar[]>([]);
  const [selectedCarId, setSelectedCarId] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "SUV" | "Sedan" | "Sport">("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [transmissionFilter, setTransmissionFilter] = useState<"all" | "Auto" | "Manual">("all");
  const [fuelFilter, setFuelFilter] = useState<"all" | "Petrol" | "Hybrid" | "Diesel" | "Electric">("all");
  const [priceFilter, setPriceFilter] = useState<"all" | "under-2000" | "2000-3000" | "above-3000">("all");
  const [sortBy, setSortBy] = useState<SearchSort>("popular");
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const placesAutocompleteRef = useRef<any>(null);
  const locationDebounceRef = useRef<number | null>(null);

  const isAuthenticated = authState === "authenticated";
  const pickupAt = useMemo(
    () => (pickupDate && pickupTime ? `${pickupDate}T${pickupTime}` : ""),
    [pickupDate, pickupTime],
  );
  const returnAt = useMemo(
    () => (returnDate && returnTime ? `${returnDate}T${returnTime}` : ""),
    [returnDate, returnTime],
  );
  const deals = useMemo(() => buildDeals(cars), [cars]);
  const brandsInResults = useMemo(
    () => Array.from(new Set(searchResults.map((item) => item.brand))).sort((a, b) => a.localeCompare(b)),
    [searchResults],
  );

  const visibleResults = useMemo(() => {
    const filtered = searchResults.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (brandFilter !== "all" && item.brand !== brandFilter) return false;
      if (transmissionFilter !== "all" && item.transmission !== transmissionFilter) return false;
      if (fuelFilter !== "all" && item.fuel !== fuelFilter) return false;
      if (priceFilter === "under-2000" && item.pricePerDay >= 2000) return false;
      if (priceFilter === "2000-3000" && (item.pricePerDay < 2000 || item.pricePerDay > 3000)) return false;
      if (priceFilter === "above-3000" && item.pricePerDay <= 3000) return false;
      return true;
    });

    if (sortBy === "price-asc") {
      return [...filtered].sort((a, b) => a.pricePerDay - b.pricePerDay);
    }
    if (sortBy === "rating") {
      return [...filtered].sort((a, b) => b.rating - a.rating);
    }
    return [...filtered].sort((a, b) => b.popularity - a.popularity);
  }, [brandFilter, fuelFilter, priceFilter, searchResults, sortBy, transmissionFilter, typeFilter]);

  const returnTimeOptions = useMemo(() => {
    if (pickupDate !== returnDate) return TIME_OPTIONS;
    return TIME_OPTIONS.filter((time) => time > pickupTime);
  }, [pickupDate, pickupTime, returnDate]);

  const selectedCar = useMemo(
    () => visibleResults.find((car) => car.id === selectedCarId) ?? searchResults.find((car) => car.id === selectedCarId) ?? null,
    [searchResults, selectedCarId, visibleResults],
  );

  const rentalDurationHours = useMemo(() => {
    if (!pickupAt || !returnAt) return 0;
    const pickup = new Date(pickupAt);
    const dropoff = new Date(returnAt);
    if (Number.isNaN(pickup.getTime()) || Number.isNaN(dropoff.getTime())) return 0;
    const diff = (dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60);
    return diff > 0 ? diff : 0;
  }, [pickupAt, returnAt]);

  const estimatedDailyRate = selectedCar?.pricePerDay ?? visibleResults[0]?.pricePerDay ?? 2200;
  const estimatedTotal = useMemo(() => {
    if (rentalDurationHours <= 0) return 0;
    return Math.round((rentalDurationHours / 24) * estimatedDailyRate);
  }, [estimatedDailyRate, rentalDurationHours]);

  const loadSession = async () => {
    setAuthState("loading");

    try {
      const me = await getMe();
      setUser(me);
      setAuthState("authenticated");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
        setAuthState("guest");
        return;
      }

      setUser(null);
      setAuthState("guest");
      setNotice("Unable to validate current session.");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("authError");
    if (authError) {
      setNotice(mapOAuthError(authError));
      params.delete("authError");
      const clean = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState({}, "", clean);
    }

    const preselectCarId = params.get("carId");
    const preselectPickupAt = params.get("pickupAt");
    const preselectReturnAt = params.get("returnAt");
    const preselectLocation = params.get("location");
    if (preselectCarId) {
      setPlannerCarId(preselectCarId);
      setShowPlanner(true);
      if (preselectPickupAt) {
        const pickup = new Date(preselectPickupAt);
        if (!Number.isNaN(pickup.getTime())) {
          setPickupDate(toInputDate(pickup));
          setPickupTime(format(pickup, "HH:mm"));
        }
      }
      if (preselectReturnAt) {
        const dropoff = new Date(preselectReturnAt);
        if (!Number.isNaN(dropoff.getTime())) {
          setReturnDate(toInputDate(dropoff));
          setReturnTime(format(dropoff, "HH:mm"));
        }
      }
      if (preselectLocation) setLocation(preselectLocation);

      const cleanParams = new URLSearchParams(params);
      cleanParams.delete("carId");
      cleanParams.delete("pickupAt");
      cleanParams.delete("returnAt");
      cleanParams.delete("location");
      const clean = `${window.location.pathname}${cleanParams.toString() ? `?${cleanParams.toString()}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", clean);
    }

    void loadSession();
    void getCars().then(setCars).catch(() => setCars([]));
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
    if (!location.trim() || location.trim().length < 2) {
      setLocationSuggestions([]);
      return;
    }
    if (!placesAutocompleteRef.current) return;

    if (locationDebounceRef.current) {
      window.clearTimeout(locationDebounceRef.current);
    }

    locationDebounceRef.current = window.setTimeout(() => {
      placesAutocompleteRef.current.getPlacePredictions(
        { input: location, language: "th", region: "th" },
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
      if (locationDebounceRef.current) {
        window.clearTimeout(locationDebounceRef.current);
      }
    };
  }, [location, showLocationSuggestions]);

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
        setMapPickerError("Unable to load Google Map. Please check PUBLIC_GOOGLE_MAPS_API_KEY.");
      }
    })();

    return () => {
      mounted = false;
      clickListener?.remove();
      if (marker) marker.setMap(null);
    };
  }, [mapPickerOpen, mapPoint]);

  useEffect(() => {
    if (returnDate < pickupDate) {
      setReturnDate(pickupDate);
    }
  }, [pickupDate, returnDate]);

  useEffect(() => {
    if (pickupDate !== returnDate) return;
    if (returnTimeOptions.length === 0) return;
    if (returnTime <= pickupTime) {
      setReturnTime(returnTimeOptions[0]);
    }
  }, [pickupDate, pickupTime, returnDate, returnTime, returnTimeOptions]);

  const applyPreset = (preset: "today" | "tomorrow" | "weekend" | "next3days") => {
    const now = new Date();
    let startDate = new Date(now);
    let endDate = new Date(now);
    let startTime = "09:00";
    let endTime = "18:00";

    if (preset === "today") {
      if (now.getHours() >= 17) {
        startDate = addDays(now, 1);
        endDate = addDays(now, 1);
      }
    } else if (preset === "tomorrow") {
      startDate = addDays(now, 1);
      endDate = addDays(now, 1);
    } else if (preset === "weekend") {
      startDate = nextSaturday(now);
      endDate = addDays(startDate, 1);
    } else {
      startDate = addDays(now, 1);
      endDate = addDays(startDate, 3);
    }

    setPickupDate(toInputDate(startDate));
    setPickupTime(startTime);
    setReturnDate(toInputDate(endDate));
    setReturnTime(endTime);
    setNotice("");
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setNotice("This browser does not support geolocation.");
      return;
    }

    setLocationLoading(true);
    setNotice("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setMapPoint(point);

        try {
          const resolvedAddress = await reverseGeocodeWithGoogle(point);
          setLocation(resolvedAddress ?? `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`);
        } catch {
          setLocation(`${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`);
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationLoading(false);
        setNotice("Location permission denied or unavailable.");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
      },
    );
  };

  const handleConfirmMapPicker = async () => {
    if (!mapPoint) {
      setMapPickerError("Please click a point on the map first.");
      return;
    }

    const resolvedAddress = await reverseGeocodeWithGoogle(mapPoint);
    setLocation(resolvedAddress ?? `${mapPoint.lat.toFixed(6)}, ${mapPoint.lng.toFixed(6)}`);
    setMapPickerOpen(false);
    setMapPickerError("");
  };

  const handleSearchClick = async () => {
    const pickup = new Date(pickupAt);
    const dropoff = new Date(returnAt);
    const nextErrors: { location?: string; pickup?: string; dropoff?: string } = {};

    if (!location.trim()) nextErrors.location = "Please enter location.";
    if (!pickupAt) nextErrors.pickup = "Please select pickup date/time.";
    if (!returnAt) nextErrors.dropoff = "Please select drop-off date/time.";
    if (Number.isNaN(pickup.getTime()) || Number.isNaN(dropoff.getTime())) {
      if (!nextErrors.pickup) nextErrors.pickup = "Invalid pickup date/time.";
      if (!nextErrors.dropoff) nextErrors.dropoff = "Invalid drop-off date/time.";
    }
    if (pickup < new Date()) {
      nextErrors.pickup = "Pickup date cannot be in the past.";
    }
    if (dropoff <= pickup) {
      nextErrors.dropoff = "Drop-off must be after pickup.";
    }
    if (!nextErrors.dropoff && rentalDurationHours < 1) {
      nextErrors.dropoff = "Minimum rental duration is 1 hour.";
    }
    if (!nextErrors.dropoff && rentalDurationHours > 24 * 30) {
      nextErrors.dropoff = "Maximum rental duration is 30 days.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setSearchErrors(nextErrors);
      setNotice("");
      return;
    }

    setSearching(true);
    setSearched(true);
    setNotice("");
    setSearchErrors({});
    setSelectedCarId("");

    try {
      const available = await getAvailableCars({ from: pickup, to: dropoff });
      setSearchResults(decorateSearchCars(available));
      window.setTimeout(() => {
        document.getElementById("search-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (error) {
      const message = error instanceof ApiError ? error.code : "Failed to search available cars";
      setNotice(message);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCar = (carId: string) => {
    setSelectedCarId(carId);
  };

  const buildCarDetailHref = (carId: string) => {
    const params = new URLSearchParams();
    if (location.trim()) params.set("location", location.trim());
    if (pickupAt) params.set("pickupAt", pickupAt);
    if (returnAt) params.set("returnAt", returnAt);
    return `/cars/${carId}${params.toString() ? `?${params.toString()}` : ""}`;
  };

  const handleSignOut = async () => {
    await logout().catch(() => null);
    setUser(null);
    setAuthState("guest");
    setShowPlanner(false);
  };

  if (authState === "loading") {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center p-6">
        <p className="text-sm text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-7 sm:px-6">
        <header className="flex items-center justify-between gap-3">
          <a href="/" className="text-lg font-black tracking-tight text-blue-600">ChaoLoey</a>

          <nav className="hidden items-center gap-7 text-sm text-slate-700 lg:flex">
            <a href="#" className="hover:text-slate-900">Become a renter</a>
            <a href="#deals" className="hover:text-slate-900">Rental deals</a>
            <a href="#how" className="hover:text-slate-900">How it work</a>
            <a href="#why" className="hover:text-slate-900">Why choose us</a>
          </nav>

          <div className="flex items-center gap-2">
            {!isAuthenticated && (
              <>
                <a href="/signin" className="rounded-lg px-4 py-2 text-sm text-slate-700 hover:bg-white">Sign in</a>
                <a href="/signup" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Sign up</a>
              </>
            )}
            {isAuthenticated && (
              <>
                <span className="hidden text-sm text-slate-600 sm:inline">{user?.name}</span>
                {user?.role === "admin" && (
                  <a href="/admin" className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100">
                    Dashboard
                  </a>
                )}
                <button type="button" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" onClick={() => setShowPlanner((v) => !v)}>
                  {showPlanner ? "Hide planner" : "Open planner"}
                </button>
                <button type="button" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => void handleSignOut()}>
                  Sign out
                </button>
              </>
            )}
          </div>
        </header>

        <section className="relative mt-4 overflow-hidden rounded-[28px] bg-white px-6 pb-6 pt-8 shadow-xl shadow-slate-200/70 sm:px-10">
          <div className="absolute -right-16 -top-20 h-[430px] w-[430px] rounded-full bg-blue-50" />
          <div className="absolute -right-4 top-14 h-[300px] w-[300px] rounded-full border border-blue-100" />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr,1.2fr]">
            <div>
              <h1 className="text-[40px] font-black leading-[1.05] sm:text-[56px]">
                Find, book and
                <br />
                rent a car <span className="text-blue-600">Easily</span>
              </h1>
            </div>

            <div>
              <img
                src="https://pngimg.com/d/porsche_PNG10606.png"
                alt="Blue sports car"
                className="mx-auto w-full max-w-[760px] object-contain"
              />
            </div>
          </div>

          <div className="relative mt-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-lg shadow-slate-200/70">
            <div className="grid gap-2 md:grid-cols-[1.2fr,1fr,1fr,170px] md:items-center">
              <label className="flex items-center gap-3 rounded-xl px-3 py-2 md:border-r md:border-slate-200">
                <span className="text-slate-400">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Z" />
                    <circle cx="12" cy="10" r="2.8" />
                  </svg>
                </span>
                <span className="relative block w-full">
                  <span className="block text-[15px] font-semibold text-slate-700">Location</span>
                  <input
                    ref={locationInputRef}
                    type="text"
                    placeholder="Search your location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onFocus={() => setShowLocationSuggestions(true)}
                    onBlur={() => {
                      window.setTimeout(() => setShowLocationSuggestions(false), 150);
                    }}
                    className="w-full bg-transparent text-sm text-slate-500 outline-none placeholder:text-slate-400"
                  />
                  {showLocationSuggestions && locationSuggestions.length > 0 && (
                    <ul className="absolute left-0 right-0 top-[54px] z-20 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                      {locationSuggestions.map((item) => (
                        <li key={item.placeId}>
                          <button
                            type="button"
                            className="w-full rounded-md px-2 py-2 text-left text-xs text-slate-700 hover:bg-blue-50"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setLocation(item.description);
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
                  <span className="mt-1 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={locationLoading}
                    >
                      {locationLoading ? "Locating..." : "Use current location"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!GOOGLE_MAPS_API_KEY) {
                          setNotice("Missing PUBLIC_GOOGLE_MAPS_API_KEY. Add it to .env to enable Google Map picker.");
                          return;
                        }
                        setMapPickerOpen(true);
                      }}
                      className="rounded-md border border-blue-200 px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
                    >
                      Pick on Google Map
                    </button>
                  </span>
                  {searchErrors.location && <span className="mt-1 block text-xs font-medium text-rose-600">{searchErrors.location}</span>}
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-xl px-3 py-2 md:border-r md:border-slate-200">
                <span className="text-slate-400">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4M8 3v4M3 10h18" />
                  </svg>
                </span>
                <span className="block w-full">
                  <span className="block text-[15px] font-semibold text-slate-700">Pickup date</span>
                  <span className="mt-1 flex gap-2">
                    <input
                      type="date"
                      value={pickupDate}
                      min={todayInput}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-600 outline-none focus:border-blue-300"
                    />
                    <select
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-600 outline-none focus:border-blue-300"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={`pickup-${time}`} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </span>
                  {searchErrors.pickup && <span className="mt-1 block text-xs font-medium text-rose-600">{searchErrors.pickup}</span>}
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-xl px-3 py-2 md:border-r md:border-slate-200">
                <span className="text-slate-400">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4M8 3v4M3 10h18" />
                  </svg>
                </span>
                <span className="block w-full">
                  <span className="block text-[15px] font-semibold text-slate-700">Return date</span>
                  <span className="mt-1 flex gap-2">
                    <input
                      type="date"
                      value={returnDate}
                      min={pickupDate > todayInput ? pickupDate : todayInput}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-600 outline-none focus:border-blue-300"
                    />
                    <select
                      value={returnTime}
                      onChange={(e) => setReturnTime(e.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-600 outline-none focus:border-blue-300"
                    >
                      {returnTimeOptions.map((time) => (
                        <option key={`return-${time}`} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </span>
                  {searchErrors.dropoff && <span className="mt-1 block text-xs font-medium text-rose-600">{searchErrors.dropoff}</span>}
                </span>
              </label>

              <button
                type="button"
                className="h-12 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                onClick={handleSearchClick}
                disabled={searching}
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => applyPreset("today")} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700">Today</button>
            <button type="button" onClick={() => applyPreset("tomorrow")} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700">Tomorrow</button>
            <button type="button" onClick={() => applyPreset("weekend")} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700">This weekend</button>
            <button type="button" onClick={() => applyPreset("next3days")} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700">Next 3 days</button>
          </div>

          <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-slate-700">
            <p>
              Duration: <span className="font-semibold">{rentalDurationHours > 0 ? `${rentalDurationHours.toFixed(1)} hours` : "-"}</span>
              {" Â· "}
              Estimated total: <span className="font-semibold">{estimatedTotal > 0 ? `${estimatedTotal.toLocaleString()} Baht` : "-"}</span>
              {" Â· "}
              Timezone: <span className="font-semibold">Asia/Bangkok</span>
            </p>
          </div>

          {notice && <p className="mt-3 text-sm font-medium text-blue-700">{notice}</p>}
        </section>

        {searched && (
          <section id="search-results" className="mt-12 rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/70 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-3xl font-bold">Search Results</h2>
            <p className="text-sm text-slate-500">
              {searched ? `${visibleResults.length} cars found` : "Enter location and dates to search available cars"}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <label className="text-xs font-semibold text-slate-500">
              PRICE
              <select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value as typeof priceFilter)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <option value="all">All prices</option>
                <option value="under-2000">Under 2,000 Baht</option>
                <option value="2000-3000">2,000 - 3,000 Baht</option>
                <option value="above-3000">Above 3,000 Baht</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">
              TYPE
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <option value="all">All types</option>
                <option value="SUV">SUV</option>
                <option value="Sedan">Sedan</option>
                <option value="Sport">Sport</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">
              BRAND
              <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <option value="all">All brands</option>
                {brandsInResults.map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">
              TRANSMISSION
              <select value={transmissionFilter} onChange={(e) => setTransmissionFilter(e.target.value as typeof transmissionFilter)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <option value="all">All</option>
                <option value="Auto">Auto</option>
                <option value="Manual">Manual</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">
              FUEL
              <select value={fuelFilter} onChange={(e) => setFuelFilter(e.target.value as typeof fuelFilter)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <option value="all">All</option>
                <option value="Petrol">Petrol</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Diesel">Diesel</option>
                <option value="Electric">Electric</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">
              SORT
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SearchSort)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <option value="popular">Popular</option>
                <option value="price-asc">Price: low to high</option>
                <option value="rating">Rating</option>
              </select>
            </label>
          </div>

          {!searched && <p className="mt-6 text-sm text-slate-500">Search results will appear here.</p>}
          {searched && visibleResults.length === 0 && <p className="mt-6 text-sm text-slate-500">No available cars found for this search.</p>}

          {visibleResults.length > 0 && (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleResults.map((car) => (
                <article key={car.id} className={`rounded-2xl border p-4 shadow-sm transition ${selectedCarId === car.id ? "border-blue-500 bg-blue-50/40" : "border-slate-200 bg-white"}`}>
                  <div className="flex h-32 w-full items-center justify-center rounded-lg bg-slate-50 p-2">
                    <img src={car.image} alt={car.name} className="h-full w-full object-contain" />
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{car.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{car.brand} Â· {car.type} Â· {car.seats} seats</p>
                  <p className="text-sm text-slate-500">{car.transmission} Â· {car.fuel} Â· â­ {car.rating.toFixed(1)}</p>
                  <p className="mt-3 text-xl font-bold">{car.pricePerDay.toLocaleString()} Baht <span className="text-sm font-medium text-slate-500">/ day</span></p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => handleSelectCar(car.id)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${selectedCarId === car.id ? "bg-blue-700 text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                      {selectedCarId === car.id ? "Selected" : "Select this car"}
                    </button>
                    <a href={buildCarDetailHref(car.id)} className="rounded-lg border border-blue-200 px-4 py-2 text-center text-sm font-semibold text-blue-700 hover:bg-blue-50">
                      View detail
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}

          {selectedCarId && (
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                Selected car: <span className="font-semibold">{visibleResults.find((item) => item.id === selectedCarId)?.name ?? "1 car selected"}</span>
              </p>
              <a href={buildCarDetailHref(selectedCarId)} className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Continue to car detail
              </a>
            </div>
          )}
          </section>
        )}

        <section id="how" className="mt-16 text-center">
          <span className="rounded-full bg-blue-50 px-4 py-1 text-xs font-semibold text-blue-600">HOW IT WORK</span>
          <h2 className="mt-4 text-4xl font-bold">Rent with following 3 working steps</h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <article className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">1</div>
              <h3 className="mt-4 text-lg font-semibold">Choose location</h3>
              <p className="mt-2 text-sm text-slate-500">Choose your preferred location and find your best car.</p>
            </article>
            <article className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">2</div>
              <h3 className="mt-4 text-lg font-semibold">Pick-up date</h3>
              <p className="mt-2 text-sm text-slate-500">Select date and time to book your rental car.</p>
            </article>
            <article className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">3</div>
              <h3 className="mt-4 text-lg font-semibold">Book your car</h3>
              <p className="mt-2 text-sm text-slate-500">Confirm your reservation and we will deliver it quickly.</p>
            </article>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-2 gap-4 text-center text-3xl font-black tracking-[0.24em] text-slate-400 md:grid-cols-6">
          {BRAND_NAMES.map((brand) => (
            <p key={brand}>{brand}</p>
          ))}
        </section>

        <section id="why" className="mt-16 grid items-center gap-8 lg:grid-cols-2">
          <div>
            <img
              src="https://images.pexels.com/photos/1335077/pexels-photo-1335077.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt="White sports car"
              className="w-full rounded-3xl object-cover shadow-lg"
            />
          </div>
          <div>
            <span className="rounded-full bg-blue-50 px-4 py-1 text-xs font-semibold text-blue-600">WHY CHOOSE US</span>
            <h2 className="mt-4 text-4xl font-bold leading-tight">We offer the best experience with our rental deals</h2>
            <ul className="mt-6 space-y-4 text-sm text-slate-600">
              <li className="rounded-xl bg-white p-4 shadow-sm"><strong className="text-slate-900">Best price guaranteed</strong><br />Find a lower price? We will refund you 100% of the difference.</li>
              <li className="rounded-xl bg-white p-4 shadow-sm"><strong className="text-slate-900">Experienced drivers</strong><br />Our network includes reliable and professional partners.</li>
              <li className="rounded-xl bg-white p-4 shadow-sm"><strong className="text-slate-900">24 hour delivery</strong><br />Book anytime and we can deliver a car to your location.</li>
              <li className="rounded-xl bg-white p-4 shadow-sm"><strong className="text-slate-900">24/7 technical support</strong><br />Get support anytime when you have questions or issues.</li>
            </ul>
          </div>
        </section>

        <section id="deals" className="mt-16 text-center">
          <span className="rounded-full bg-blue-50 px-4 py-1 text-xs font-semibold text-blue-600">POPULAR RENTAL DEALS</span>
          <h2 className="mt-4 text-4xl font-bold">Most popular cars rental deals</h2>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {deals.map((deal) => (
              <article key={deal.id} className="rounded-2xl bg-white p-4 text-left shadow-lg shadow-slate-200/70">
                <div className="flex h-32 w-full items-center justify-center rounded-lg bg-slate-50 p-2">
                  <img src={deal.image} alt={deal.name} className="h-full w-full object-contain" />
                </div>
                <h3 className="mt-3 text-base font-semibold">{deal.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{deal.seats} seats Â· {deal.transmission} Â· {deal.fuel}</p>
                <p className="mt-4 text-sm text-slate-500">Price</p>
                <p className="text-xl font-bold">{deal.pricePerDay.toLocaleString()} Baht <span className="text-sm font-medium text-slate-500">/ day</span></p>
                <a href={buildCarDetailHref(deal.id)} className="mt-4 block w-full rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700">
                  Rent now
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 text-center">
          <span className="rounded-full bg-blue-50 px-4 py-1 text-xs font-semibold text-blue-600">TESTIMONIALS</span>
          <h2 className="mt-4 text-4xl font-bold">What people say about us?</h2>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((item) => (
              <article key={item.name} className="overflow-hidden rounded-2xl bg-white text-left shadow-lg shadow-slate-200/70">
                <img src={item.image} alt={item.name} className="h-44 w-full object-cover" />
                <div className="p-4">
                  <p className="text-3xl font-bold">{item.stars.toFixed(1)} <span className="text-sm font-medium text-slate-500">stars</span></p>
                  <p className="mt-2 text-sm text-slate-600">{item.text}</p>
                  <p className="mt-3 font-semibold">{item.name}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="mt-10 rounded-t-3xl bg-[#031b42] px-6 py-10 text-slate-200">
          <div className="grid gap-6 md:grid-cols-5">
            <div>
              <p className="text-lg font-black text-white">ChaoLoey</p>
              <p className="mt-3 text-sm">25566 H0, London</p>
              <p className="text-sm">+1 (000) 4747 212</p>
              <p className="text-sm">contact@chaoloey.com</p>
            </div>
            <div>
              <p className="font-semibold text-white">Our Product</p>
              <p className="mt-2 text-sm">Career</p>
              <p className="text-sm">Cars</p>
              <p className="text-sm">Packages</p>
            </div>
            <div>
              <p className="font-semibold text-white">Resources</p>
              <p className="mt-2 text-sm">Download</p>
              <p className="text-sm">Help Center</p>
              <p className="text-sm">Guides</p>
            </div>
            <div>
              <p className="font-semibold text-white">About ChaoLoey</p>
              <p className="mt-2 text-sm">Why choose us</p>
              <p className="text-sm">Investor Relations</p>
              <p className="text-sm">Press Center</p>
            </div>
            <div>
              <p className="font-semibold text-white">Follow Us</p>
              <p className="mt-2 text-sm">Facebook</p>
              <p className="text-sm">Instagram</p>
              <p className="text-sm">YouTube</p>
            </div>
          </div>
          <p className="mt-8 text-xs text-slate-400">Copyright 2023 - ChaoLoey. All rights reserved.</p>
        </footer>

        {isAuthenticated && showPlanner && (
          <section id="planner" className="mt-8 rounded-2xl border border-slate-200 bg-white py-4 shadow-lg shadow-slate-200/70">
            <BookingCalendar initialCarId={plannerCarId} />
          </section>
        )}

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
      </div>
    </main>
  );
}




