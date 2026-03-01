"use client";

import { useEffect } from "react";

const STORAGE_KEY = "chaoloey_search_last";

type SearchState = {
  location: string;
  pickup: string;
  dropoff: string;
  type: string;
  brand: string;
  price: string;
  sort: string;
};

function readFormState(form: HTMLFormElement): SearchState {
  const fd = new FormData(form);
  return {
    location: String(fd.get("location") || ""),
    pickup: String(fd.get("pickup") || ""),
    dropoff: String(fd.get("dropoff") || ""),
    type: String(fd.get("type") || "all"),
    brand: String(fd.get("brand") || "all"),
    price: String(fd.get("price") || "all"),
    sort: String(fd.get("sort") || "recommended"),
  };
}

function applyStateToForm(form: HTMLFormElement, state: SearchState) {
  const set = (name: keyof SearchState, value: string) => {
    const input = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
    if (!input) return;
    input.value = value;
  };

  set("location", state.location);
  set("pickup", state.pickup);
  set("dropoff", state.dropoff);
  set("type", state.type);
  set("brand", state.brand);
  set("price", state.price);
  set("sort", state.sort);
}

export default function SearchPersistor() {
  useEffect(() => {
    const form = document.getElementById("search-filters-form") as HTMLFormElement | null;
    if (!form) return;

    const url = new URL(window.location.href);
    const hasPrimaryParams =
      Boolean(url.searchParams.get("location")) ||
      Boolean(url.searchParams.get("pickup")) ||
      Boolean(url.searchParams.get("dropoff"));

    if (hasPrimaryParams) {
      const current = readFormState(form);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } else {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const saved = JSON.parse(raw) as SearchState;
          applyStateToForm(form, saved);
        } catch {
          // ignore invalid cache
        }
      }
    }

    const onSubmit = () => {
      const current = readFormState(form);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    };
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, []);

  return null;
}
