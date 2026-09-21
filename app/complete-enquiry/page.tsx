"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../supabase";

export default function CompleteEnquiryPage() {
  const router = useRouter();
  const started = useRef(false);
  const [status, setStatus] = useState("Confirming your secure enquiry…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function completeEnquiry() {
      if (started.current) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setFailed(true);
        setStatus("Your secure session has expired. Please return to your planning portal and request a new link.");
        return;
      }
      started.current = true;

      const { data, error } = await supabase.functions.invoke("complete-enquiry", {
        body: {},
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) {
        let detail = "";
        const context = (error as { context?: Response }).context;
        if (context) {
          try {
            const payload: unknown = await context.clone().json();
            if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
              detail = payload.error;
            }
          } catch {
            detail = "";
          }
        }
        setFailed(true);
        setStatus(detail || "We couldn't send your enquiry. Please return to your planning portal and try again.");
        return;
      }

      if (data?.status === "empty" || data?.status === "already_processed") {
        setFailed(true);
        setStatus("We couldn't find a pending enquiry for this email. Please return to your planning portal and start again.");
        return;
      }

      if (data?.status !== "sent") {
        setFailed(true);
        setStatus(data?.error || "Your enquiry needs attention. Please return to your planning portal and try again.");
        return;
      }

      const count = Number(data.count || 0);
      setStatus(`${count} enquir${count === 1 ? "y has" : "ies have"} been sent. Opening your private inbox…`);
      window.setTimeout(() => router.push("/messages"), 900);
    }

    void completeEnquiry();
    const { data: listener } = supabase.auth.onAuthStateChange(() => void completeEnquiry());
    return () => listener.subscription.unsubscribe();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-500">Just Celebrate</p>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900">{failed ? "Enquiry needs attention" : "Sending your enquiry"}</h1>
        <p className="mt-4 leading-7 text-slate-600">{status}</p>
        {failed && <Link href="/celebration-planner/index.html#planner" className="mt-6 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600">Return to my plan</Link>}
      </div>
    </main>
  );
}
