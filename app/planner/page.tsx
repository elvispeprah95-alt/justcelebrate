"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { decodePlan, emptyPlan, useSavedPlanner } from "../useSavedPlanner";

type PlanItem = {
  id: string;
  label: string;
  done: boolean;
};

const defaultItems: PlanItem[] = [
  { id: "venue", label: "Venue", done: false },
  { id: "music", label: "DJ / Music", done: false },
  { id: "catering", label: "Catering", done: false },
  { id: "decor", label: "Decorations", done: false },
  { id: "cake", label: "Cake", done: false },
  { id: "photographer", label: "Photographer", done: false },
  { id: "invitations", label: "Invitations", done: false },
];

function decodeItems(raw: string): PlanItem[] {
  const value = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error("Invalid checklist");
  return defaultItems.map((item) => ({ ...item, done: value.some((saved) => saved?.id === item.id && saved.done === true) }));
}

function decodeSpent(raw: string) {
  return Number.isFinite(Number(raw)) && Number(raw) >= 0 ? raw : "0";
}
const encodeSpent = (value: string) => value;

export default function CelebrationPlannerPage() {
  const planStorage = useSavedPlanner("just-celebrate-plan", emptyPlan, decodePlan);
  const itemStorage = useSavedPlanner("just-celebrate-simple-plan", defaultItems, decodeItems);
  const spentStorage = useSavedPlanner("just-celebrate-spent", "0", decodeSpent, encodeSpent);
  const { value: plan, update: setPlan } = planStorage;
  const { value: items, update: setItems } = itemStorage;
  const { value: spent, update: setSpent } = spentStorage;
  const ready = planStorage.ready && itemStorage.ready && spentStorage.ready;
  const saveError = planStorage.error || itemStorage.error || spentStorage.error;
  const [active, setActive] = useState<"checklist" | "budget" | "guests" | "suppliers">("checklist");

  const eventDateLabel = useMemo(() => {
    if (!plan.date) return "Date not set";
    const [year, month, day] = plan.date.split("-").map(Number);
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day)));
  }, [plan.date]);

  const budget = Number(plan.budget || 0);
  const remaining = Math.max(0, budget - Number(spent || 0));
  const completed = items.filter((item) => item.done).length;
  const progress = Math.round((completed / items.length) * 100);
  const nextItem = items.find((item) => !item.done);

  function toggleItem(id: string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    );
  }

  const nextHref = nextItem && nextItem.id !== "invitations" ? "/#vendors" : "#plan";

  if (!ready) return <main className="min-h-screen bg-[#f8f4ec] p-10 text-[#063d39]" role="status">Loading your saved celebration…</main>;

  return (
    <main className="min-h-screen bg-[#f8f4ec] text-slate-900">
      <header className="border-b border-[#e5ded1] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-6">
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            <span className="text-orange-500">Just</span>
            <span className="text-slate-900">Celebrate</span>
          </Link>
          <Link href="/" className="rounded-xl bg-[#063d39] px-4 py-2 text-sm font-bold text-white">
            Home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6">
        <p role="status" className="mb-5 text-sm text-slate-600">{saveError || "Saved automatically on this device. Return using the same browser; clearing site data removes your plan."}</p>
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ff6c63]">Your celebration</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[#063d39]">🎉 {plan.occasion || "My celebration"}</h1>
              <p className="mt-2 text-slate-600">
                {eventDateLabel}
                {plan.location ? ` · ${plan.location}` : ""}
                {plan.guests ? ` · ${plan.guests} guests` : ""}
                {plan.budget ? ` · £${budget.toLocaleString("en-GB")} budget` : ""}
              </p>
            </div>
            <a href="#details" className="text-sm font-bold text-[#063d39] underline underline-offset-4">Edit details</a>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-[#d9e4df] bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff6c63]">What’s next?</p>
              <h2 className="mt-2 text-3xl font-bold text-[#063d39]">
                {nextItem ? `Sort your ${nextItem.label.toLowerCase()}` : "Your main plan is complete 🎉"}
              </h2>
            </div>
            <span className="rounded-full bg-[#f8f4ec] px-3 py-1 text-sm font-bold text-[#063d39]">{progress}% planned</span>
          </div>
          <p className="mt-3 max-w-2xl text-slate-600">
            {nextItem
              ? `This is the next thing we recommend focusing on for your ${plan.occasion.toLowerCase() || "celebration"}.`
              : "You’ve covered the main parts of your celebration plan."}
          </p>
          {nextItem && (
            <Link href={nextHref} className="mt-5 inline-flex rounded-xl bg-[#ff6c63] px-5 py-3 font-bold text-white hover:bg-[#e95a52]">
              {nextItem.id === "invitations" ? "Mark invitations when done" : `Find ${nextItem.label.toLowerCase()} →`}
            </Link>
          )}
        </section>

        <nav className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Planner sections">
          {([
            ["checklist", "✓ Checklist"],
            ["budget", "£ Budget"],
            ["guests", "👥 Guests"],
            ["suppliers", "🎉 Suppliers"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${active === key ? "border-[#063d39] bg-[#063d39] text-white" : "border-[#e5ded1] bg-white text-[#063d39] hover:border-[#063d39]"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {active === "checklist" && (
          <section id="plan" className="mt-6 rounded-3xl border border-[#e5ded1] bg-white p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff6c63]">Your plan</p><h2 className="mt-2 text-2xl font-bold text-[#063d39]">Keep it simple</h2></div>
              <span className="text-sm font-bold text-slate-500">{completed}/{items.length} done</span>
            </div>
            <div className="mt-5 divide-y divide-slate-100">
              {items.map((item) => (
                <label key={item.id} className="flex cursor-pointer items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={item.done} onChange={() => toggleItem(item.id)} className="h-5 w-5 accent-[#ff6c63]" />
                    <span className={`font-semibold ${item.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{item.label}</span>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.done ? "bg-emerald-50 text-emerald-700" : "bg-[#f8f4ec] text-slate-500"}`}>{item.done ? "Done" : "Not started"}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        {active === "budget" && (
          <section className="mt-6 rounded-3xl border border-[#e5ded1] bg-white p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff6c63]">Budget</p>
            <h2 className="mt-2 text-2xl font-bold text-[#063d39]">Keep an eye on spending</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[#f8f4ec] p-4"><p className="text-sm text-slate-500">Total budget</p><p className="mt-1 text-2xl font-bold text-[#063d39]">£{budget.toLocaleString("en-GB")}</p></div>
              <div className="rounded-xl bg-[#f8f4ec] p-4"><p className="text-sm text-slate-500">Remaining</p><p className="mt-1 text-2xl font-bold text-[#063d39]">£{remaining.toLocaleString("en-GB")}</p></div>
            </div>
            <label className="mt-5 block text-sm font-bold text-[#063d39]">Spent so far (£)
              <input type="number" min="0" value={spent} onChange={(e) => setSpent(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-normal outline-none focus:border-[#ff6c63]" />
            </label>
          </section>
        )}

        {active === "guests" && (
          <section className="mt-6 rounded-3xl border border-[#e5ded1] bg-white p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff6c63]">Guests</p>
            <h2 className="mt-2 text-2xl font-bold text-[#063d39]">Your guest estimate</h2>
            <p className="mt-4 text-4xl font-bold text-[#063d39]">{plan.guests || "0"}</p>
            <p className="mt-2 text-slate-600">We’ll build a full guest list tool here next. For now, you can update your estimate below.</p>
          </section>
        )}

        {active === "suppliers" && (
          <section className="mt-6 rounded-3xl border border-[#e5ded1] bg-white p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff6c63]">Suppliers</p>
            <h2 className="mt-2 text-2xl font-bold text-[#063d39]">Find people when you need them</h2>
            <p className="mt-3 text-slate-600">Use your plan to find the right supplier for each next step, rather than searching the whole directory.</p>
            <Link href="/#vendors" className="mt-5 inline-flex rounded-xl bg-[#ff6c63] px-5 py-3 font-bold text-white hover:bg-[#e95a52]">Browse suppliers →</Link>
          </section>
        )}

        <section id="details" className="mt-8 rounded-3xl border border-[#e5ded1] bg-white p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff6c63]">Celebration details</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-sm font-bold text-[#063d39]">Occasion<input value={plan.occasion} onChange={(e) => setPlan({ ...plan, occasion: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-base font-normal outline-none focus:border-[#ff6c63]" /></label>
            <label className="text-sm font-bold text-[#063d39]">Date<input type="date" value={plan.date} onChange={(e) => setPlan({ ...plan, date: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-base font-normal outline-none focus:border-[#ff6c63]" /></label>
            <label className="text-sm font-bold text-[#063d39]">Location<input value={plan.location} onChange={(e) => setPlan({ ...plan, location: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-base font-normal outline-none focus:border-[#ff6c63]" /></label>
            <label className="text-sm font-bold text-[#063d39]">Guests<input type="number" min="1" value={plan.guests} onChange={(e) => setPlan({ ...plan, guests: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-base font-normal outline-none focus:border-[#ff6c63]" /></label>
            <label className="text-sm font-bold text-[#063d39]">Budget (£)<input type="number" min="0" value={plan.budget} onChange={(e) => setPlan({ ...plan, budget: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-base font-normal outline-none focus:border-[#ff6c63]" /></label>
          </div>
        </section>
      </div>
    </main>
  );
}
