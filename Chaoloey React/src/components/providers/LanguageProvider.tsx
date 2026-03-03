"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, type Language } from "@/lib/i18n";

type LanguageContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function persistLanguage(lang: Language) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LANGUAGE_COOKIE, lang);
  document.documentElement.lang = lang;
  document.cookie = `${LANGUAGE_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageProvider({ initialLang, children }: { initialLang: Language; children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window === "undefined") return initialLang || DEFAULT_LANGUAGE;
    const saved = window.localStorage.getItem(LANGUAGE_COOKIE);
    return saved === "en" || saved === "th" ? saved : initialLang || DEFAULT_LANGUAGE;
  });

  const setLang = (next: Language) => {
    persistLanguage(next);
    setLangState(next);
  };

  const toggleLang = () => {
    setLangState((prev) => {
      const next = prev === "en" ? "th" : "en";
      persistLanguage(next);
      return next;
    });
  };

  useEffect(() => {
    persistLanguage(lang);
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, toggleLang }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
