"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../supabase";

type Message = {
  id: string;
  sender_id: string;
  sender_type: "customer" | "vendor";
  body: string;
  created_at: string;
};

type Conversation = {
  id: string;
  customer_id: string;
  vendor_name: string | null;
  vendor_email: string | null;
  subject: string;
  event_date: string | null;
  event_location: string | null;
  last_message_at: string;
  messages: Message[];
};

export default function MessagesPage() {
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadMessages() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      setLoading(false);
      return;
    }

    setUserId(user.id);
    setUserEmail(user.email);

    const { data, error } = await supabase
      .from("conversations")
      .select("id,customer_id,vendor_name,vendor_email,subject,event_date,event_location,last_message_at,messages(id,sender_id,sender_type,body,created_at)")
      .order("last_message_at", { ascending: false });

    if (error) {
      setErrorMessage("We couldn't load your messages. Please refresh and try again.");
    } else {
      const loaded = (data || []) as Conversation[];
      loaded.forEach((conversation) => conversation.messages.sort((a, b) => a.created_at.localeCompare(b.created_at)));
      setConversations(loaded);
      const requested = new URLSearchParams(window.location.search).get("conversation");
      setSelectedId((requested && loaded.some((item) => item.id === requested) ? requested : loaded[0]?.id) || "");
    }

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadMessages(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) || null,
    [conversations, selectedId]
  );

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !reply.trim()) return;

    setSending(true);
    setErrorMessage("");
    const senderType = selected.customer_id === userId ? "customer" : "vendor";
    const { error } = await supabase.from("messages").insert({
      conversation_id: selected.id,
      sender_id: userId,
      sender_type: senderType,
      body: reply.trim(),
    });

    if (error) {
      setErrorMessage("Your reply wasn't sent. Please try again.");
    } else {
      setReply("");
      await loadMessages();
      setSelectedId(selected.id);
    }
    setSending(false);
  }

  if (loading) return <main className="min-h-screen bg-slate-50 p-8"><p>Loading your messages…</p></main>;

  if (!userEmail) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">Your messages</h1>
          <p className="mt-4 text-slate-600">Your private inbox is created when you confirm your first official enquiry.</p>
          <Link href="/#vendors" className="mt-6 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600">Find a vendor</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">Just Celebrate</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">My messages</h1>
          </div>
          <Link href="/#vendors" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Find vendors</Link>
        </div>

        {errorMessage && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>}

        {conversations.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm"><h2 className="text-xl font-bold text-slate-900">No messages yet</h2><p className="mt-2 text-slate-600">When you contact a vendor, your conversation will appear here.</p></div>
        ) : (
          <div className="grid min-h-[620px] overflow-hidden rounded-3xl bg-white shadow-sm lg:grid-cols-[320px_1fr]">
            <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
              {conversations.map((conversation) => (
                <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`block w-full border-b border-slate-100 p-5 text-left ${selectedId === conversation.id ? "bg-orange-50" : "hover:bg-slate-50"}`}>
                  <p className="font-bold text-slate-900">{conversation.vendor_name || "Vendor enquiry"}</p>
                  <p className="mt-1 truncate text-sm text-slate-600">{conversation.subject}</p>
                </button>
              ))}
            </aside>

            {selected && (
              <section className="flex min-h-[520px] flex-col">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="text-xl font-bold text-slate-900">{selected.vendor_name || "Vendor enquiry"}</h2>
                  <p className="mt-1 text-sm text-slate-500">{selected.subject}{selected.event_location ? ` · ${selected.event_location}` : ""}{selected.event_date ? ` · ${new Date(`${selected.event_date}T00:00:00`).toLocaleDateString("en-GB")}` : ""}</p>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-5">
                  {selected.messages.map((message) => {
                    const mine = message.sender_id === userId;
                    return (
                      <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${mine ? "bg-orange-500 text-white" : "bg-white text-slate-800 shadow-sm"}`}>
                          <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                          <p className={`mt-1 text-xs ${mine ? "text-white/75" : "text-slate-400"}`}>{new Date(message.created_at).toLocaleString("en-GB")}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <form onSubmit={sendReply} className="flex gap-3 border-t border-slate-200 p-4">
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" required maxLength={5000} rows={2} className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-orange-400" />
                  <button type="submit" disabled={sending || !reply.trim()} className="self-end rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50">{sending ? "Sending…" : "Send"}</button>
                </form>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
