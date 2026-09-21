"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase, vendorDirectoryKey, vendorDirectoryUrl } from "../supabase";

type Vendor = { id: string; business_name: string; category: string; town: string; website: string };
type Override = Partial<Vendor> & { external_id: string; is_hidden?: boolean; listing_status?: string };
type ListingDetails = { business_name: string; category: string; town: string; website: string; phone: string; coverage_areas: string; description: string };
type ClaimDraft = { kind: "claim" | "new"; externalVendorId: string; vendorName: string; claimantEmail: string; evidence: string; listingDetails?: ListingDetails };

const CLAIM_DRAFT_KEY = "just-celebrate-claim-draft";
const PAGE_SIZE = 1000;
const categories = ["Cakes & desserts", "Catering", "Decor & balloons", "DJs & music", "Entertainment", "Flowers", "Photography & video", "Venues", "Other"];

export default function ClaimBusinessPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"choose" | "claim" | "new">("choose");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [email, setEmail] = useState("");
  const [evidence, setEvidence] = useState("");
  const [listing, setListing] = useState<ListingDetails>({ business_name: "", category: "", town: "", website: "", phone: "", coverage_areas: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadVendors() {
      try {
        const source: Vendor[] = [];
        for (let offset = 0; ; offset += PAGE_SIZE) {
          const response = await fetch(`${vendorDirectoryUrl}/rest/v1/vendor_profiles?status=eq.approved&select=id,business_name,category,town,website&order=business_name.asc&offset=${offset}&limit=${PAGE_SIZE}`, { headers: { apikey: vendorDirectoryKey, Authorization: `Bearer ${vendorDirectoryKey}` } });
          if (!response.ok) throw new Error("Could not load businesses");
          const batch = (await response.json()) as Vendor[];
          source.push(...batch);
          if (batch.length < PAGE_SIZE) break;
        }
        const { data, error } = await supabase.from("vendor_listing_overrides").select("*");
        if (error) throw error;
        const overrides = (data || []) as Override[];
        const overrideMap = new Map(overrides.map((item) => [item.external_id, item]));
        const sourceIds = new Set(source.map((item) => item.id));
        const standalone = overrides.filter((item) => !sourceIds.has(item.external_id)).map((item) => ({ id: item.external_id, business_name: item.business_name || "Managed business", category: item.category || "Other", town: item.town || "", website: item.website || "" }));
        setVendors([...standalone, ...source].map((vendor) => ({ ...vendor, ...overrideMap.get(vendor.id), id: vendor.id })).filter((vendor) => {
          const managed = vendor as Vendor & { is_hidden?: boolean; listing_status?: string };
          return !managed.is_hidden && managed.listing_status !== "suspended";
        }));
      } catch {
        setMessage("We couldn't load the business directory. Please refresh and try again.");
      } finally {
        setLoading(false);
      }
    }
    void loadVendors();
  }, []);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    return vendors.filter((vendor) => [vendor.business_name, vendor.category, vendor.town].some((value) => (value || "").toLowerCase().includes(term))).slice(0, 20);
  }, [query, vendors]);

  async function verifyAndContinue(draft: ClaimDraft) {
    setSubmitting(true); setMessage("");
    localStorage.setItem(CLAIM_DRAFT_KEY, JSON.stringify(draft));
    localStorage.setItem("just-celebrate-post-auth", "claim");
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email?.toLowerCase() === draft.claimantEmail) { router.push("/complete-claim"); return; }
    const { error } = await supabase.auth.signInWithOtp({
      email: draft.claimantEmail,
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: true, data: { display_name: draft.vendorName, account_type: "vendor" } },
    });
    if (error) {
      localStorage.removeItem("just-celebrate-post-auth");
      setMessage(error.status === 429 ? "Too many email links were requested. Please wait before trying again." : "We couldn't send the verification link. Please try again.");
    } else {
      setMessage("Check your business email and click the secure link to submit your request.");
    }
    setSubmitting(false);
  }

  async function submitClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    await verifyAndContinue({ kind: "claim", externalVendorId: selected.id, vendorName: selected.business_name, claimantEmail: email.trim().toLowerCase(), evidence: evidence.trim() });
  }

  async function submitNewListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const details = { ...listing, business_name: listing.business_name.trim(), category: listing.category.trim(), town: listing.town.trim(), website: listing.website.trim(), phone: listing.phone.trim(), coverage_areas: listing.coverage_areas.trim(), description: listing.description.trim() };
    await verifyAndContinue({ kind: "new", externalVendorId: `new-${crypto.randomUUID()}`, vendorName: details.business_name, claimantEmail: email.trim().toLowerCase(), evidence: "New business listing request.", listingDetails: details });
  }

  const updateListing = (field: keyof ListingDetails, value: string) => setListing((current) => ({ ...current, [field]: value }));

  return <main className="min-h-screen bg-[#f7f3ea] px-6 py-12 text-[#0d3835]"><div className="mx-auto max-w-5xl">
    <header className="rounded-3xl bg-[#0d3835] p-8 text-white sm:flex sm:items-center sm:justify-between"><div><p className="text-sm font-bold tracking-[0.2em] text-[#ffaaa5]">JUST CELEBRATE</p><h1 className="mt-2 text-4xl font-bold">List or claim your business</h1></div><Link href="/" className="mt-5 inline-flex rounded-xl border border-white/30 px-4 py-2 text-sm font-bold sm:mt-0">Back to website</Link></header>
    <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      {mode === "choose" && <div><p className="text-lg font-semibold">Join the Just Celebrate marketplace.</p><p className="mt-2 leading-7 text-[#65706e]">Already have a listing with us? Claim it. New to Just Celebrate? Send us your business details for approval.</p><div className="mt-6 grid gap-4 md:grid-cols-2"><button type="button" onClick={() => { setMode("claim"); setMessage(""); }} className="rounded-2xl border-2 border-[#0d3835] p-6 text-left hover:bg-[#f7f3ea]"><p className="text-xl font-bold">Claim my existing listing</p><p className="mt-2 text-sm leading-6 text-[#65706e]">Find a business we have already added, verify your email, and manage it once approved.</p></button><button type="button" onClick={() => { setMode("new"); setMessage(""); }} className="rounded-2xl bg-[#ff655d] p-6 text-left text-white hover:bg-[#ef544d]"><p className="text-xl font-bold">List a new business</p><p className="mt-2 text-sm leading-6 text-white/85">Tell us about your business and we will review it before it appears on Just Celebrate.</p></button></div></div>}

      {mode === "claim" && <div><button type="button" onClick={() => { setMode("choose"); setSelected(null); }} className="text-sm font-bold underline">← Back</button><p className="mt-5 text-lg font-semibold">Find the listing we have already created for your business.</p><label className="mt-5 block text-sm font-bold">Business name or town<input value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); }} placeholder="Start typing your business name" className="mt-2 w-full rounded-2xl border border-[#d9d5cc] px-4 py-3 font-normal outline-none focus:border-[#ff655d]" /></label>{loading ? <p className="mt-5 text-sm text-[#65706e]">Loading businesses…</p> : query.trim().length >= 2 && results.length === 0 ? <div className="mt-5 rounded-2xl bg-[#f7f3ea] p-4"><p className="text-sm text-[#65706e]">No matching listing found.</p><button type="button" onClick={() => setMode("new")} className="mt-2 text-sm font-bold text-[#e8534c] underline">List a new business instead →</button></div> : null}{results.length > 0 && !selected ? <div className="mt-4 overflow-hidden rounded-2xl border border-[#e5e0d7]">{results.map((vendor) => <button key={vendor.id} type="button" onClick={() => setSelected(vendor)} className="block w-full border-b border-[#eee9df] p-4 text-left last:border-0 hover:bg-[#fff7f1]"><span className="font-bold">{vendor.business_name}</span><span className="mt-1 block text-sm text-[#65706e]">{vendor.category}{vendor.town ? ` · ${vendor.town}` : ""}</span></button>)}</div> : null}{selected ? <form onSubmit={submitClaim} className="mt-6 rounded-2xl bg-[#f7f3ea] p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-[#ff655d]">Selected listing</p><h2 className="mt-1 text-xl font-bold">{selected.business_name}</h2><p className="text-sm text-[#65706e]">{selected.category}{selected.town ? ` · ${selected.town}` : ""}</p></div><button type="button" onClick={() => setSelected(null)} className="text-sm font-bold underline">Change</button></div><label className="mt-5 block text-sm font-bold">Your business email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@yourbusiness.co.uk" className="mt-2 w-full rounded-xl border border-[#d9d5cc] bg-white px-4 py-3 font-normal outline-none focus:border-[#ff655d]" /></label><label className="mt-4 block text-sm font-bold">How can we verify you represent this business?<textarea required minLength={10} maxLength={1000} rows={4} value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="For example: your role, business website, or the phone number shown on the listing." className="mt-2 w-full rounded-xl border border-[#d9d5cc] bg-white p-4 font-normal outline-none focus:border-[#ff655d]" /></label><p className="mt-2 text-xs leading-5 text-[#65706e]">Never send passwords, bank details or identity documents.</p><button disabled={submitting} className="mt-5 w-full rounded-xl bg-[#ff655d] px-5 py-3 font-bold text-white disabled:opacity-50">{submitting ? "Sending verification…" : "Verify email and claim listing"}</button></form> : null}</div>}

      {mode === "new" && <form onSubmit={submitNewListing}><button type="button" onClick={() => setMode("choose")} className="text-sm font-bold underline">← Back</button><h2 className="mt-5 text-2xl font-bold">List a new business</h2><p className="mt-2 text-sm leading-6 text-[#65706e]">Once you verify the business email, your listing will wait for Just Celebrate approval.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold sm:col-span-2">Business name<input required maxLength={120} value={listing.business_name} onChange={(event) => updateListing("business_name", event.target.value)} className="mt-2 w-full rounded-xl border border-[#d9d5cc] px-4 py-3 font-normal outline-none focus:border-[#ff655d]" /></label><label className="text-sm font-bold">Business email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@yourbusiness.co.uk" className="mt-2 w-full rounded-xl border border-[#d9d5cc] px-4 py-3 font-normal outline-none focus:border-[#ff655d]" /></label><label className="text-sm font-bold">Category<select required value={listing.category} onChange={(event) => updateListing("category", event.target.value)} className="mt-2 w-full rounded-xl border border-[#d9d5cc] bg-white px-4 py-3 font-normal outline-none focus:border-[#ff655d]"><option value="">Choose a category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="text-sm font-bold">Town or city<input required maxLength={100} value={listing.town} onChange={(event) => updateListing("town", event.target.value)} placeholder="e.g. London" className="mt-2 w-full rounded-xl border border-[#d9d5cc] px-4 py-3 font-normal outline-none focus:border-[#ff655d]" /></label><label className="text-sm font-bold">Phone <span className="font-normal text-[#65706e]">(optional)</span><input type="tel" maxLength={50} value={listing.phone} onChange={(event) => updateListing("phone", event.target.value)} className="mt-2 w-full rounded-xl border border-[#d9d5cc] px-4 py-3 font-normal outline-none focus:border-[#ff655d]" /></label><label className="text-sm font-bold sm:col-span-2">Website or Instagram <span className="font-normal text-[#65706e]">(optional)</span><input type="url" maxLength={500} value={listing.website} onChange={(event) => updateListing("website", event.target.value)} placeholder="https://…" className="mt-2 w-full rounded-xl border border-[#d9d5cc] px-4 py-3 font-normal outline-none focus:border-[#ff655d]" /></label><label className="text-sm font-bold sm:col-span-2">Areas you cover <span className="font-normal text-[#65706e]">(optional)</span><input maxLength={300} value={listing.coverage_areas} onChange={(event) => updateListing("coverage_areas", event.target.value)} placeholder="e.g. London, Kent and Essex" className="mt-2 w-full rounded-xl border border-[#d9d5cc] px-4 py-3 font-normal outline-none focus:border-[#ff655d]" /></label><label className="text-sm font-bold sm:col-span-2">Tell customers about your business<textarea required minLength={20} maxLength={1200} rows={4} value={listing.description} onChange={(event) => updateListing("description", event.target.value)} placeholder="What do you offer and what makes your service special?" className="mt-2 w-full rounded-xl border border-[#d9d5cc] p-4 font-normal outline-none focus:border-[#ff655d]" /></label></div><p className="mt-4 text-xs leading-5 text-[#65706e]">By submitting, you confirm these are genuine business details and you have permission to use them. We review every new listing before it goes live.</p><button disabled={submitting} className="mt-5 w-full rounded-xl bg-[#ff655d] px-5 py-3 font-bold text-white disabled:opacity-50">{submitting ? "Sending verification…" : "Verify email and submit my business"}</button></form>}
      {message && <p className="mt-5 rounded-xl bg-orange-50 p-4 text-sm font-semibold text-[#33413f]">{message}</p>}
    </section></div></main>;
}
