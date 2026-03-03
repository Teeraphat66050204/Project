"use client";

import { useMemo, useState } from "react";
import { carCatalog, getCarFallbackImage } from "@/data/cars";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { FallbackImage } from "@/components/ui/FallbackImage";

const brandLogos = [
  { name: "HONDA", src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/honda.svg" },
  { name: "JAGUAR", src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/jaguar.svg" },
  { name: "NISSAN", src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/nissan.svg" },
  { name: "VOLVO", src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/volvo.svg" },
  { name: "AUDI", src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/audi.svg" },
  { name: "ACURA", src: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/acura.svg" },
];

function toLocalInputValue(date: Date) {
  const tzDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return tzDate.toISOString().slice(0, 16);
}

function roundUpToNextHour(date: Date) {
  const rounded = new Date(date);
  const hasFraction = rounded.getMinutes() > 0 || rounded.getSeconds() > 0 || rounded.getMilliseconds() > 0;
  if (hasFraction) {
    rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
  } else {
    rounded.setSeconds(0, 0);
  }
  return rounded;
}

export default function HomePage() {
  const { lang } = useLanguage();
  const now = new Date();
  const defaultPickup = roundUpToNextHour(new Date(now.getTime() + 2 * 60 * 60 * 1000));
  const defaultDropoff = new Date(defaultPickup.getTime() + 24 * 60 * 60 * 1000);

  const [location, setLocation] = useState("");
  const [pickup, setPickup] = useState(toLocalInputValue(defaultPickup));
  const [dropoff, setDropoff] = useState(toLocalInputValue(defaultDropoff));
  const [error, setError] = useState("");

  const t = lang === "th"
    ? {
        errorFill: "\u0e01\u0e23\u0e38\u0e13\u0e32\u0e01\u0e23\u0e2d\u0e01\u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48 \u0e27\u0e31\u0e19\u0e40\u0e27\u0e25\u0e32\u0e23\u0e31\u0e1a\u0e23\u0e16 \u0e41\u0e25\u0e30\u0e27\u0e31\u0e19\u0e40\u0e27\u0e25\u0e32\u0e04\u0e37\u0e19\u0e23\u0e16\u0e43\u0e2b\u0e49\u0e04\u0e23\u0e1a",
        errorPickupPast: "\u0e27\u0e31\u0e19\u0e40\u0e27\u0e25\u0e32\u0e23\u0e31\u0e1a\u0e23\u0e16\u0e15\u0e49\u0e2d\u0e07\u0e44\u0e21\u0e48\u0e40\u0e1b\u0e47\u0e19\u0e40\u0e27\u0e25\u0e32\u0e43\u0e19\u0e2d\u0e14\u0e35\u0e15",
        errorDropoff: "\u0e27\u0e31\u0e19\u0e40\u0e27\u0e25\u0e32\u0e04\u0e37\u0e19\u0e23\u0e16\u0e15\u0e49\u0e2d\u0e07\u0e2b\u0e25\u0e31\u0e07\u0e27\u0e31\u0e19\u0e40\u0e27\u0e25\u0e32\u0e23\u0e31\u0e1a\u0e23\u0e16",
        badge: "\u0e40\u0e0a\u0e48\u0e32\u0e23\u0e16\u0e1e\u0e23\u0e35\u0e40\u0e21\u0e35\u0e22\u0e21",
        title: "\u0e04\u0e49\u0e19\u0e2b\u0e32 \u0e08\u0e2d\u0e07 \u0e41\u0e25\u0e30\u0e40\u0e0a\u0e48\u0e32\u0e23\u0e16\u0e44\u0e14\u0e49\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e21\u0e31\u0e48\u0e19\u0e43\u0e08",
        subtitle: "ChaoLoey \u0e0a\u0e48\u0e27\u0e22\u0e04\u0e38\u0e13\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e23\u0e16\u0e1e\u0e23\u0e35\u0e40\u0e21\u0e35\u0e22\u0e21\u0e43\u0e19\u0e23\u0e32\u0e04\u0e32\u0e0a\u0e31\u0e14\u0e40\u0e08\u0e19 \u0e08\u0e2d\u0e07\u0e44\u0e14\u0e49\u0e43\u0e19\u0e44\u0e21\u0e48\u0e01\u0e35\u0e48\u0e19\u0e32\u0e17\u0e35 \u0e1e\u0e23\u0e49\u0e2d\u0e21\u0e1b\u0e23\u0e30\u0e2a\u0e1a\u0e01\u0e32\u0e23\u0e13\u0e4c\u0e17\u0e35\u0e48\u0e1b\u0e25\u0e2d\u0e14\u0e20\u0e31\u0e22\u0e41\u0e25\u0e30\u0e25\u0e37\u0e48\u0e19\u0e44\u0e2b\u0e25",
        startSearch: "\u0e40\u0e23\u0e34\u0e48\u0e21\u0e04\u0e49\u0e19\u0e2b\u0e32",
        browseCars: "\u0e14\u0e39\u0e23\u0e16\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14",
        featuredVideo: "\u0e27\u0e34\u0e14\u0e35\u0e42\u0e2d\u0e23\u0e16 BMW M4 \u0e40\u0e14\u0e48\u0e19\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e2b\u0e19\u0e49\u0e32",
        location: "\u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48",
        selectCity: "\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e40\u0e21\u0e37\u0e2d\u0e07",
        pickup: "\u0e27\u0e31\u0e19\u0e40\u0e27\u0e25\u0e32\u0e23\u0e31\u0e1a\u0e23\u0e16",
        dropoff: "\u0e27\u0e31\u0e19\u0e40\u0e27\u0e25\u0e32\u0e04\u0e37\u0e19\u0e23\u0e16",
        search: "\u0e04\u0e49\u0e19\u0e2b\u0e32",
        howItWorks: "\u0e27\u0e34\u0e18\u0e35\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19",
        stepsTitle: "\u0e40\u0e0a\u0e48\u0e32\u0e23\u0e16\u0e07\u0e48\u0e32\u0e22\u0e43\u0e19 3 \u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19",
        step1Title: "\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48",
        step1Text: "\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e40\u0e21\u0e37\u0e2d\u0e07\u0e41\u0e25\u0e30\u0e08\u0e38\u0e14\u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e23\u0e31\u0e1a\u0e23\u0e16",
        step2Title: "\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e27\u0e31\u0e19\u0e41\u0e25\u0e30\u0e40\u0e27\u0e25\u0e32",
        step2Text: "\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e27\u0e31\u0e19\u0e40\u0e27\u0e25\u0e32\u0e23\u0e31\u0e1a\u0e41\u0e25\u0e30\u0e04\u0e37\u0e19\u0e43\u0e2b\u0e49\u0e15\u0e23\u0e07\u0e41\u0e1c\u0e19\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13",
        step3Title: "\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e01\u0e32\u0e23\u0e08\u0e2d\u0e07",
        step3Text: "\u0e01\u0e23\u0e2d\u0e01\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14\u0e41\u0e25\u0e30\u0e0a\u0e33\u0e23\u0e30\u0e40\u0e07\u0e34\u0e19\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e1b\u0e25\u0e2d\u0e14\u0e20\u0e31\u0e22",
        popularBadge: "\u0e23\u0e16\u0e22\u0e2d\u0e14\u0e19\u0e34\u0e22\u0e21",
        popularTitle: "\u0e14\u0e35\u0e25\u0e40\u0e0a\u0e48\u0e32\u0e23\u0e16\u0e22\u0e2d\u0e14\u0e2e\u0e34\u0e15",
        perDay: "/ \u0e27\u0e31\u0e19",
        seats: "\u0e17\u0e35\u0e48\u0e19\u0e31\u0e48\u0e07",
        view: "\u0e14\u0e39\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14",
        rent: "\u0e40\u0e0a\u0e48\u0e32\u0e17\u0e31\u0e19\u0e17\u0e35",
        reviewsBadge: "\u0e23\u0e35\u0e27\u0e34\u0e27\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32",
        reviewsTitle: "\u0e40\u0e2a\u0e35\u0e22\u0e07\u0e08\u0e32\u0e01\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23",
      }
    : {
        errorFill: "Please fill location, pick-up date/time, and drop-off date/time.",
        errorPickupPast: "Pick-up date/time cannot be in the past.",
        errorDropoff: "Drop-off must be later than pick-up.",
        badge: "Dark Premium Rental",
        title: "Find, book and rent a car with confidence",
        subtitle: "ChaoLoey helps you discover premium cars at transparent prices. Reserve in minutes and drive with a smooth, secure experience.",
        startSearch: "Start searching",
        browseCars: "Browse all cars",
        featuredVideo: "Featured BMW M4 cinematic video",
        location: "Location",
        selectCity: "Select city",
        pickup: "Pick-up date & time",
        dropoff: "Drop-off date & time",
        search: "Search",
        howItWorks: "How it works",
        stepsTitle: "Rent with 3 quick steps",
        step1Title: "Choose location",
        step1Text: "Pick your city and where you want to receive the car.",
        step2Title: "Select date & time",
        step2Text: "Set pickup and drop-off schedule that fits your plan.",
        step3Title: "Confirm booking",
        step3Text: "Complete booking details and proceed to secure payment.",
        popularBadge: "Popular cars",
        popularTitle: "Most popular rental deals",
        perDay: "/ day",
        seats: "seats",
        view: "View details",
        rent: "Rent now",
        reviewsBadge: "Testimonials",
        reviewsTitle: "What customers say",
      };

  const popularCars = useMemo(() => carCatalog.slice(0, 6), []);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    const pickupDate = new Date(pickup);
    const dropoffDate = new Date(dropoff);
    if (!location || !pickup || !dropoff) {
      event.preventDefault();
      setError(t.errorFill);
      return;
    }
    if (pickupDate < new Date()) {
      event.preventDefault();
      setError(t.errorPickupPast);
      return;
    }
    if (dropoffDate <= pickupDate) {
      event.preventDefault();
      setError(t.errorDropoff);
      return;
    }
    setError("");
  };

  return (
    <main id="main-content">
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-10 pt-10 sm:px-6 lg:grid-cols-2 lg:items-center lg:pt-14">
        <div>
          <span className="badge border-[#F59E0B]/70 text-[#F59E0B]">{t.badge}</span>
          <h1 className="mt-5 text-4xl font-black leading-tight text-[#F9FAFB] sm:text-5xl">{t.title}</h1>
          <p className="mt-4 max-w-xl text-base text-[rgba(249,250,251,0.70)] sm:text-lg">{t.subtitle}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#search-form" className="btn-base btn-primary px-6 py-3">{t.startSearch}</a>
            <a href="/search" className="btn-base btn-outline px-6 py-3">{t.browseCars}</a>
          </div>
        </div>

        <section className="card-premium relative overflow-hidden p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-[#F59E0B]/20 via-transparent to-[#EF4444]/20" />
          <div className="relative h-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
            <video className="h-full w-full object-cover" autoPlay muted loop playsInline preload="metadata" aria-label={t.featuredVideo}>
              <source src="/media/hero-bmw-m4.mp4" type="video/mp4" />
            </video>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#111827]/85 to-transparent" />
          </div>
        </section>
      </section>

      <section id="search-form" className="mx-auto w-full max-w-7xl px-4 pb-4 sm:px-6">
        <section className="card-premium p-5 sm:p-6">
          <form action="/search" method="GET" className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1fr_auto]" onSubmit={onSubmit}>
            <div>
              <label htmlFor="location" className="mb-2 block text-sm font-semibold">{t.location}</label>
              <select id="location" name="location" value={location} onChange={(e) => setLocation(e.target.value)} className="input-premium" required>
                <option value="">{t.selectCity}</option>
                <option value="Bangkok">Bangkok</option>
                <option value="Chiang Mai">Chiang Mai</option>
                <option value="Phuket">Phuket</option>
                <option value="Pattaya">Pattaya</option>
              </select>
            </div>
            <div>
              <label htmlFor="pickup" className="mb-2 block text-sm font-semibold">{t.pickup}</label>
              <input id="pickup" name="pickup" type="datetime-local" value={pickup} min={toLocalInputValue(new Date())} onChange={(e) => setPickup(e.target.value)} className="input-premium" required />
            </div>
            <div>
              <label htmlFor="dropoff" className="mb-2 block text-sm font-semibold">{t.dropoff}</label>
              <input id="dropoff" name="dropoff" type="datetime-local" value={dropoff} min={pickup} onChange={(e) => setDropoff(e.target.value)} className="input-premium" required />
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-base btn-primary w-full px-5 py-3">{t.search}</button>
            </div>
            {error ? <p className="status-banner lg:col-span-4">{error}</p> : null}
          </form>
        </section>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-4 pt-10 sm:px-6">
        <div className="text-center">
          <span className="badge border-[#F59E0B]/70 text-[#F59E0B]">{t.howItWorks}</span>
          <h2 className="mt-3 text-3xl font-black">{t.stepsTitle}</h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="card-premium p-6"><p className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F59E0B] font-bold text-[#111827]">1</p><h3 className="mt-4 text-xl font-bold">{t.step1Title}</h3><p className="mt-2 text-sm text-[rgba(249,250,251,0.70)]">{t.step1Text}</p></article>
          <article className="card-premium p-6"><p className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F59E0B] font-bold text-[#111827]">2</p><h3 className="mt-4 text-xl font-bold">{t.step2Title}</h3><p className="mt-2 text-sm text-[rgba(249,250,251,0.70)]">{t.step2Text}</p></article>
          <article className="card-premium p-6"><p className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F59E0B] font-bold text-[#111827]">3</p><h3 className="mt-4 text-xl font-bold">{t.step3Title}</h3><p className="mt-2 text-sm text-[rgba(249,250,251,0.70)]">{t.step3Text}</p></article>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-4 pt-8 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {brandLogos.map((brand) => (
            <div key={brand.name} className="card-premium relative flex items-end justify-center overflow-hidden py-4">
              <img src={brand.src} alt="" aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 opacity-20 [filter:brightness(0)_invert(1)]" loading="lazy" />
              <p className="relative z-10 text-base font-black tracking-[0.24em] text-[rgba(249,250,251,0.60)]">{brand.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-4 pt-10 sm:px-6">
        <div>
          <span className="badge border-[#F59E0B]/70 text-[#F59E0B]">{t.popularBadge}</span>
          <h2 className="mt-3 text-3xl font-black">{t.popularTitle}</h2>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {popularCars.map((car) => (
            <article key={car.id} className="card-premium p-4">
              <FallbackImage
                src={car.image}
                fallbackSrc={getCarFallbackImage(car.id)}
                alt={car.name}
                className="h-44 w-full rounded-xl border border-white/10 object-cover"
              />
              <p className="mt-3 text-xs uppercase tracking-wide text-white/60">{car.brand} - {car.type}</p>
              <h3 className="mt-1 text-3xl font-bold">{car.name}</h3>
              <p className="mt-2 text-xl font-bold text-[#F59E0B]">{car.pricePerDay.toLocaleString()} THB <span className="text-base font-medium text-white/70">{t.perDay}</span></p>
              <p className="mt-2 text-sm text-white/70">{car.seats} {t.seats} - {car.gear} - {car.fuel} - {car.rating.toFixed(1)}★</p>
              <div className="mt-4 flex gap-2">
                <a href="/search" className="btn-base btn-outline flex-1">{t.view}</a>
                <a href="/search" className="btn-base btn-primary flex-1">{t.rent}</a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6">
        <div className="text-center">
          <span className="badge border-[#F59E0B]/70 text-[#F59E0B]">{t.reviewsBadge}</span>
          <h2 className="mt-3 text-3xl font-black">{t.reviewsTitle}</h2>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {[{ name: "Charlie Johnson", rating: "5.0", text: "Reservation was quick and the car arrived spotless. Great premium service." }, { name: "Emily Wilson", rating: "4.8", text: "Pricing is clear and the booking process is very smooth from start to finish." }, { name: "David Lee", rating: "4.9", text: "Excellent support and excellent car condition. Will definitely rent again." }].map((item) => (
            <article key={item.name} className="card-premium p-6">
              <span className="badge border-[#F59E0B]/70 text-[#F59E0B]">★ {item.rating}</span>
              <p className="mt-4 text-sm text-[rgba(249,250,251,0.78)]">{item.text}</p>
              <p className="mt-4 font-semibold">{item.name}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
