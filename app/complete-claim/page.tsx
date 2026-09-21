"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../supabase";

type ListingDetails = { business_name: string; category: string; town: string; website: string; phone: string; coverage_areas: string; description: string };
type ClaimDraft = { kind?: "claim" | "new"; externalVendorId: string; vendorName: string; claimantEmail: string; evidence: string; listingDetails?: ListingDetails };
const CLAIM_DRAFT_KEY = "just-celebrate-claim-draft";

export default function CompleteClaimPage() {
  const [status, setStatus] = useState("Verifying your business request…");
  const [complete, setComplete] = useState(false);
  const [isNewListing, setIsNewListing] = useState(false);

  useEffect(() => {
    async function completeClaim() {
      const raw = localStorage.getItem(CLAIM_DRAFT_KEY);
      if (!raw) return setStatus("We couldn't find your saved business request. Please return and try again.");
      let draft: ClaimDraft;
      try { draft = JSON.parse(raw) as ClaimDraft; } catch { return setStatus("The saved business request is invalid. Please start again."); }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return setStatus("Please use the secure email link to verify your request.");
      if (user.email.toLowerCase() !== draft.claimantEmail.toLowerCase()) return setStatus("This login link does not match the email used for the request.");

      const isNew = draft.kind === "new";
      setIsNewListing(isNew);
      const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, display_name: draft.vendorName, email: user.email, account_type: "vendor", account_status: "active" });
      if (profileError) return setStatus("We verified your email, but couldn't create your account. Please try again.");

      const { data: existing } = await supabase.from("vendor_claims").select("id,status").eq("external_vendor_id", draft.externalVendorId).eq("submitted_by", user.id).maybeSingle();
      if (!existing) {
        const { error } = await supabase.from("vendor_claims").insert({ external_vendor_id: draft.externalVendorId, vendor_name: draft.vendorName, claimant_email: user.email.toLowerCase(), evidence: draft.evidence, listing_details: draft.listingDetails || {}, submitted_by: user.id });
        if (error) return setStatus(isNew ? "We verified your email, but couldn't submit your listing. Please try again." : "We verified your email, but couldn't submit the claim. Please try again.");
      }
      localStorage.removeItem(CLAIM_DRAFT_KEY);
      localStorage.removeItem("just-celebrate-post-auth");
      setComplete(true);
      setStatus(isNew ? "Your business has been submitted for approval. We’ll review the details before it appears on Just Celebrate." : "Your claim has been submitted for approval. We’ll email you when it has been reviewed.");
    }
    void completeClaim();
  }, []);

  const title = complete ? (isNewListing ? "Business submitted" : "Claim received") : "Completing your request";
  return <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-6 text-[#0d3835]"><section className="w-full max-w-xl rounded-3xl bg-white p-10 text-center shadow-sm"><p className="text-sm font-bold tracking-[0.2em] text-[#ff655d]">JUST CELEBRATE</p><h1 className="mt-3 text-3xl font-bold">{title}</h1><p className="mt-4 leading-7 text-[#65706e]">{status}</p><Link href={complete ? "/messages" : "/claim-business"} className="mt-7 inline-flex rounded-xl bg-[#0d3835] px-5 py-3 font-bold text-white">{complete ? "Open vendor inbox" : "Return to business page"}</Link></section></main>;
}
