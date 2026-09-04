"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase, vendorDirectoryKey, vendorDirectoryUrl } from "../../supabase";

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
  is_hidden?: boolean;
  listing_status?: "pending" | "approved" | "suspended";
  is_featured?: boolean;
  has_override?: boolean;
};

type VendorOverride = Omit<Vendor, "id" | "has_override"> & { external_id: string };

const PAGE_SIZE = 1000;
const TEST_VENDOR_ID = "manual-test-just-celebrate";
const TEST_VENDOR_EMAIL = "elvispeprah95+vendor@gmail.com";

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [query, setQuery] = useState("");
  const [qualityFilter, setQualityFilter] = useState("all");
  const [adminId, setAdminId] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadVendors() {
    setLoading(true);
    const { data: refreshed } = await supabase.auth.refreshSession();
    const user = refreshed.session?.user;
    if (!user || user.app_metadata?.account_type !== "admin") {
      setNotice("Your admin session has expired. Return to the admin page and sign in again.");
      setLoading(false);
      return;
    }
    setAdminId(user.id);

    try {
      const sourceVendors: Vendor[] = [];
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const response = await fetch(
          `${vendorDirectoryUrl}/rest/v1/vendor_profiles?status=eq.approved&select=id,business_name,category,description,phone,website,town,coverage_areas,services,email&order=business_name.asc&offset=${offset}&limit=${PAGE_SIZE}`,
          { headers: { apikey: vendorDirectoryKey, Authorization: `Bearer ${vendorDirectoryKey}` } }
        );
        if (!response.ok) throw new Error("Directory unavailable");
        const page = (await response.json()) as Vendor[];
        sourceVendors.push(...page);
        if (page.length < PAGE_SIZE) break;
      }

      const { data, error } = await supabase.from("vendor_listing_overrides").select("*");
      if (error) throw error;
      const overrideMap = new Map(((data || []) as VendorOverride[]).map((item) => [item.external_id, item]));
      const sourceIds = new Set(sourceVendors.map((vendor) => vendor.id));
      const managedVendors = sourceVendors.map((vendor) => {
        const override = overrideMap.get(vendor.id);
        if (!override) return vendor;
        const { external_id: _externalId, ...changes } = override;
        void _externalId;
        return { ...vendor, ...changes, has_override: true };
      });
      const manualVendors = ((data || []) as VendorOverride[])
        .filter((item) => !sourceIds.has(item.external_id))
        .map(({ external_id, ...vendor }) => ({ ...vendor, id: external_id, has_override: true }));
      setVendors([...manualVendors, ...managedVendors]);
    } catch {
      setNotice("The vendor directory could not be loaded. Please refresh and try again.");
    }
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadVendors(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return vendors.filter((vendor) => {
      const matchesSearch = !search ||
      [vendor.business_name, vendor.category, vendor.town, vendor.email]
        .some((value) => (value || "").toLowerCase().includes(search))
      const matchesQuality = qualityFilter === "all" ||
        (qualityFilter === "missing_email" && !vendor.email) ||
        (qualityFilter === "missing_description" && !vendor.description) ||
        (qualityFilter === "hidden" && vendor.is_hidden) ||
        (qualityFilter === "suspended" && vendor.listing_status === "suspended") ||
        (qualityFilter === "featured" && vendor.is_featured);
      return matchesSearch && matchesQuality;
    });
  }, [query, qualityFilter, vendors]);

  async function logVendorAction(action: string, vendor: Vendor, details: Record<string, unknown> = {}) {
    if (!adminId) return;
    await supabase.from("admin_activity").insert({ admin_id: adminId, action, entity_type: "vendor_listing", entity_id: vendor.id, details: { business_name: vendor.business_name, ...details } });
  }

  async function saveVendor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setNotice("");

    const { error } = await supabase.from("vendor_listing_overrides").upsert({
      external_id: editing.id,
      business_name: editing.business_name.trim(),
      category: editing.category.trim(),
      description: editing.description.trim(),
      phone: editing.phone.trim(),
      website: editing.website.trim(),
      town: editing.town.trim(),
      coverage_areas: editing.coverage_areas.trim(),
      services: editing.services.trim(),
      email: editing.email.trim().toLowerCase(),
      is_hidden: !!editing.is_hidden,
      listing_status: editing.listing_status || "approved",
      is_featured: !!editing.is_featured,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setNotice("The listing could not be saved. Please try again.");
    } else {
      await logVendorAction("updated vendor listing", editing, { listing_status: editing.listing_status, is_featured: editing.is_featured });
      setVendors((items) => items.map((item) => item.id === editing.id ? { ...editing, has_override: true } : item));
      setEditing(null);
      setNotice("Vendor listing updated successfully.");
    }
    setSaving(false);
  }

  async function toggleVisibility(vendor: Vendor) {
    const updated = { ...vendor, is_hidden: !vendor.is_hidden };
    setEditing(updated);
    setSaving(true);
    const { error } = await supabase.from("vendor_listing_overrides").upsert({
      external_id: updated.id,
      business_name: updated.business_name,
      category: updated.category,
      description: updated.description,
      phone: updated.phone,
      website: updated.website,
      town: updated.town,
      coverage_areas: updated.coverage_areas,
      services: updated.services,
      email: updated.email,
      is_hidden: !!updated.is_hidden,
      listing_status: updated.listing_status || "approved",
      is_featured: !!updated.is_featured,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setNotice("The listing visibility could not be changed.");
    } else {
      await logVendorAction(updated.is_hidden ? "hid vendor listing" : "restored vendor listing", updated);
      setVendors((items) => items.map((item) => item.id === vendor.id ? { ...updated, has_override: true } : item));
      setNotice(updated.is_hidden ? "Listing hidden from the public directory." : "Listing restored to the public directory.");
    }
    setEditing(null);
    setSaving(false);
  }

  async function createTestVendor() {
    setSaving(true);
    setNotice("");
    const testVendor: Vendor = {
      id: TEST_VENDOR_ID,
      business_name: "Just Celebrate Test Vendor",
      category: "Test Services",
      description: "Private test listing used by Just Celebrate to verify customer enquiries and vendor replies.",
      phone: "",
      website: "",
      town: "London",
      coverage_areas: "London",
      services: "Marketplace enquiry testing",
      email: TEST_VENDOR_EMAIL,
      is_hidden: false,
      listing_status: "approved",
      is_featured: false,
      has_override: true,
    };
    const { error } = await supabase.from("vendor_listing_overrides").upsert({
      external_id: testVendor.id,
      business_name: testVendor.business_name,
      category: testVendor.category,
      description: testVendor.description,
      phone: testVendor.phone,
      website: testVendor.website,
      town: testVendor.town,
      coverage_areas: testVendor.coverage_areas,
      services: testVendor.services,
      email: testVendor.email,
      is_hidden: false,
      listing_status: "approved",
      is_featured: false,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setNotice("The test vendor could not be created. Please try again.");
    } else {
      await logVendorAction("created test vendor", testVendor, { email: TEST_VENDOR_EMAIL });
      setVendors((items) => [testVendor, ...items.filter((item) => item.id !== TEST_VENDOR_ID)]);
      setQuery("Just Celebrate Test Vendor");
      setQualityFilter("all");
      setNotice("Test vendor created. It is ready for a safe enquiry test.");
    }
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-8 text-[#0d3835]">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl bg-[#0d3835] p-7 text-white sm:flex sm:items-center sm:justify-between">
          <div><p className="text-sm font-bold text-[#ffaaa5]">JUST CELEBRATE ADMIN</p><h1 className="mt-2 text-3xl font-semibold">Manage vendors</h1></div>
          <Link href="/admin" className="mt-4 inline-flex rounded-xl border border-white/30 px-4 py-2 text-sm font-bold sm:mt-0">Back to overview</Link>
        </header>

        <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full flex-col gap-3 sm:max-w-4xl sm:flex-row"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search business, category, town or email" className="w-full rounded-2xl border border-[#d9d5cc] px-4 py-3 outline-none focus:border-[#ff655d]" /><select value={qualityFilter} onChange={(event) => setQualityFilter(event.target.value)} className="rounded-2xl border border-[#d9d5cc] bg-white px-4 py-3"><option value="all">All listings</option><option value="missing_email">Missing email</option><option value="missing_description">Missing description</option><option value="hidden">Hidden</option><option value="suspended">Suspended</option><option value="featured">Featured</option></select><button type="button" onClick={() => void createTestVendor()} disabled={saving} className="whitespace-nowrap rounded-2xl bg-[#ff655d] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Creating…" : "Create test vendor"}</button></div>
            <p className="text-sm font-semibold text-[#65706e]">{loading ? "Loading vendors…" : `${filtered.length} results`}</p>
          </div>
          {notice && <p className="mt-4 rounded-2xl bg-[#fff4d6] p-4 text-sm">{notice}</p>}
        </section>

        {!loading && (
          <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="divide-y divide-[#eee9df]">
              {filtered.slice(0, 100).map((vendor) => (
                <article key={vendor.id} className={`p-5 sm:flex sm:items-center sm:justify-between sm:gap-5 ${vendor.is_hidden ? "bg-slate-100 opacity-70" : ""}`}>
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{vendor.business_name}</h2>{vendor.has_override && <span className="rounded-full bg-[#fff4d6] px-2 py-1 text-xs">Edited</span>}{vendor.is_hidden && <span className="rounded-full bg-slate-200 px-2 py-1 text-xs">Hidden</span>}{vendor.listing_status === "suspended" && <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">Suspended</span>}{vendor.is_featured && <span className="rounded-full bg-[#ffddd9] px-2 py-1 text-xs">Featured</span>}</div><p className="mt-1 text-sm text-[#65706e]">{vendor.category}{vendor.town ? ` · ${vendor.town}` : ""}{vendor.email ? ` · ${vendor.email}` : " · No enquiry email"}{!vendor.description ? " · Missing description" : ""}</p></div>
                  <div className="mt-4 flex gap-2 sm:mt-0"><button onClick={() => setEditing({ ...vendor })} className="rounded-xl border border-[#d9d5cc] px-4 py-2 text-sm font-bold">Edit</button><button onClick={() => void toggleVisibility(vendor)} disabled={saving} className="rounded-xl bg-[#0d3835] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{vendor.is_hidden ? "Show" : "Hide"}</button></div>
                </article>
              ))}
            </div>
            {filtered.length > 100 && <p className="border-t border-[#eee9df] p-4 text-center text-sm text-[#65706e]">Showing the first 100 results. Use search to find a specific business.</p>}
          </section>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-8">
          <form onSubmit={saveVendor} className="relative grid w-full max-w-2xl gap-4 rounded-3xl bg-white p-6 shadow-2xl sm:grid-cols-2 sm:p-8">
            <button type="button" onClick={() => setEditing(null)} className="absolute right-5 top-4 text-2xl text-slate-400" aria-label="Close">×</button>
            <div className="sm:col-span-2"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff655d]">Edit listing</p><h2 className="mt-2 pr-8 text-2xl font-bold">{editing.business_name}</h2></div>
            {[{ key: "business_name", label: "Business name" }, { key: "category", label: "Category" }, { key: "town", label: "Town" }, { key: "email", label: "Enquiry email" }, { key: "phone", label: "Phone" }, { key: "website", label: "Website" }, { key: "coverage_areas", label: "Coverage areas" }, { key: "services", label: "Services" }].map(({ key, label }) => (
              <label key={key} className="text-sm font-bold">{label}<input value={String(editing[key as keyof Vendor] || "")} onChange={(event) => setEditing({ ...editing, [key]: event.target.value })} className="mt-2 w-full rounded-xl border border-[#d9d5cc] px-4 py-3 font-normal outline-none focus:border-[#ff655d]" /></label>
            ))}
            <label className="text-sm font-bold sm:col-span-2">Description<textarea value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} rows={4} className="mt-2 w-full rounded-xl border border-[#d9d5cc] px-4 py-3 font-normal outline-none focus:border-[#ff655d]" /></label>
            <label className="text-sm font-bold">Listing status<select value={editing.listing_status || "approved"} onChange={(event) => setEditing({ ...editing, listing_status: event.target.value as Vendor["listing_status"] })} className="mt-2 w-full rounded-xl border border-[#d9d5cc] bg-white px-4 py-3 font-normal"><option value="pending">Pending</option><option value="approved">Approved</option><option value="suspended">Suspended</option></select></label>
            <label className="flex items-center gap-3 text-sm font-bold sm:self-end"><input type="checkbox" checked={!!editing.is_featured} onChange={(event) => setEditing({ ...editing, is_featured: event.target.checked })} className="size-5" />Feature this vendor</label>
            <label className="flex items-center gap-3 text-sm font-bold sm:col-span-2"><input type="checkbox" checked={!!editing.is_hidden} onChange={(event) => setEditing({ ...editing, is_hidden: event.target.checked })} className="size-5" />Hide this listing from the public directory</label>
            <button disabled={saving} className="rounded-xl bg-[#ff655d] px-5 py-3 font-bold text-white disabled:opacity-50 sm:col-span-2">{saving ? "Saving…" : "Save listing changes"}</button>
          </form>
        </div>
      )}
    </main>
  );
}
