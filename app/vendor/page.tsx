"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../supabase";

type Vendor = {
  id: string;
  business_name: string;
  category: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  town: string;
  coverage_areas: string;
  services: string;
};

export default function VendorProfilePage() {
  const searchParams = useSearchParams();
  const name = searchParams.get("name") || "";
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadVendor() {
      if (!name) {
        setError("Vendor not found.");
        setLoading(false);
        return;
      }

      const { data, error: vendorError } = await supabase
        .from("vendor_profiles")
        .select("id,business_name,category,description,phone,email,website,town,coverage_areas,services")
        .eq("business_name", name)
        .limit(1)
        .maybeSingle();

      if (vendorError || !data) {
        const { data: override, error: overrideError } = await supabase
          .from("vendor_listing_overrides")
          .select("external_id,business_name,category,description,phone,email,website,town,coverage_areas,services")
          .eq("business_name", name)
          .limit(1)
          .maybeSingle();

        if (overrideError || !override) {
          setError("We couldn't find this vendor profile.");
          setLoading(false);
          return;
        }

        setVendor({
          id: override.external_id,
          business_name: override.business_name || name,
          category: override.category || "Other",
          description: override.description || "",
          phone: override.phone || "",
          email: override.email || "",
          website: override.website || "",
          town: override.town || "",
          coverage_areas: override.coverage_areas || "",
          services: override.services || "",
        });
        setLoading(false);
        return;
      }

      setVendor(data as Vendor);
      setLoading(false);
    }

    void loadVendor();
  }, [name]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <Link href="/#vendors" className="text-sm font-bold text-orange-600">← Back to vendors</Link>

        {loading ? <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm">Loading vendor…</div> : null}
        {error ? <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm text-slate-600">{error}</div> : null}

        {vendor ? (
          <article className="mt-8 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
            <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">{vendor.category}</span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight">{vendor.business_name}</h1>
            {vendor.town ? <p className="mt-2 text-lg font-medium text-slate-500">{vendor.town}</p> : null}

            {vendor.description ? <p className="mt-6 text-base leading-7 text-slate-600">{vendor.description}</p> : null}

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {vendor.services ? (
                <div className="rounded-2xl bg-slate-50 p-5">
                  <h2 className="font-bold">Services</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{vendor.services}</p>
                </div>
              ) : null}
              {vendor.coverage_areas ? (
                <div className="rounded-2xl bg-slate-50 p-5">
                  <h2 className="font-bold">Areas covered</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{vendor.coverage_areas}</p>
                </div>
              ) : null}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {vendor.website ? <a href={vendor.website} target="_blank" rel="noreferrer" className="rounded-xl bg-orange-500 px-5 py-3 font-bold text-white">Visit website</a> : null}
              {vendor.phone ? <a href={`tel:${vendor.phone.replace(/\s/g, "")}`} className="rounded-xl border border-slate-300 px-5 py-3 font-bold">Call vendor</a> : null}
              {vendor.email ? <a href={`mailto:${vendor.email}`} className="rounded-xl border border-slate-300 px-5 py-3 font-bold">Email vendor</a> : null}
            </div>
          </article>
        ) : null}
      </div>
    </main>
  );
}
