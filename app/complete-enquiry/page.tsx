"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../supabase";

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

const ENQUIRY_DRAFT_KEY = "just-celebrate-enquiry-draft";

export default function CompleteEnquiryPage() {
  const router = useRouter();
  const started = useRef(false);
  const [status, setStatus] = useState("Confirming your secure enquiry…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function completeEnquiry() {
      if (started.current) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      started.current = true;

      const savedDraft = localStorage.getItem(ENQUIRY_DRAFT_KEY);
      if (!savedDraft) {
        setFailed(true);
        setStatus("We couldn't find the enquiry details on this device. Please return to the vendor and try again.");
        return;
      }

      let draft: EnquiryDraft;
      try {
        draft = JSON.parse(savedDraft) as EnquiryDraft;
      } catch {
        setFailed(true);
        setStatus("The saved enquiry is invalid. Please return to the vendor and try again.");
        return;
      }

      if (user.email?.toLowerCase() !== draft.customerEmail.toLowerCase()) {
        setFailed(true);
        setStatus("Please open the confirmation link sent to the same email address used for the enquiry.");
        return;
      }

      const { data: conversation, error: conversationError } = await supabase
        .from("conversations")
        .insert({
          customer_id: user.id,
          vendor_external_id: draft.vendorId,
          vendor_name: draft.vendorName,
          vendor_email: draft.vendorEmail,
          subject: draft.subject,
          event_date: draft.eventDate || null,
          event_location: draft.eventLocation || null,
        })
        .select("id")
        .single();

      if (conversationError || !conversation) {
        setFailed(true);
        setStatus("We couldn't create your enquiry. Please return to the vendor and try again.");
        return;
      }

      const { error: messageError } = await supabase.from("messages").insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        sender_type: "customer",
        body: draft.message,
      });

      if (messageError) {
        setFailed(true);
        setStatus("Your conversation was created, but the message could not be sent. Please open your inbox and try again.");
        return;
      }

      localStorage.removeItem(ENQUIRY_DRAFT_KEY);
      setStatus("Your enquiry has been sent. Opening your private inbox…");
      window.setTimeout(() => {
        router.push(`/messages?conversation=${conversation.id}`);
      }, 900);
    }

    completeEnquiry();
    const { data: listener } = supabase.auth.onAuthStateChange(() => completeEnquiry());
    return () => listener.subscription.unsubscribe();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-500">Just Celebrate</p>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900">{failed ? "Enquiry needs attention" : "Sending your enquiry"}</h1>
        <p className="mt-4 leading-7 text-slate-600">{status}</p>
        {failed && <Link href="/#vendors" className="mt-6 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600">Return to vendors</Link>}
      </div>
    </main>
  );
}
