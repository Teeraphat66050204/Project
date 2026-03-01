"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, type Language } from "@/lib/i18n";

type LanguageContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ initialLang, children }: { initialLang: Language; children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window === "undefined") return initialLang || DEFAULT_LANGUAGE;
    const saved = window.localStorage.getItem(LANGUAGE_COOKIE);
    return saved === "en" || saved === "th" ? saved : initialLang || DEFAULT_LANGUAGE;
  });

  const setLang = (next: Language) => {
    setLangState(next);
  };

  const toggleLang = () => {
    setLangState((prev) => (prev === "en" ? "th" : "en"));
  };

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_COOKIE, lang);
    document.documentElement.lang = lang;
    document.cookie = `${LANGUAGE_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, toggleLang }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
