"use client";

import { FormEvent, useMemo, useState } from "react";
import PasswordField from "@/components/ui/PasswordField";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import { useLanguage } from "@/components/providers/LanguageProvider";

function getNextPath() {
  if (typeof window === "undefined") return "/account";
  const next = new URLSearchParams(window.location.search).get("next") ?? "/account";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

export default function SignInPage() {
  const { lang } = useLanguage();
  const nextPath = useMemo(() => getNextPath(), []);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const t = lang === "th"
    ? {
        title: "\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a",
        subtitle: "\u0e40\u0e02\u0e49\u0e32\u0e16\u0e36\u0e07\u0e01\u0e32\u0e23\u0e08\u0e2d\u0e07\u0e41\u0e25\u0e30\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23\u0e01\u0e32\u0e23\u0e40\u0e0a\u0e48\u0e32\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13",
        email: "\u0e2d\u0e35\u0e40\u0e21\u0e25",
        password: "\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19",
        passwordPlaceholder: "\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13",
        submit: "\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a",
        submitting: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a...",
        or: "\u0e2b\u0e23\u0e37\u0e2d",
      }
    : {
        title: "Sign in",
        subtitle: "Access your bookings and manage your rentals.",
        email: "Email",
        password: "Password",
        passwordPlaceholder: "Your password",
        submit: "Sign in",
        submitting: "Signing in...",
        or: "or",
      };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");

    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok || !body?.ok) {
      setError(body?.error || "LOGIN_FAILED");
      return;
    }
    window.location.href = nextPath;
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-md card-premium p-6">
        <h1 className="text-3xl font-black">{t.title}</h1>
        <p className="mt-2 text-sm text-[rgba(249,250,251,0.70)]">{t.subtitle}</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold">{t.email}</label>
            <input id="email" name="email" type="email" placeholder="you@email.com" required className="input-premium" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold">{t.password}</label>
            <PasswordField id="password" name="password" required placeholder={t.passwordPlaceholder} />
          </div>
          {error ? <p className="status-banner">{error}</p> : null}
          <button type="submit" disabled={loading} className="btn-base btn-primary w-full px-4 py-3">{loading ? t.submitting : t.submit}</button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(249,250,251,0.65)]">{t.or}</p>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <GoogleLoginButton onSuccessRedirect={nextPath} />
      </div>
    </main>
  );
}

