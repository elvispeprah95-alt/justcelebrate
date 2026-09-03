"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase, vendorDirectoryKey, vendorDirectoryUrl } from "../supabase";

type Profile = {
  id: string;
  display_name: string;
  email: string | null;
  account_type: string;
  created_at: string;
};

type Conversation = {
  id: string;
  vendor_name: string | null;
  subject: string;
  status: string;
  last_message_at: string;
};

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingLink, setSendingLink] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notice, setNotice] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [vendorCount, setVendorCount] = useState(0);

  useEffect(() => {
    async function loadAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: refreshed } = await supabase.auth.refreshSession();
      const user = refreshed.session?.user || session.user;
      if (user.app_metadata?.account_type !== "admin") {
        setNotice("This account does not have Just Celebrate admin access.");
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      const [profileResult, conversationResult, messageResult, vendorResult] = await Promise.all([
        supabase.from("profiles").select("id,display_name,email,account_type,created_at").order("created_at", { ascending: false }),
        supabase.from("conversations").select("id,vendor_name,subject,status,last_message_at").order("last_message_at", { ascending: false }).limit(20),
        supabase.from("messages").select("id", { count: "exact", head: true }),
        fetch(`${vendorDirectoryUrl}/rest/v1/vendor_profiles?status=eq.approved&select=id&limit=1`, {
          headers: {
            apikey: vendorDirectoryKey,
            Authorization: `Bearer ${vendorDirectoryKey}`,
            Prefer: "count=exact",
          },
        }),
      ]);

      if (profileResult.error || conversationResult.error || messageResult.error) {
        setNotice("Some admin information could not be loaded. Please refresh and try again.");
      }

      setProfiles((profileResult.data || []) as Profile[]);
      setConversations((conversationResult.data || []) as Conversation[]);
      setMessageCount(messageResult.count || 0);
      const range = vendorResult.headers.get("content-range") || "";
      setVendorCount(Number(range.split("/")[1]) || 0);
      setLoading(false);
    }

    const timer = window.setTimeout(() => void loadAdmin(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function sendAdminLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSendingLink(true);
    setNotice("");
    localStorage.setItem("just-celebrate-post-auth", "admin");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: false,
      },
    });

    if (error) {
      localStorage.removeItem("just-celebrate-post-auth");
      setNotice("We couldn't send the admin sign-in link. Check the email address and try again.");
    } else {
      setNotice("Check your email and click the secure link to open your admin dashboard.");
    }
    setSendingLink(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] text-[#0d3835]">Checking your admin access…</main>;

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f3ea] px-5 py-12 text-[#0d3835]">
        <section className="w-full max-w-md rounded-[30px] bg-white p-8 shadow-xl sm:p-10">
          <Link href="/" className="text-sm font-bold">← Just Celebrate</Link>
          <p className="mt-10 text-xs font-bold uppercase tracking-[0.28em] text-[#ff655d]">Private workspace</p>
          <h1 className="mt-3 text-4xl font-semibold">Welcome back.</h1>
          <p className="mt-3 leading-7 text-[#65706e]">Use your approved admin email to manage Just Celebrate.</p>
          <form onSubmit={sendAdminLink} className="mt-8 space-y-4">
            <label className="block text-sm font-bold" htmlFor="admin-email">Email address</label>
            <input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="w-full rounded-2xl border border-[#d9d5cc] px-4 py-4 outline-none focus:border-[#ff655d]" />
            <button disabled={sendingLink} className="w-full rounded-2xl bg-[#ff655d] px-5 py-4 font-bold text-white disabled:opacity-60">{sendingLink ? "Sending secure link…" : "Email me a secure sign-in link"}</button>
          </form>
          {notice && <p className="mt-5 rounded-2xl bg-[#fff4d6] p-4 text-sm leading-6">{notice}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-5 py-8 text-[#0d3835]">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 rounded-3xl bg-[#0d3835] p-7 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[#ffaaa5]">JUST CELEBRATE ADMIN</p>
            <h1 className="mt-2 text-3xl font-semibold">Marketplace overview</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/control-centre" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#0d3835]">Control centre</Link>
            <Link href="/admin/vendors" className="rounded-xl bg-[#ff655d] px-4 py-2 text-sm font-bold text-white">Manage vendors</Link>
            <Link href="/" className="rounded-xl border border-white/30 px-4 py-2 text-sm font-bold">View website</Link>
            <button onClick={signOut} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#0d3835]">Sign out</button>
          </div>
        </header>

        {notice && <p className="mt-5 rounded-2xl bg-[#fff4d6] p-4 text-sm">{notice}</p>}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Approved vendors", vendorCount],
            ["Registered users", profiles.length],
            ["Conversations", conversations.length],
            ["Messages", messageCount],
          ].map(([label, value]) => (
            <article key={label} className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#65706e]">{label}</p>
              <p className="mt-2 text-4xl font-semibold">{value}</p>
            </article>
          ))}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Recent conversations</h2>
            <div className="mt-5 space-y-3">
              {conversations.length === 0 ? <p className="text-sm text-[#65706e]">No enquiries have been sent yet.</p> : conversations.map((conversation) => (
                <div key={conversation.id} className="rounded-2xl bg-[#f7f3ea] p-4">
                  <div className="flex items-start justify-between gap-4"><p className="font-bold">{conversation.vendor_name || "Vendor enquiry"}</p><span className="rounded-full bg-white px-3 py-1 text-xs capitalize">{conversation.status}</span></div>
                  <p className="mt-1 text-sm text-[#65706e]">{conversation.subject}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Registered accounts</h2>
            <div className="mt-5 space-y-3">
              {profiles.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between gap-4 rounded-2xl bg-[#f7f3ea] p-4">
                  <div><p className="font-bold">{profile.display_name}</p><p className="text-sm text-[#65706e]">{profile.email}</p></div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs capitalize">{profile.account_type}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
