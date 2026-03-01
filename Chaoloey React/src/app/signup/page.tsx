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

export default function SignUpPage() {
  const { lang } = useLanguage();
  const nextPath = useMemo(() => getNextPath(), []);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const t = lang === "th"
    ? {
        mismatch: "\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e44\u0e21\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19",
        title: "\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e1a\u0e31\u0e0d\u0e0a\u0e35",
        subtitle: "\u0e2a\u0e21\u0e31\u0e04\u0e23 ChaoLoey \u0e41\u0e25\u0e30\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21\u0e01\u0e32\u0e23\u0e08\u0e2d\u0e07\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14\u0e43\u0e19\u0e17\u0e35\u0e48\u0e40\u0e14\u0e35\u0e22\u0e27",
        name: "\u0e0a\u0e37\u0e48\u0e2d-\u0e19\u0e32\u0e21\u0e2a\u0e01\u0e38\u0e25",
        email: "\u0e2d\u0e35\u0e40\u0e21\u0e25",
        password: "\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19",
        confirmPassword: "\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19",
        passHint: "\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e19\u0e49\u0e2d\u0e22 6 \u0e15\u0e31\u0e27\u0e2d\u0e31\u0e01\u0e29\u0e23",
        reEnter: "\u0e01\u0e23\u0e2d\u0e01\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07",
        creating: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e1a\u0e31\u0e0d\u0e0a\u0e35...",
        create: "\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e1a\u0e31\u0e0d\u0e0a\u0e35",
        or: "\u0e2b\u0e23\u0e37\u0e2d",
      }
    : {
        mismatch: "PASSWORD_MISMATCH",
        title: "Create account",
        subtitle: "Join ChaoLoey and track every booking in one place.",
        name: "Full name",
        email: "Email",
        password: "Password",
        confirmPassword: "Confirm password",
        passHint: "At least 6 characters",
        reEnter: "Re-enter password",
        creating: "Creating account...",
        create: "Create account",
        or: "or",
      };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    const confirmPassword = String(fd.get("confirmPassword") || "");
    if (password !== confirmPassword) {
      setError(t.mismatch);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok || !body?.ok) {
      setError(body?.error || "REGISTER_FAILED");
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
            <label htmlFor="name" className="mb-1 block text-sm font-semibold">{t.name}</label>
            <input id="name" name="name" required placeholder="Name Surname" className="input-premium" />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold">{t.email}</label>
            <input id="email" name="email" type="email" required placeholder="you@email.com" className="input-premium" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold">{t.password}</label>
            <PasswordField id="password" name="password" required minLength={6} placeholder={t.passHint} />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-semibold">{t.confirmPassword}</label>
            <PasswordField id="confirmPassword" name="confirmPassword" required minLength={6} placeholder={t.reEnter} />
          </div>
          {error ? <p className="status-banner">{error}</p> : null}
          <button type="submit" disabled={loading} className="btn-base btn-primary w-full px-4 py-3">{loading ? t.creating : t.create}</button>
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

