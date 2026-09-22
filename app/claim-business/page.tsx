"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase, vendorDirectoryKey, vendorDirectoryUrl } from "../supabase";
import { savePendingListingMedia } from "./media-draft";

type Vendor = { id: string; business_name: string; category: string; town: string; website: string };
type Override = Partial<Vendor> & { external_id: string; is_hidden?: boolean; listing_status?: string };
type ListingDetails = { business_name: string; category: string; town: string; website: string; phone: string; coverage_areas: string; description: string };
type ClaimDraft = { kind: "claim" | "new"; externalVendorId: string; vendorName: string; claimantEmail: string; evidence: string; listingDetails?: ListingDetails; mediaDraftId?: string };

const CLAIM_DRAFT_KEY = "just-celebrate-claim-draft";
const PAGE_SIZE = 1000;
const categories = ["Cakes & desserts", "Catering", "Decor & balloons", "DJs & music", "Entertainment", "Flowers", "Photography & video", "Venues", "Other"];
const supportedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageBytes = 8 * 1024 * 1024;

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
  const [logo, setLogo] = useState<File | null>(null);
  const [workImages, setWorkImages] = useState<File[]>([]);

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
    let mediaDraftId: string | undefined;
    if (logo || workImages.length > 0) {
      setSubmitting(true);
      try {
        mediaDraftId = crypto.randomUUID();
        await savePendingListingMedia(mediaDraftId, { logo, workImages });
      } catch {
        setSubmitting(false);
        setMessage("We couldn't save your images in this browser. Please choose them again and try once more.");
        return;
      }
    }
    await verifyAndContinue({ kind: "new", externalVendorId: `new-${crypto.randomUUID()}`, vendorName: details.business_name, claimantEmail: email.trim().toLowerCase(), evidence: "New business listing request.", listingDetails: details, mediaDraftId });
  }

  function validateImages(files: File[]) {
    if (files.some((file) => !supportedImageTypes.includes(file.type))) return "Please choose JPEG, PNG or WebP images only.";
    if (files.some((file) => file.size > maxImageBytes)) return "Each image must be 8 MB or smaller.";
    return "";
  }

  function chooseLogo(file: File | null) {
    if (!file) return setLogo(null);
    const problem = validateImages([file]);
    if (problem) return setMessage(problem);
    setMessage(""); setLogo(file);
  }

  function chooseWorkImages(files: File[]) {
    if (files.length > 8) return setMessage("Please choose no more than 8 work photos.");
    const problem = validateImages(files);
    if (problem) return setMessage(problem);
    setMessage(""); setWorkImages(files);
  }

  const updateListing = (field: keyof ListingDetails, value: string) => setListing((current) => ({ ...current, [field]: value }));

  return <main className="min-h-screen bg-[#fcfaf6] font-[family-name:var(--font-geist-sans)] text-[#162d29]">
    <header className="border-b border-[#e6e8df] bg-[#fcfaf6]"><div className="mx-auto flex h-[82px] max-w-[1328px] items-center justify-between gap-5 px-6 sm:px-10"><Link href="/" className="whitespace-nowrap text-[25px] font-extrabold tracking-[-1.4px] text-[#142031]"><span className="text-[#f97316]">Just</span>Celebrate<span className="text-[#f97316]">.</span></Link><p className="hidden text-xs text-[#66746d] md:block">A little help. A lovely celebration.</p><Link href="/" className="rounded-full border border-[#b8c8bd] px-4 py-2 text-xs font-semibold text-[#103f39] transition hover:bg-[#f0f1e9]">Back to website</Link></div></header>
    <div className="mx-auto max-w-5xl px-5 py-9 sm:px-8 sm:py-14">
    <header className="overflow-hidden rounded-[22px] bg-[#103f39] px-7 py-9 text-white sm:px-12 sm:py-12"><p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.22em] text-[#dfd7b7]"><span className="text-lg text-[#ee9d78]">✦</span> FOR THE PEOPLE WHO MAKE CELEBRATIONS HAPPEN</p><h1 className="mt-4 text-[clamp(38px,5vw,58px)] font-medium leading-[1.04] tracking-[-2px]">Your business.<br/><em className="font-serif font-normal text-[#f2bca2]">More to celebrate.</em></h1><p className="mt-5 max-w-xl text-sm leading-7 text-[#d6e2dc]">Join Just Celebrate, meet people planning their special moments, and manage your enquiries in one place.</p></header>
    <section className="mt-5 rounded-[18px] border border-[#e6e8df] bg-white p-6 shadow-[0_10px_26px_rgba(16,63,57,0.06)] sm:p-9">
      {mode === "choose" && <div><p className="text-[10px] font-bold tracking-[0.18em] text-[#7d8978]">HOW WOULD YOU LIKE TO JOIN?</p><h2 className="mt-3 text-3xl font-semibold tracking-[-1px] text-[#162d29]">One simple place for every supplier.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-[#66746d]">Choose the option that matches your business today. Every new listing is reviewed before it appears on Just Celebrate.</p><div className="mt-8 grid gap-4 md:grid-cols-2"><button type="button" onClick={() => { setMode("claim"); setMessage(""); }} className="group rounded-[14px] border border-[#d9e2da] bg-[#fbfcf8] p-6 text-left transition hover:-translate-y-0.5 hover:border-[#9bb3a4] hover:bg-[#f4f7f0]"><p className="text-[10px] font-bold tracking-[0.15em] text-[#7d8978]">ALREADY LISTED</p><p className="mt-3 text-xl font-semibold tracking-[-0.5px] text-[#103f39]">Claim my existing listing <span className="ml-1 text-[#ef7869]">→</span></p><p className="mt-3 text-sm leading-6 text-[#66746d]">Find a business we have already added, verify your email, and manage it once approved.</p></button><button type="button" onClick={() => { setMode("new"); setMessage(""); }} className="group rounded-[14px] bg-[#ef7869] p-6 text-left text-[#172e29] shadow-[0_8px_22px_rgba(239,120,105,0.2)] transition hover:-translate-y-0.5 hover:bg-[#f18b7d]"><p className="text-[10px] font-bold tracking-[0.15em] text-[#4b3b34]">NEW TO JUST CELEBRATE</p><p className="mt-3 text-xl font-semibold tracking-[-0.5px]">List a new business <span className="ml-1">→</span></p><p className="mt-3 text-sm leading-6 text-[#3f443b]">Tell us about your business and we will review it before it appears on Just Celebrate.</p></button></div><p className="mt-6 text-xs text-[#7b887d]">No fees or commitment at this stage — just tell us about your business.</p></div>}

      {mode === "claim" && <div><button type="button" onClick={() => { setMode("choose"); setSelected(null); }} className="text-sm font-bold underline">← Back</button><p className="mt-5 text-lg font-semibold">Find the listing we have already created for your business.</p><label className="mt-5 block text-sm font-bold">Business name or town<input value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); }} placeholder="Start typing your business name" className="mt-2 w-full rounded-2xl border border-[#d9d5cc] px-4 py-3 font-normal outline-none focus:border-[#ff655d]" /></label>{loading ? <p className="mt-5 text-sm text-[#65706e]">Loading businesses…</p> : query.trim().length >= 2 && results.length === 0 ? <div className="mt-5 rounded-2xl bg-[#f7f3ea] p-4"><p className="text-sm text-[#65706e]">No matching listing found.</p><button type="button" onClick={() => setMode("new")} className="mt-2 text-sm font-bold text-[#e8534c] underline">List a new business instead →</button></div> : null}{results.length > 0 && !selected ? <div className="mt-4 overflow-hidden rounded-2xl border border-[#e5e0d7]">{results.map((vendor) => <button key={vendor.id} type="button" onClick={() => setSelected(vendor)} className="block w-full border-b border-[#eee9df] p-4 text-left last:border-0 hover:bg-[#fff7f1]"><span className="font-bold">{vendor.business_name}</span><span className="mt-1 block text-sm text-[#65706e]">{vendor.category}{vendor.town ? ` · ${vendor.town}` : ""}</span></button>)}</div> : null}{selected ? <form onSubmit={submitClaim} className="mt-6 rounded-2xl bg-[#f7f3ea] p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-[#ff655d]">Selected listing</p><h2 className="mt-1 text-xl font-bold">{selected.business_name}</h2><p className="text-sm text-[#65706e]">{selected.category}{selected.town ? ` · ${selected.town}` : ""}</p></div><button type="button" onClick={() => setSelected(null)} className="text-sm font-bold underline">Change</button></div><label className="mt-5 block text-sm font-bold">Your business email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@yourbusiness.co.uk" className="mt-2 w-full rounded-xl border border-[#d9d5cc] bg-white px-4 py-3 font-normal outline-none focus:border-[#ff655d]" /></label><label className="mt-4 block text-sm font-bold">How can we verify you represent this business?<textarea required minLength={10} maxLength={1000} rows={4} value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="For example: your role, business website, or the phone number shown on the listing." className="mt-2 w-full rounded-xl border border-[#d9d5cc] bg-white p-4 font-normal outline-none focus:border-[#ff655d]" /></label><p className="mt-2 text-xs leading-5 text-[#65706e]">Never send passwords, bank details or identity documents.</p><button disabled={submitting} className="mt-5 w-full rounded-xl bg-[#ff655d] px-5 py-3 font-bold text-white disabled:opacity-50">{submitting ? "Sending verification…" : "Verify email and claim listing"}</button></form> : null}</div>}

      {mode === "new" && <form onSubmit={submitNewListing}><button type="button" onClick={() => setMode("choose")} className="text-sm font-bold underline">← Back</button><h2 className="mt-5 text-2xl font-bold">List a new business</h2><p className="mt-2 text-sm leading-6 text-[#65706e]">Once you verify the business email, your listing will wait for Just Celebrate approval.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold sm:col-span-2">Business name<input required maxLength={120} value={listing.business_name} onChange={(event) => updateListing("business_name", event.target.value)} className="mt-2 w-full rounded-xl border border-[#d9d5cc] px-4 py-3 font-normal outline-none focus:border-[#ff655d]" /></label><label className="text-sm font-bold">Business email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@yourbusiness.co.uk" className="mt-2 w-full rounded-xl border border-[#d9d5cc] px-4 py-3 font-normal outline-none focus:border-[#ff655d]" /></label><label className="text-sm font-bold">Category<select required value={listing.category} onChange={(event) => updateListing("category", event.target.value)} className="mt-2 w-full rounded-xl border border-[#d9d5cc] bg-white px-4 py-3 font-normal outline-none focus:border-[#ff655d]"><option value="">Choose a category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="text-sm font-bold">Town or city<input required maxLength={100} value={listing.town} onChange={(event) => updateListing("town", event.target.value)} placeholder="e.g. London" className="mt-2 w-full rounded-xl border border-[#d9d5cc] px-4 py-3 font-normal outline-none focus:border-[#ff655d]" /></label><label className="text-sm font-bold">Phone <span className="font-normal text-[#65706e]">(optional)</span><input type="tel" maxLength={50} value={listing.phone} onChange={(event) => updateListing("phone", event.target.value)} className="mt-2 w-full rounded-xl border border-[#d9d5cc] px-4 py-3 font-normal outline-none focus:border-[#ff655d]" /></label><label className="text-sm font-bold sm:col-span-2">Website or Instagram <span className="font-normal text-[#65706e]">(optional)</span><input type="url" maxLength={500} value={listing.website} onChange={(event) => updateListing("website", event.target.value)} placeholder="https://…" className="mt-2 w-full rounded-xl border border-[#d9d5cc] px-4 py-3 font-normal outline-none focus:border-[#ff655d]" /></label><label className="text-sm font-bold sm:col-span-2">Areas you cover <span className="font-normal text-[#65706e]">(optional)</span><input maxLength={300} value={listing.coverage_areas} onChange={(event) => updateListing("coverage_areas", event.target.value)} placeholder="e.g. London, Kent and Essex" className="mt-2 w-full rounded-xl border border-[#d9d5cc] px-4 py-3 font-normal outline-none focus:border-[#ff655d]" /></label><label className="text-sm font-bold sm:col-span-2">Tell customers about your business<textarea required minLength={20} maxLength={1200} rows={4} value={listing.description} onChange={(event) => updateListing("description", event.target.value)} placeholder="What do you offer and what makes your service special?" className="mt-2 w-full rounded-xl border border-[#d9d5cc] p-4 font-normal outline-none focus:border-[#ff655d]" /></label><div className="rounded-[14px] border border-[#d9e2da] bg-[#fbfcf8] p-5 sm:col-span-2"><p className="text-[10px] font-bold tracking-[0.16em] text-[#7d8978]">SHOW CUSTOMERS YOUR WORK <span className="font-normal normal-case tracking-normal">(optional)</span></p><p className="mt-2 text-sm leading-6 text-[#66746d]">Add a logo and up to 8 work photos. They stay private until your business has been approved.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="cursor-pointer rounded-xl border border-dashed border-[#b8c8bd] bg-white p-4 text-sm font-bold text-[#103f39]">Business logo<span className="mt-1 block text-xs font-normal text-[#66746d]">{logo ? logo.name : "JPEG, PNG or WebP · up to 8 MB"}</span><span className="mt-3 inline-flex rounded-full bg-[#103f39] px-3 py-2 text-xs font-bold text-white">Upload logo</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseLogo(event.target.files?.[0] || null)} className="sr-only" /></label><label className="cursor-pointer rounded-xl border border-dashed border-[#b8c8bd] bg-white p-4 text-sm font-bold text-[#103f39]">Photos of your work<span className="mt-1 block text-xs font-normal text-[#66746d]">{workImages.length ? `${workImages.length} photo${workImages.length === 1 ? "" : "s"} selected` : "Choose up to 8 photos"}</span><span className="mt-3 inline-flex rounded-full bg-[#103f39] px-3 py-2 text-xs font-bold text-white">Upload photos</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseWorkImages(Array.from(event.target.files || []))} className="sr-only" /></label></div></div></div><p className="mt-4 text-xs leading-5 text-[#65706e]">By submitting, you confirm these are genuine business details and you have permission to use them. We review every new listing before it goes live.</p><button disabled={submitting} className="mt-5 w-full rounded-xl bg-[#ff655d] px-5 py-3 font-bold text-white disabled:opacity-50">{submitting ? "Sending verification…" : "Verify email and submit my business"}</button></form>}
      {message && <p className="mt-5 rounded-xl bg-orange-50 p-4 text-sm font-semibold text-[#33413f]">{message}</p>}
    </section></div></main>;
}
