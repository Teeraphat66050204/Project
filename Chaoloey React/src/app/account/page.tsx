"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { BookingCalendar } from "@/components/islands/BookingCalendar";

type Rental = {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  car: { name: string } | null;
};

type Me = {
  name: string;
  email: string;
  role: "admin" | "member";
};

export default function AccountPage() {
  const [rows, setRows] = useState<Rental[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    const res = await fetch("/api/rentals", { credentials: "include" });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.ok) {
      setError(body?.error || "UNAUTHORIZED");
      return;
    }
    setRows(body.data || []);
  };

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => setMe(body?.data ?? null))
      .catch(() => setMe(null));
    load().catch(() => setError("FAILED_TO_LOAD"));
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-black">My bookings</h1>
      <Card className="mt-4 p-4">
        {me ? (
          <p className="text-sm text-white/80">
            Signed in as <span className="font-semibold text-white">{me.name}</span> ({me.email})
          </p>
        ) : (
          <p className="text-sm text-red-400">Not signed in.</p>
        )}
      </Card>
      {error ? <p className="mt-4 text-red-400">{error}</p> : null}
      <div className="mt-6 space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="p-4">
            <p className="font-semibold">{r.id} · {r.car?.name || "-"}</p>
            <p className="text-sm text-white/70">{new Date(r.startTime).toLocaleString()} - {new Date(r.endTime).toLocaleString()}</p>
            <p className="text-sm text-[#F59E0B]">{r.status}</p>
          </Card>
        ))}
        {!rows.length && !error ? (
          <Card className="p-6 text-center">
            <p className="text-white/70">No bookings yet.</p>
            <div className="mt-4"><a href="/search" className="btn-primary">Search cars</a></div>
          </Card>
        ) : null}
      </div>

      <section className="mt-8">
        <h2 className="text-2xl font-black">Booking Planner</h2>
        <p className="mt-1 text-sm text-white/70">Calendar and timeline view (migrated from Astro).</p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white">
          <BookingCalendar />
        </div>
      </section>
    </main>
  );
}
