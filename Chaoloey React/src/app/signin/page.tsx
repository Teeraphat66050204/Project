"use client";

import { FormEvent, useMemo, useState } from "react";
import PasswordField from "@/components/ui/PasswordField";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";

function getNextPath() {
  if (typeof window === "undefined") return "/account";
  const next = new URLSearchParams(window.location.search).get("next") ?? "/account";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

export default function SignInPage() {
  const nextPath = useMemo(() => getNextPath(), []);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        <h1 className="text-3xl font-black">Sign in</h1>
        <p className="mt-2 text-sm text-[rgba(249,250,251,0.70)]">Access your bookings and manage your rentals.</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold">Email</label>
            <input id="email" name="email" type="email" placeholder="you@email.com" required className="input-premium" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold">Password</label>
            <PasswordField id="password" name="password" required placeholder="Your password" />
          </div>
          {error ? <p className="status-banner">{error}</p> : null}
          <button type="submit" disabled={loading} className="btn-base btn-primary w-full px-4 py-3">{loading ? "Signing in..." : "Sign in"}</button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(249,250,251,0.65)]">or</p>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <GoogleLoginButton onSuccessRedirect={nextPath} />
        <a href={`/api/auth/google/start?next=${encodeURIComponent(nextPath)}`} className="mt-3 block text-center text-sm text-[#F59E0B] hover:underline">
          Continue with Google (redirect)
        </a>
      </div>
    </main>
  );
}
