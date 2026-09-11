"use client";

import { useEffect, useRef, useState, type SetStateAction } from "react";

export type CelebrationPlan = {
  occasion: string;
  date: string;
  location: string;
  guests: string;
  budget: string;
  services: string[];
};

export const emptyPlan: CelebrationPlan = {
  occasion: "", date: "", location: "", guests: "", budget: "", services: [],
};

export function decodePlan(raw: string): CelebrationPlan {
  const value = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid plan");
  const plan = { ...emptyPlan };
  for (const key of ["occasion", "date", "location", "guests", "budget"] as const) {
    if (typeof value[key] === "string") plan[key] = value[key];
  }
  plan.services = Array.isArray(value.services) ? value.services.filter((item: unknown) => typeof item === "string") : [];
  if (plan.date && !Number.isFinite(Date.parse(plan.date))) plan.date = "";
  return plan;
}

const encodeJson = <T,>(value: T) => JSON.stringify(value);

// Load first. Write only in response to edits, never from initial render effects.
// Synchronous writes also protect the latest edit when the tab closes immediately.
export function useSavedPlanner<T>(key: string, initial: T, decode: (raw: string) => T, encode: (value: T) => string = encodeJson) {
  const [value, setValue] = useState(initial);
  const current = useRef(initial);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const restored = decode(raw);
        current.current = restored;
        setValue(restored);
        setSaved(true);
      }
    } catch {
      setError("We couldn’t restore saved information. Please keep this tab open until saving is working.");
    }
    setReady(true);
  }, [key, decode]);

  function update(next: SetStateAction<T>) {
    if (!ready) return;
    const updated = typeof next === "function" ? (next as (value: T) => T)(current.current) : next;
    current.current = updated;
    setValue(updated);
    try {
      localStorage.setItem(key, encode(updated));
      setSaved(true);
      setError("");
    } catch {
      setSaved(false);
      setError("Changes aren’t saved because browser storage is unavailable. Please keep this tab open and allow site storage.");
    }
  }

  return { value, update, ready, error, saved };
}
