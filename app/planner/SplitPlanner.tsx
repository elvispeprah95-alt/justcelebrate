"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import VendorDirectory from "../VendorDirectory";

const services = [
  ["venue", "⌂", "Venue", "A place to come together"],
  ["music", "♫", "DJ & music", "Set the mood"],
  ["photography", "▣", "Photography", "Keep the memories"],
  ["catering", "⌁", "Catering", "Feed your favourite people"],
  ["cake", "♢", "Cake & treats", "Something sweet"],
  ["decor", "✣", "Decor & balloons", "Make it feel like you"],
  ["entertainment", "☆", "Entertainment", "Bring a little extra joy"],
  ["transport", "▰", "Transport", "Get everyone there"],
] as const;

const plannerKey = "just-celebrate-private-planner-v1";
const serviceHashes: Record<string, string> = {
  venue: "venues", music: "djs-music", photography: "photography-video",
  catering: "catering", cake: "cakes-treats", decor: "decor-balloons",
  entertainment: "entertainment", transport: "transport",
};

export default function SplitPlanner() {
  const [picked, setPicked] = useState<string[]>([]);
  const [finding, setFinding] = useState(false);
  const [eventLocation, setEventLocation] = useState("");

  useEffect(() => {
    const initialisePlanner = window.setTimeout(() => {
      try {
        const plan = JSON.parse(localStorage.getItem(plannerKey) || "{}");
        setPicked(Array.isArray(plan.services) ? plan.services : []);
        setEventLocation(typeof plan.details?.location === "string" ? plan.details.location : "");
      } catch {}

      const hash = window.location.hash.replace("#vendors-", "");
      if (Object.values(serviceHashes).includes(hash)) setFinding(true);
    }, 0);

    return () => window.clearTimeout(initialisePlanner);
  }, []);

  function chooseService(id: string) {
    setFinding(true);
    setPicked(current => {
      const next = current.includes(id) ? current : [...current, id];
      try {
        const plan = JSON.parse(localStorage.getItem(plannerKey) || "{}");
        localStorage.setItem(plannerKey, JSON.stringify({
          ...plan, services: next, step: 2, updatedAt: new Date().toISOString(),
        }));
      } catch {}
      return next;
    });
    window.setTimeout(() => { window.location.hash = `vendors-${serviceHashes[id]}`; }, 0);
  }

  function backToServices() {
    setFinding(false);
    window.history.replaceState(null, "", window.location.pathname);
  }

  return (
    <main className="min-h-screen bg-[#f8f6ef] text-[#103f3a]">
      <header className="border-b border-[#e5e2d8] bg-[#fffdf9]">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-7">
          <Link href="/celebration-planner/index.html" className="text-[25px] font-medium tracking-[-.06em] text-[#123f3b]">
            <span className="text-[#f36f45]">Just</span>Celebrate<span className="text-[#f36f45]">.</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <Link href="/celebration-planner/index.html?fresh=1" className="rounded-full px-4 py-2 text-[#103f3a] hover:bg-[#f0f1e9]">Start a new celebration</Link>
            <Link href="/celebration-planner/index.html#planner" className="rounded-full bg-[#103f39] px-5 py-2.5 text-white shadow-[0_5px_15px_rgba(16,63,57,.14)]">My Planning Portal</Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-7 sm:py-10">
        <div className="mb-7 rounded-[1.5rem] border border-[#e1e4da] bg-[#f1f3eb] p-3 sm:p-4">
          <div className="grid gap-2 lg:grid-cols-3">
            <div className="rounded-xl px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#78877b]">Step 01</p><b className="mt-1 block text-[15px]">Your celebration</b><p className="mt-1 text-sm text-[#718078]">The essentials are saved.</p></div>
            <button type="button" onClick={backToServices} className={`${finding ? "" : "bg-white shadow-sm"} rounded-xl px-4 py-3 text-left`}>
              <p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#78877b]">Step 02</p><b className="mt-1 block text-[15px]">Find your suppliers</b>
              <p className="mt-1 text-sm text-[#718078]">Choose what feels right.</p>
            </button>
            <Link href="/celebration-planner/index.html#planner" className="rounded-xl px-4 py-3 hover:bg-white/60"><p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#78877b]">Step 03</p><b className="mt-1 block text-[15px]">My Planning Portal</b><p className="mt-1 text-sm text-[#718078]">Your chosen suppliers.</p></Link>
          </div>
        </div>

        {!finding ? (
          <section className="mx-auto max-w-[900px] rounded-[1.75rem] border border-[#e1e3da] bg-white p-6 shadow-[0_16px_48px_rgba(16,63,57,.05)] sm:p-10">
            <p className="text-[11px] font-bold tracking-[.2em] text-[#7c8d70]">STEP 02 / FIND YOUR SUPPLIERS</p>
            <h1 className="mt-3 text-3xl font-medium tracking-[-.04em] sm:text-4xl">What do you need for your celebration?</h1>
            <p className="mt-3 max-w-xl text-[15px] leading-6 text-[#68766f]">Choose a service and browse suppliers in one calm, simple place. Your choices remain saved in your plan.</p>
            <p className="mt-5 inline-flex rounded-full bg-[#f1f3eb] px-4 py-2 text-sm text-[#56704d]">Pick one service or a few — there is no rush.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {services.map(([id, icon, name, description]) => (
                <button key={id} onClick={() => chooseService(id)} className="flex min-h-20 items-center gap-4 rounded-2xl border border-[#e3e5dc] p-5 text-left transition hover:border-[#9aaa91] hover:bg-[#f7f9f3]">
                  <span className="w-7 text-2xl text-[#365f4b]">{icon}</span>
                  <span className="flex-1"><b className="block">{name}</b><small className="text-slate-500">{description}</small></span>
                  <span className={`flex size-6 items-center justify-center rounded-full border ${picked.includes(id) ? "border-[#075047] bg-[#075047] text-white" : ""}`}>{picked.includes(id) ? "✓" : ""}</span>
                </button>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#ebe9e1] pt-6">
              <Link href="/celebration-planner/index.html#planner" className="font-semibold text-[#103f39]">Back to my plan</Link>
              <Link href="/celebration-planner/index.html#planner" className="rounded-xl bg-[#103f39] px-6 py-4 font-semibold text-white">Open my Planning Portal</Link>
            </div>
          </section>
        ) : (
          <section className="mx-auto max-w-[1050px]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={backToServices} className="rounded-full border border-[#d7ddd2] bg-white px-5 py-3 text-sm font-semibold">Back to services</button>
              <Link href="/celebration-planner/index.html#planner" className="rounded-full bg-[#103f39] px-5 py-3 text-sm font-semibold text-white">My Planning Portal</Link>
            </div>
            <div className="overflow-hidden rounded-[1.6rem] border border-[#dfe3d8] bg-white"><VendorDirectory initialLocation={eventLocation} /></div>
          </section>
        )}
      </div>
    </main>
  );
}
