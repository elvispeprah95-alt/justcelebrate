"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type SavedSupplier = {
  id: string;
  business_name: string;
  category: string;
  town?: string;
  phone?: string;
  email?: string;
};
const KEY = "just-celebrate-suppliers";
const CHANGE = "just-celebrate-suppliers-changed";

export function readSuppliers(): SavedSupplier[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.some(v => !v || typeof v.id !== "string" || typeof v.business_name !== "string" || typeof v.category !== "string")) {
    throw new Error("Invalid saved suppliers");
  }
  return value.map(v => ({
    id: v.id, business_name: v.business_name, category: v.category,
    town: typeof v.town === "string" ? v.town : "",
    phone: typeof v.phone === "string" ? v.phone : "",
    email: typeof v.email === "string" ? v.email : "",
  }));
}

function useSuppliers() {
  const [suppliers, setSuppliers] = useState<SavedSupplier[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => {
      try { setSuppliers(readSuppliers()); setError(""); }
      catch { setError("We couldn’t load your saved suppliers. Please allow site storage and try again."); }
      setReady(true);
    };
    refresh();
    window.addEventListener(CHANGE, refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener(CHANGE, refresh); window.removeEventListener("storage", refresh); };
  }, []);
  function update(change: (current: SavedSupplier[]) => SavedSupplier[]) {
    try {
      // Read again so selections from other cards or tabs are kept.
      const next = change(readSuppliers());
      localStorage.setItem(KEY, JSON.stringify(next));
      setSuppliers(next); setError("");
      window.dispatchEvent(new Event(CHANGE));
    } catch {
      setError("This change couldn’t be saved. Please allow site storage and try again.");
    }
  }
  return { suppliers, ready, error, update };
}

export function AddToPlan({ vendor }: { vendor: SavedSupplier }) {
  const { suppliers, ready, error, update } = useSuppliers();
  const added = suppliers.some(v => v.id === vendor.id);
  return <div className="mt-4">
    <button type="button" disabled={!ready || added} onClick={() => update(current => current.some(v => v.id === vendor.id) ? current : [...current, {
      id: vendor.id, business_name: vendor.business_name, category: vendor.category,
      town: vendor.town || "", phone: vendor.phone || "", email: vendor.email || "",
    }])} className="w-full rounded-xl bg-[#063d39] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
      {added ? "✓ Added to my plan" : "Add to my plan"}
    </button>
    {added && <Link href="/planner#suppliers" className="mt-2 block text-center text-sm font-bold text-[#063d39] underline">View my planning portal →</Link>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </div>;
}

export default function SavedSuppliers() {
  const { suppliers, ready, error, update } = useSuppliers();
  return <div>
    <h2 className="text-2xl font-bold text-[#063d39]">My suppliers {ready && suppliers.length > 0 ? `(${suppliers.length})` : ""}</h2>
    <p className="mt-2 text-sm text-slate-600">Your shortlisted businesses, saved with your plan on this device. Adding a supplier does not confirm a booking.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {!ready ? <p role="status" className="mt-4">Loading your suppliers…</p> : !error && suppliers.length === 0 ? <p className="mt-4 rounded-xl bg-[#f8f4ec] p-4 text-slate-600">No suppliers selected yet. Choose a service below and select “Add to my plan” on a business.</p> : null}
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {suppliers.map(v => <article key={v.id} className="rounded-2xl border border-[#e5ded1] p-5">
        <p className="text-xs font-bold text-orange-600">{v.category} · Shortlisted</p>
        <h3 className="mt-2 text-lg font-bold text-[#063d39]">{v.business_name}</h3>
        {v.town && <p className="mt-1 text-sm text-slate-500">{v.town}</p>}
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold text-[#063d39]">
          <Link href={`/vendor?name=${encodeURIComponent(v.business_name)}`} className="underline">View profile</Link>
          {v.email && <a href={`mailto:${v.email}`} className="underline">Email vendor</a>}
          {v.phone && <a href={`tel:${v.phone.replace(/\s/g, "")}`} className="underline">Call vendor</a>}
        </div>
        <button type="button" aria-label={`Remove ${v.business_name} from my plan`} onClick={() => update(current => current.filter(item => item.id !== v.id))} className="mt-4 text-sm text-slate-500 underline">Remove from plan</button>
      </article>)}
    </div>
  </div>;
}
