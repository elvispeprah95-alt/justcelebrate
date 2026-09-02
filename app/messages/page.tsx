"use client";

import { useEffect, useState } from "react";
import { supabase } from "../supabase";

type Message = {
  id: string;
  sender_email: string;
  recipient_email: string;
  message: string;
  created_at: string;
};

export default function MessagesPage() {
  const [userEmail, setUserEmail] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMessages() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        setLoading(false);
        return;
      }

      setUserEmail(user.email);

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_email.eq.${user.email},recipient_email.eq.${user.email}`)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setMessages(data);
      }

      setLoading(false);
    }

    loadMessages();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <p>Loading your messages...</p>
      </main>
    );
  }

  if (!userEmail) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">
            Your messages
          </h1>

          <p className="mt-4 text-slate-600">
            Please log in to view your enquiries and vendor replies.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">
            Just Celebrate
          </p>

          <h1 className="mt-2 text-4xl font-bold text-slate-900">
            My messages
          </h1>

          <p className="mt-2 text-slate-600">
            Your enquiries and replies from vendors will appear here.
          </p>
        </div>

        {messages.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              No messages yet
            </h2>

            <p className="mt-2 text-slate-600">
              When you contact a vendor, your conversation will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold text-slate-900">
                    {item.sender_email === userEmail
                      ? `To: ${item.recipient_email}`
                      : `From: ${item.sender_email}`}
                  </p>

                  <span className="text-xs text-slate-400">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="mt-4 text-slate-700">{item.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
