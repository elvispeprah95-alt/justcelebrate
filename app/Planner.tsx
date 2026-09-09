"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const occasionOptions = ["Birthday", "Wedding", "Baby shower", "Kids party", "Engagement", "Anniversary", "Corporate event", "Other"];
const serviceOptions = ["Venue", "DJ / Music", "Photography", "Catering", "Cake & treats", "Decor & balloons", "Entertainment", "Transport"];

export default function Planner() {
  const router = useRouter();
  const [occasion, setOccasion] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [guests, setGuests] = useState("");
  const [budget, setBudget] = useState("");
  const [services, setServices] = useState<string[]>([]);

  const completed = useMemo(() => [occasion, date, location, guests, budget].filter(Boolean).length + (services.length ? 1 : 0), [occasion, date, location, guests, budget, services]);
  const progress = Math.round((completed / 6) * 100);

  function toggleService(service: string) {
    setServices((current) => current.includes(service) ? current.filter((item) => item !== service) : [...current, service]);
  }

  function continuePlanning() {
    const plan = { occasion, date, location, guests, budget, services };
    localStorage.setItem("just-celebrate-plan", JSON.stringify(plan));
    localStorage.removeItem("just-celebrate-checklist");
    localStorage.setItem("just-celebrate-spent", "0");
    router.push("/planner");
  }

  return (
    <section id="planner" className="bg-[#f8f4ec] py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ff6c63]">Your celebration planner</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#063d39] sm:text-4xl">Start with the occasion. We’ll help with the rest.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">Create the basics of your event in one place. Just Celebrate will turn them into a personal checklist, budget tracker and supplier plan.</p>
            <div className="mt-7 rounded-2xl border border-[#d9e4df] bg-white p-5">
              <div className="flex items-center justify-between text-sm font-bold text-[#063d39]"><span>Plan setup</span><span>{progress}%</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#ff6c63] transition-all" style={{ width: `${progress}%` }} /></div>
              <p className="mt-4 text-sm text-slate-600">You can update everything later from your planning dashboard.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-[#e5ded1] bg-white p-5 sm:p-8">
            <label className="block text-sm font-bold text-[#063d39]">What are you celebrating?</label>
            <div className="mt-3 flex flex-wrap gap-2">
              {occasionOptions.map((item) => <button key={item} type="button" onClick={() => setOccasion(item)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${occasion === item ? "border-[#ff6c63] bg-[#fff0ee] text-[#063d39]" : "border-slate-200 text-slate-600 hover:border-[#ff6c63]"}`}>{item}</button>)}
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-bold text-[#063d39]">Event date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-normal text-slate-700 outline-none focus:border-[#ff6c63]" /></label>
              <label className="text-sm font-bold text-[#063d39]">Location<input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Croydon" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-normal text-slate-700 outline-none focus:border-[#ff6c63]" /></label>
              <label className="text-sm font-bold text-[#063d39]">Guest estimate<input type="number" min="1" value={guests} onChange={(e) => setGuests(e.target.value)} placeholder="e.g. 80" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-normal text-slate-700 outline-none focus:border-[#ff6c63]" /></label>
              <label className="text-sm font-bold text-[#063d39]">Total budget (£)<input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 3000" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-normal text-slate-700 outline-none focus:border-[#ff6c63]" /></label>
            </div>

            <div className="mt-7"><p className="text-sm font-bold text-[#063d39]">What might you need?</p><p className="mt-1 text-sm text-slate-500">Choose as many as you like. You can change these later.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{serviceOptions.map((service) => <label key={service} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 hover:border-[#ff6c63]"><input type="checkbox" checked={services.includes(service)} onChange={() => toggleService(service)} className="h-4 w-4 accent-[#ff6c63]" />{service}</label>)}</div></div>

            <button type="button" onClick={continuePlanning} disabled={!occasion} className="mt-8 w-full rounded-xl bg-[#063d39] px-6 py-4 font-bold text-white transition hover:bg-[#0b504a] disabled:cursor-not-allowed disabled:opacity-40">Build my celebration plan →</button>
            <p className="mt-3 text-center text-xs text-slate-500">No payment needed to start planning.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
