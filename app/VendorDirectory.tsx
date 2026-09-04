"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, vendorDirectoryKey, vendorDirectoryUrl } from "./supabase";

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

type EnquiryDraft = {
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  eventDate: string;
  eventLocation: string;
  message: string;
};

type VendorOverride = Partial<Omit<Vendor, "id">> & {
  external_id: string;
  is_hidden: boolean;
  listing_status: "pending" | "approved" | "suspended";
};

const PAGE_SIZE = 1000;
const ENQUIRY_DRAFT_KEY = "just-celebrate-enquiry-draft";

export default function VendorDirectory() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("");
  const [enquiriesOnly, setEnquiriesOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(60);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [enquiryMessage, setEnquiryMessage] = useState("");

  useEffect(() => {
    async function loadVendors() {
      try {
        const allVendors: Vendor[] = [];

        for (let offset = 0; ; offset += PAGE_SIZE) {
          const response = await fetch(
            `${vendorDirectoryUrl}/rest/v1/vendor_profiles?status=eq.approved&select=id,business_name,category,description,phone,website,town,coverage_areas,services,email&order=business_name.asc&offset=${offset}&limit=${PAGE_SIZE}`,
            {
              cache: "no-store",
              headers: {
                apikey: vendorDirectoryKey,
                Authorization: `Bearer ${vendorDirectoryKey}`,
              },
            }
          );

          if (!response.ok) throw new Error("Could not load vendors");
          const page = (await response.json()) as Vendor[];
          allVendors.push(...page);
          if (page.length < PAGE_SIZE) break;
        }

        const { data: overrides, error: overrideError } = await supabase
          .from("vendor_listing_overrides")
          .select("external_id,business_name,category,description,phone,website,town,coverage_areas,services,email,is_hidden,listing_status");

        if (overrideError) throw overrideError;
        const overrideMap = new Map(
          ((overrides || []) as VendorOverride[]).map((item) => [item.external_id, item])
        );
        const sourceIds = new Set(allVendors.map((vendor) => vendor.id));
        const manualVendors = ((overrides || []) as VendorOverride[])
          .filter((item) => !sourceIds.has(item.external_id))
          .map(({ external_id, is_hidden, listing_status, ...vendor }) => ({
            id: external_id,
            business_name: vendor.business_name || "Managed vendor",
            category: vendor.category || "Other",
            description: vendor.description || "",
            phone: vendor.phone || "",
            website: vendor.website || "",
            town: vendor.town || "",
            coverage_areas: vendor.coverage_areas || "",
            services: vendor.services || "",
            email: vendor.email || "",
            is_hidden,
            listing_status,
          }));
        setVendors(
          [...manualVendors, ...allVendors]
            .map((vendor) => {
              const override = overrideMap.get(vendor.id);
              if (!override) return vendor;
              return {
                ...vendor,
                ...Object.fromEntries(
                  Object.entries(override).filter(
                    ([key, value]) => !["external_id", "is_hidden", "listing_status"].includes(key) && value !== null
                  )
                ),
                is_hidden: override.is_hidden,
                listing_status: override.listing_status,
              } as Vendor & { is_hidden?: boolean; listing_status?: string };
            })
            .filter((vendor) => {
              const managed = vendor as Vendor & { is_hidden?: boolean; listing_status?: string };
              return !managed.is_hidden && managed.listing_status !== "suspended" && managed.listing_status !== "pending";
            })
        );
      } catch {
        setError("We couldn't load vendors just now. Please try again shortly.");
      } finally {
        setLoading(false);
      }
    }

    loadVendors();
  }, []);

  useEffect(() => {
    async function continueEnquiry() {
      if (!localStorage.getItem(ENQUIRY_DRAFT_KEY)) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.push("/complete-enquiry");
    }

    void continueEnquiry();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void continueEnquiry(), 0);
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(vendors.map((vendor) => vendor.category).filter(Boolean))).sort()],
    [vendors]
  );

  const filtered = useMemo(() => {
    const q = location.trim().toLowerCase();
    return vendors.filter((vendor) => {
      const categoryMatch = category === "All" || vendor.category === category;
      const locationMatch =
        !q ||
        (vendor.town || "").toLowerCase().includes(q) ||
        (vendor.coverage_areas || "").toLowerCase().includes(q);
      const enquiryMatch = !enquiriesOnly || Boolean(vendor.email?.trim());
      return categoryMatch && locationMatch && enquiryMatch;
    });
  }, [vendors, category, location, enquiriesOnly]);

  async function handleEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVendor?.email) return;

    setSubmitting(true);
    setFormMessage("");

    const draft: EnquiryDraft = {
      vendorId: selectedVendor.id,
      vendorName: selectedVendor.business_name,
      vendorEmail: selectedVendor.email.trim(),
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      subject: subject.trim(),
      eventDate,
      eventLocation: eventLocation.trim(),
      message: enquiryMessage.trim(),
    };

    localStorage.setItem(ENQUIRY_DRAFT_KEY, JSON.stringify(draft));

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email?.toLowerCase() === draft.customerEmail) {
      router.push("/complete-enquiry");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: draft.customerEmail,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: true,
        data: {
          display_name: draft.customerName,
          account_type: "customer",
        },
      },
    });

    if (signInError) {
      setFormMessage("We couldn't send your secure confirmation link. Please try again.");
      setSubmitting(false);
      return;
    }

    setFormMessage("Check your email and click the secure link to send your enquiry. Your message will then appear in your private inbox.");
    setSubmitting(false);
  }

  return (
    <section id="vendors" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-orange-500">Explore suppliers</p>
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">Find vendors for your celebration</h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Browse businesses already listed on Just Celebrate. Contact participating vendors directly through your private Just Celebrate inbox.
            </p>
          </div>
          <div className="text-sm font-semibold text-slate-500">
            {loading ? "Loading vendors…" : `${filtered.length} businesses shown`}
          </div>
        </div>

        <div className="mb-10 grid gap-4 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_auto]">
          <select value={category} onChange={(e) => { setCategory(e.target.value); setVisibleCount(60); }} className="rounded-xl border border-slate-200 px-4 py-3 text-slate-700 outline-none focus:border-orange-400">
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
          <input value={location} onChange={(e) => { setLocation(e.target.value); setVisibleCount(60); }} placeholder="City or area, e.g. Manchester" className="rounded-xl border border-slate-200 px-4 py-3 text-slate-700 outline-none focus:border-orange-400" />
          <button onClick={() => { setCategory("All"); setLocation(""); setEnquiriesOnly(false); setVisibleCount(60); }} className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Clear</button>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-orange-50 px-4 py-3 font-semibold text-slate-800 md:col-span-3">
            <input type="checkbox" checked={enquiriesOnly} onChange={(event) => { setEnquiriesOnly(event.target.checked); setVisibleCount(60); }} className="size-5 accent-orange-500" />
            Show only vendors accepting enquiries
          </label>
        </div>

        {error && <div className="rounded-2xl bg-white p-8 text-center text-slate-600 shadow-sm">{error}</div>}
        {!error && !loading && filtered.length === 0 && <div className="rounded-2xl bg-white p-10 text-center text-slate-600 shadow-sm">No matching businesses yet. Try another service or location.</div>}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.slice(0, visibleCount).map((vendor) => (
            <article key={vendor.id} className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">{vendor.category}</span>
                  <h3 className="mt-3 text-xl font-bold text-slate-900">{vendor.business_name}</h3>
                  {vendor.town && <p className="mt-1 text-sm font-medium text-slate-500">{vendor.town}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{vendor.email ? "Enquiries open" : "Listed business"}</span>
              </div>

              {vendor.description && <p className="mb-5 text-sm leading-6 text-slate-600">{vendor.description}</p>}
              <div className="mt-auto space-y-2 text-sm">
                {vendor.phone && <a className="block font-semibold text-slate-800 hover:text-orange-600" href={`tel:${vendor.phone.replace(/\s/g, "")}`}>{vendor.phone}</a>}
                {vendor.website && <a className="block font-semibold text-orange-600 hover:text-orange-700" href={vendor.website} target="_blank" rel="noreferrer">Visit website →</a>}
              </div>

              {vendor.email ? (
                <button onClick={() => { setSelectedVendor(vendor); setSubject(`Enquiry for ${vendor.business_name}`); setFormMessage(""); }} className="mt-5 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600">Send an enquiry</button>
              ) : (
                <button disabled className="mt-5 w-full cursor-not-allowed rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-400">Enquiries opening soon</button>
              )}
            </article>
          ))}
        </div>
        {visibleCount < filtered.length && (
          <div className="mt-10 text-center">
            <button onClick={() => setVisibleCount((count) => count + 60)} className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-800 hover:border-orange-400 hover:text-orange-600">
              Show more businesses
            </button>
          </div>
        )}
      </div>

      {selectedVendor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-8">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <button type="button" onClick={() => setSelectedVendor(null)} className="absolute right-5 top-4 text-2xl text-slate-400 hover:text-slate-700" aria-label="Close enquiry form">×</button>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-500">Private enquiry</p>
            <h2 className="mt-2 pr-8 text-3xl font-extrabold text-slate-900">Contact {selectedVendor.business_name}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">We’ll email you a secure confirmation link. Once confirmed, the enquiry is sent and your private inbox is created automatically.</p>

            <form onSubmit={handleEnquiry} className="mt-6 grid gap-4 sm:grid-cols-2">
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Your name" required minLength={2} className="rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-orange-400" />
              <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Your email" required className="rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-orange-400" />
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What do you need?" required minLength={2} maxLength={160} className="rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-orange-400 sm:col-span-2" />
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} aria-label="Event date" className="rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-orange-400" />
              <input value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="Event location" minLength={2} maxLength={200} className="rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-orange-400" />
              <textarea value={enquiryMessage} onChange={(e) => setEnquiryMessage(e.target.value)} placeholder="Tell the vendor about your celebration, guest numbers and what you need." required minLength={10} maxLength={5000} rows={5} className="rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-orange-400 sm:col-span-2" />
              <button type="submit" disabled={submitting} className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2">{submitting ? "Preparing secure enquiry…" : "Confirm and send enquiry"}</button>
            </form>
            {formMessage && <div className="mt-5 rounded-xl bg-orange-50 p-4 text-sm font-medium leading-6 text-slate-700">{formMessage}</div>}
          </div>
        </div>
      )}
    </section>
  );
}
/bin/bash: line 2: ___FILE_SPLIT___: command not found
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
