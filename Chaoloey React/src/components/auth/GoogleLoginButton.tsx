"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLanguage } from "@/components/providers/LanguageProvider";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            ux_mode?: "popup" | "redirect";
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_black" | "filled_blue";
              size?: "large" | "medium" | "small";
              shape?: "pill" | "rectangular" | "circle" | "square";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              width?: string;
            },
          ) => void;
        };
      };
    };
  }
}

type Props = {
  onSuccessRedirect?: string;
};

const SCRIPT_ID = "google-identity-services";

export default function GoogleLoginButton({ onSuccessRedirect = "/account" }: Props) {
  const { lang } = useLanguage();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const divId = useId().replace(/:/g, "");
  const [error, setError] = useState("");
  const initialized = useRef(false);

  useEffect(() => {
    if (!clientId) {
      setError("Google login is not configured.");
      return;
    }

    const bootstrap = () => {
      if (!window.google || initialized.current) return;
      const target = document.getElementById(divId);
      if (!target) return;
      initialized.current = true;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            setError("");
            const res = await fetch("/api/auth/google", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ credential: response.credential }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.ok) {
              throw new Error(body?.error || "GOOGLE_LOGIN_FAILED");
            }
            window.location.href = onSuccessRedirect;
          } catch (e) {
            setError((e as Error).message || "GOOGLE_LOGIN_FAILED");
          }
        },
        ux_mode: "popup",
      });

      target.innerHTML = "";
      window.google.accounts.id.renderButton(target, {
        type: "standard",
        theme: "filled_black",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: "360",
      });
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.remove();
      initialized.current = false;
    }

    if (window.google) {
      bootstrap();
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    // Follow selected app language for Google identity button labels.
    script.src = `https://accounts.google.com/gsi/client?hl=${lang}`;
    script.async = true;
    script.defer = true;
    script.onload = bootstrap;
    script.onerror = () => setError("Failed to load Google script.");
    document.head.appendChild(script);
  }, [clientId, divId, onSuccessRedirect, lang]);

  return (
    <div>
      <div id={divId} className="flex justify-center" />
      {error ? <p className="mt-2 text-center text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
