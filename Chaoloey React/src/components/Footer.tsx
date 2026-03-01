"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";
import Link from "next/link";

export default function Footer() {
  const { lang } = useLanguage();
  const t = lang === "th"
    ? {
        tagline: "\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23\u0e40\u0e0a\u0e48\u0e32\u0e23\u0e16\u0e1e\u0e23\u0e35\u0e40\u0e21\u0e35\u0e22\u0e21 \u0e08\u0e2d\u0e07\u0e44\u0e27 \u0e41\u0e25\u0e30\u0e23\u0e32\u0e04\u0e32\u0e0a\u0e31\u0e14\u0e40\u0e08\u0e19",
        company: "\u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17",
        support: "\u0e0a\u0e48\u0e27\u0e22\u0e40\u0e2b\u0e25\u0e37\u0e2d",
        legal: "\u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22",
        home: "\u0e2b\u0e19\u0e49\u0e32\u0e41\u0e23\u0e01",
        search: "\u0e04\u0e49\u0e19\u0e2b\u0e32",
        account: "\u0e1a\u0e31\u0e0d\u0e0a\u0e35",
        schedule: "\u0e17\u0e38\u0e01\u0e27\u0e31\u0e19 08:00 - 22:00",
        terms: "\u0e02\u0e49\u0e2d\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e01\u0e32\u0e23\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19",
        privacy: "\u0e19\u0e42\u0e22\u0e1a\u0e32\u0e22\u0e04\u0e27\u0e32\u0e21\u0e40\u0e1b\u0e47\u0e19\u0e2a\u0e48\u0e27\u0e19\u0e15\u0e31\u0e27",
        cancel: "\u0e19\u0e42\u0e22\u0e1a\u0e32\u0e22\u0e01\u0e32\u0e23\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01",
      }
    : {
        tagline: "Premium car rental with fast booking flow and transparent pricing.",
        company: "Company",
        support: "Support",
        legal: "Legal",
        home: "Home",
        search: "Search",
        account: "Account",
        schedule: "Mon-Sun 08:00 - 22:00",
        terms: "Terms of Service",
        privacy: "Privacy Policy",
        cancel: "Cancellation Policy",
      };

  return (
    <footer className="mt-16 border-t border-white/10 bg-[#1F2937]/70">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-white/70 md:grid-cols-4">
        <div>
          <p className="text-lg font-black text-white">ChaoLoey</p>
          <p className="mt-2">{t.tagline}</p>
        </div>
        <div>
          <p className="font-semibold text-white">{t.company}</p>
          <ul className="mt-2 space-y-1">
            <li><Link href="/" className="hover:text-white">{t.home}</Link></li>
            <li><Link href="/search" className="hover:text-white">{t.search}</Link></li>
            <li><Link href="/account" className="hover:text-white">{t.account}</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">{t.support}</p>
          <ul className="mt-2 space-y-1">
            <li>help@chaoloey.com</li>
            <li>+66 2 000 0000</li>
            <li>{t.schedule}</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">{t.legal}</p>
          <ul className="mt-2 space-y-1">
            <li>{t.terms}</li>
            <li>{t.privacy}</li>
            <li>{t.cancel}</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

