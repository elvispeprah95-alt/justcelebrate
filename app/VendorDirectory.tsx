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
        setVendors(
          allVendors
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
