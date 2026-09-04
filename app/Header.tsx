"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "./supabase";

export default function Header() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function continueLogin() {
      const destination = localStorage.getItem("just-celebrate-post-auth");
      if (destination !== "messages" && destination !== "admin" && destination !== "claim") return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      localStorage.removeItem("just-celebrate-post-auth");
      router.push(destination === "admin" ? "/admin" : destination === "claim" ? "/complete-claim" : "/messages");
    }

    void continueLogin();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void continueLogin(), 0);
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      setMessage("Please enter your email address.");
      return;
    }

    setLoading(true);
    setMessage("");
    localStorage.setItem("just-celebrate-post-auth", "messages");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: true,
        data: { account_type: "vendor" },
      },
    });

    if (error) {
      localStorage.removeItem("just-celebrate-post-auth");
      setMessage("We couldn't send your login link. Please try again.");
    } else {
      setMessage("Check your email. We've sent you a secure sign-in link.");
    }

    setLoading(false);
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
          <div className="text-4xl font-extrabold tracking-tight">
            <span className="text-orange-500">Just</span>
            <span className="text-slate-900">Celebrate</span>
          </div>

          <nav className="hidden gap-8 text-base font-semibold text-slate-700 md:flex">
            <a href="#" className="transition hover:text-orange-500">
              Home
            </a>
            <a href="#vendors" className="transition hover:text-orange-500">
              Vendors
            </a>
            <a href="#services" className="transition hover:text-orange-500">
              Categories
            </a>
            <a href="#" className="transition hover:text-orange-500">
              About
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/claim-business"
              className="hidden rounded-full bg-orange-500 px-6 py-2 text-sm font-semibold text-white hover:bg-orange-600 sm:block"
            >
              List your business
            </Link>

            <button
              onClick={() => {
                setMessage("");
                setShowLogin(true);
              }}
              className="rounded-full px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-100"
            >
              Vendor login
            </button>
          </div>
        </div>
      </header>

      {showLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <button
              onClick={() => setShowLogin(false)}
              className="absolute right-5 top-4 text-2xl text-slate-400 hover:text-slate-700"
              aria-label="Close login"
            >
              ×
            </button>

            <p className="mb-2 text-sm font-bold uppercase tracking-[0.25em] text-orange-500">
              Just Celebrate
            </p>
            <h2 className="text-3xl font-extrabold text-slate-900">
              Vendor login
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Enter your business email and we’ll send you a secure sign-in link. No password needed.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Your email address"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-orange-400"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending link..." : "Email me a login link"}
              </button>
            </form>

            {message && (
              <div className="mt-5 rounded-xl bg-orange-50 p-4 text-sm font-medium text-slate-700">
                {message}
              </div>
            )}

            <p className="mt-5 text-center text-xs text-slate-500">
              Vendors can use this secure login to access their account.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
