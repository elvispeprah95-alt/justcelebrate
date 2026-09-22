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

  useEffect(() => {
    try {
      const plan = JSON.parse(localStorage.getItem(plannerKey) || "{}");
      setPicked(Array.isArray(plan.services) ? plan.services : []);
    } catch {}

    const hash = window.location.hash.replace("#vendors-", "");
    if (Object.values(serviceHashes).includes(hash)) setFinding(true);
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
    <main className="min-h-screen bg-[#faf8f2] text-[#103f3a]">
      <header className="border-b border-[#e5e1d7] bg-[#fffdf8]">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-5 py-5">
          <Link href="/celebration-planner/index.html" className="text-[24px] font-medium tracking-[-.05em] text-[#123f3b]">
            <span className="text-[#f36f45]">Just</span>Celebrate<span className="text-[#f36f45]">.</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm font-medium">
            <Link href="/celebration-planner/index.html" className="rounded-full px-4 py-2 hover:bg-[#f2f3ea]">Home</Link>
            <Link href="/celebration-planner/index.html?fresh=1" className="rounded-full border border-[#a9b9a5] px-4 py-2">＋ Start a new celebration</Link>
            <Link href="/celebration-planner/index.html#planner" className="rounded-full bg-[#0b5048] px-5 py-2.5 text-white">My Planning Portal →</Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6">
        <div className="mb-5 grid overflow-hidden rounded-2xl border border-[#dfe3d8] bg-[#f1f3eb] lg:grid-cols-3">
          <div className="p-5"><b>✓　The occasion</b><p className="pl-7 text-sm text-slate-500">Start with the essentials</p></div>
          <button type="button" onClick={backToServices} className={`${finding ? "" : "bg-[#edf2e9]"} p-5 text-left`}>
            <b><span className="mr-3 rounded-full bg-[#075047] px-3 py-2 text-white">2</span>Choose your services</b>
            <p className="pl-12 text-sm text-slate-500">What do you need?</p>
          </button>
          <Link href="/celebration-planner/index.html#planner" className="p-5"><b>③　My Planning Portal</b><p className="pl-7 text-sm text-slate-500">Your chosen suppliers</p></Link>
        </div>

        {!finding ? (
          <section className="mx-auto max-w-[900px] rounded-[1.6rem] border border-[#dfe3d8] bg-white p-6 sm:p-9">
            <p className="text-xs font-bold tracking-[.16em] text-[#637976]">STEP 02 / CHOOSE YOUR SERVICES</p>
            <h1 className="mt-4 text-3xl font-medium tracking-tight">What do you need for your celebration?</h1>
            <p className="mt-2 text-slate-500">Choose as little or as much as you need. You can change it any time.</p>
            <p className="mt-4 inline-flex rounded-full bg-[#f1f3eb] px-4 py-2 text-sm text-[#56704d]">Your choices stay private and save on this device.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {services.map(([id, icon, name, description]) => (
                <button key={id} onClick={() => chooseService(id)} className="flex min-h-20 items-center gap-4 rounded-xl border border-[#e1e2dc] p-5 text-left transition hover:border-[#91a58d] hover:bg-[#f7f9f3]">
                  <span className="w-7 text-2xl text-[#365f4b]">{icon}</span>
                  <span className="flex-1"><b className="block">{name}</b><small className="text-slate-500">{description}</small></span>
                  <span className={`flex size-6 items-center justify-center rounded-full border ${picked.includes(id) ? "border-[#075047] bg-[#075047] text-white" : ""}`}>{picked.includes(id) ? "✓" : ""}</span>
                </button>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
              <Link href="/celebration-planner/index.html" className="font-semibold">← Home</Link>
              <Link href="/celebration-planner/index.html#planner" className="rounded-xl bg-[#075047] px-6 py-4 font-semibold text-white">Open my planning portal →</Link>
            </div>
          </section>
        ) : (
          <section className="mx-auto max-w-[1050px]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={backToServices} className="rounded-full border border-[#cfd8cb] bg-white px-5 py-3 text-sm font-semibold">← Back to Choose your services</button>
              <Link href="/celebration-planner/index.html#planner" className="rounded-full bg-[#075047] px-5 py-3 text-sm font-semibold text-white">My Planning Portal →</Link>
            </div>
            <div className="overflow-hidden rounded-[1.6rem] border border-[#dfe3d8] bg-white"><VendorDirectory /></div>
          </section>
        )}
      </div>
    </main>
  );
}
