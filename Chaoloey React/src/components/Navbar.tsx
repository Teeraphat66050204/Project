"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LinkButton } from "@/components/ui/Button";
import { useLanguage } from "@/components/providers/LanguageProvider";

type Me = { email: string; name: string; role: "admin" | "member" } | null;

const COPY = {
  en: {
    home: "Home",
    search: "Search",
    account: "Account",
    admin: "Admin",
    signIn: "Sign in",
    signUp: "Sign up",
    signedIn: "Signed in",
    signOut: "Sign out",
    switchLang: "ไทย",
    switchLangAria: "Switch language to Thai",
  },
  th: {
    home: "หน้าแรก",
    search: "ค้นหา",
    account: "บัญชี",
    admin: "ผู้ดูแล",
    signIn: "เข้าสู่ระบบ",
    signUp: "สมัครสมาชิก",
    signedIn: "ล็อกอินแล้ว",
    signOut: "ออกจากระบบ",
    switchLang: "EN",
    switchLangAria: "Switch language to English",
  },
} as const;

export default function Navbar() {
  const [me, setMe] = useState<Me>(null);
  const { lang, toggleLang } = useLanguage();

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

  const t = COPY[lang];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#1F2937]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-5 text-[#F9FAFB]">
        <Link href="/" className="text-2xl font-black">ChaoLoey</Link>
        <nav className="ml-auto flex items-center gap-5 text-base text-white/75">
          <Link href="/" className="hover:text-white">{t.home}</Link>
          <Link href="/search" className="hover:text-white">{t.search}</Link>
          <Link href="/account" className="hover:text-white">{t.account}</Link>
          {me?.role === "admin" && <Link href="/admin" className="text-[#F59E0B]">{t.admin}</Link>}
          <button
            type="button"
            onClick={toggleLang}
            aria-label={t.switchLangAria}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/90 transition hover:border-[#F59E0B]/50 hover:text-[#F59E0B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]/40"
          >
            {t.switchLang}
          </button>
        </nav>

        {!me ? (
          <div className="ml-auto flex items-center gap-2">
            <LinkButton href="/signin" variant="ghost" className="px-4 py-2.5 text-base">{t.signIn}</LinkButton>
            <LinkButton href="/signup" variant="primary" className="px-5 py-2.5 text-base">{t.signUp}</LinkButton>
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-2">
            <LinkButton href="/account" variant="ghost" className="px-4 py-2.5 text-sm" title={me.email}>
              {t.signedIn}: {me.name}
            </LinkButton>
            <button onClick={signOut} className="btn-base btn-outline px-5 py-2.5 text-base">{t.signOut}</button>
          </div>
        )}
      </div>
    </header>
  );
}
