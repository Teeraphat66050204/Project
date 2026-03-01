"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LinkButton } from "@/components/ui/Button";

type Me = { email: string; name: string; role: "admin" | "member" } | null;

export default function Navbar() {
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => setMe(b?.data ?? null))
      .catch(() => setMe(null));
  }, []);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#1F2937]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-5 text-[#F9FAFB]">
        <Link href="/" className="text-2xl font-black">ChaoLoey</Link>
        <nav className="ml-auto flex items-center gap-5 text-base text-white/75">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/search" className="hover:text-white">Search</Link>
          <Link href="/account" className="hover:text-white">Account</Link>
          {me?.role === "admin" && <Link href="/admin" className="text-[#F59E0B]">Admin</Link>}
        </nav>

        {!me ? (
          <div className="ml-auto flex items-center gap-2">
            <LinkButton href="/signin" variant="ghost" className="px-4 py-2.5 text-base">Sign in</LinkButton>
            <LinkButton href="/signup" variant="primary" className="px-5 py-2.5 text-base">Sign up</LinkButton>
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-2">
            <LinkButton href="/account" variant="ghost" className="px-4 py-2.5 text-sm" title={me.email}>
              Signed in: {me.name}
            </LinkButton>
            <button onClick={signOut} className="btn-base btn-outline px-5 py-2.5 text-base">Sign out</button>
          </div>
        )}
      </div>
    </header>
  );
}
