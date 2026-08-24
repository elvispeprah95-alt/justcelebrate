"use client";

import { useEffect, useMemo, useState } from "react";

type Vendor = {
  id: string;
  business_name: string;
  category: string;
  description: string;
  phone: string;
  website: string;
  town: string;
  coverage_areas: string;
  services: string;
  email: string;
};

const SUPABASE_URL = "https://azcdjuxvmdfjthngkhyn.supabase.co";
const SUPABASE_KEY = "sb_publishable_2k0t5-NrHs0gKOipeNod0Q_NMmF7yCJ";

const categories = ["All", "Photographers", "Photo Booths", "Caterers", "Venues", "DJs"];

export default function VendorDirectory() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("");

  useEffect(() => {
    async function loadVendors() {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/vendor_profiles?status=eq.approved&select=id,business_name,category,description,phone,website,town,coverage_areas,services,email&order=business_name.asc`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
          }
        );

        if (!response.ok) throw new Error("Could not load vendors");
        const data = (await response.json()) as Vendor[];
        setVendors(data);
      } catch {
        setError("We couldn't load vendors just now. Please try again shortly.");
      } finally {
        setLoading(false);
      }
    }

    loadVendors();
  }, []);

  const filtered = useMemo(() => {
    const q = location.trim().toLowerCase();
    return vendors.filter((vendor) => {
      const categoryMatch = category === "All" || vendor.category === category;
      const locationMatch =
        !q ||
        vendor.town.toLowerCase().includes(q) ||
        vendor.coverage_areas.toLowerCase().includes(q);
      return categoryMatch && locationMatch;
    });
  }, [vendors, category, location]);

  return (
    <section id="vendors" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-orange-500">Explore suppliers</p>
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">Find vendors for your celebration</h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Browse businesses already listed on Just Celebrate. Imported listings are public business information and can be claimed by the business owner.
            </p>
          </div>
          <div className="text-sm font-semibold text-slate-500">
            {loading ? "Loading vendors…" : `${filtered.length} businesses shown`}
          </div>
        </div>

        <div className="mb-10 grid gap-4 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_auto]">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3 text-slate-700 outline-none focus:border-orange-400"
          >
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City or area, e.g. Manchester"
            className="rounded-xl border border-slate-200 px-4 py-3 text-slate-700 outline-none focus:border-orange-400"
          />
          <button
            onClick={() => {
              setCategory("All");
              setLocation("");
            }}
            className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Clear
          </button>
        </div>

        {error && <div className="rounded-2xl bg-white p-8 text-center text-slate-600 shadow-sm">{error}</div>}

        {!error && !loading && filtered.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center text-slate-600 shadow-sm">
            No matching businesses yet. Try another service or location.
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((vendor) => (
            <article key={vendor.id} className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">
                    {vendor.category}
                  </span>
                  <h3 className="mt-3 text-xl font-bold text-slate-900">{vendor.business_name}</h3>
                  {vendor.town && <p className="mt-1 text-sm font-medium text-slate-500">{vendor.town}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Listed business</span>
              </div>

              {vendor.description && <p className="mb-5 text-sm leading-6 text-slate-600">{vendor.description}</p>}

              <div className="mt-auto space-y-2 text-sm">
                {vendor.phone && (
                  <a className="block font-semibold text-slate-800 hover:text-orange-600" href={`tel:${vendor.phone.replace(/\s/g, "")}`}>
                    {vendor.phone}
                  </a>
                )}
                {vendor.email && (
                  <a className="block break-all text-slate-600 hover:text-orange-600" href={`mailto:${vendor.email}`}>
                    {vendor.email}
                  </a>
                )}
                {vendor.website && (
                  <a className="block font-semibold text-orange-600 hover:text-orange-700" href={vendor.website} target="_blank" rel="noreferrer">
                    Visit website →
                  </a>
                )}
              </div>

              <button className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-orange-300 hover:text-orange-600">
                Claim this listing
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
