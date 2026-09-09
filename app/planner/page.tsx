"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CelebrationPlan = {
  occasion: string;
  date: string;
  location: string;
  guests: string;
  budget: string;
  services: string[];
};

type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

const defaultChecklist: ChecklistItem[] = [
  { id: "date", label: "Confirm your event date", done: false },
  { id: "budget", label: "Set your total budget", done: false },
  { id: "guest-list", label: "Create your guest list", done: false },
  { id: "venue", label: "Book your venue", done: false },
  { id: "suppliers", label: "Choose your key suppliers", done: false },
  { id: "invitations", label: "Send invitations", done: false },
  { id: "final-check", label: "Confirm final details one week before", done: false },
];

export default function CelebrationPlannerPage() {
  const [plan, setPlan] = useState<CelebrationPlan>({ occasion: "My celebration", date: "", location: "", guests: "", budget: "", services: [] });
  const [checklist, setChecklist] = useState<ChecklistItem[]>(defaultChecklist);
  const [spent, setSpent] = useState("0");
  const [newTask, setNewTask] = useState("");

  useEffect(() => {
    try {
      const savedPlan = localStorage.getItem("just-celebrate-plan");
      const savedChecklist = localStorage.getItem("just-celebrate-checklist");
      const savedSpent = localStorage.getItem("just-celebrate-spent");
      if (savedPlan) setPlan(JSON.parse(savedPlan));
      if (savedChecklist) setChecklist(JSON.parse(savedChecklist));
      if (savedSpent) setSpent(savedSpent);
    } catch {
      // Keep safe defaults if saved browser data is unavailable.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("just-celebrate-plan", JSON.stringify(plan));
  }, [plan]);

  useEffect(() => {
    localStorage.setItem("just-celebrate-checklist", JSON.stringify(checklist));
  }, [checklist]);

  useEffect(() => {
    localStorage.setItem("just-celebrate-spent", spent);
  }, [spent]);

  const completedCount = checklist.filter((item) => item.done).length;
  const checklistProgress = checklist.length ? Math.round((completedCount / checklist.length) * 100) : 0;
  const budget = Number(plan.budget || 0);
  const spentAmount = Number(spent || 0);
  const remaining = Math.max(0, budget - spentAmount);

  const eventDateLabel = useMemo(() => {
    if (!plan.date) return "Date not set";
    const [year, month, day] = plan.date.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  }, [plan.date]);

  function toggleTask(id: string) {
    setChecklist((items) => items.map((item) => item.id === id ? { ...item, done: !item.done } : item));
  }

  function addTask() {
    const label = newTask.trim();
    if (!label) return;
    setChecklist((items) => [...items, { id: `${Date.now()}`, label, done: false }]);
    setNewTask("");
  }

  return (
    <main className="min-h-screen bg-[#f8f4ec] text-slate-900">
      <div className="border-b border-[#e5ded1] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6 lg:px-8">
          <Link href="/" className="text-2xl font-extrabold tracking-tight"><span className="text-orange-500">Just</span><span className="text-slate-900">Celebrate</span></Link>
          <div className="flex gap-2">
            <Link href="/#vendors" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-[#063d39] hover:border-[#063d39]">Browse vendors</Link>
            <Link href="/" className="rounded-xl bg-[#063d39] px-4 py-2 text-sm font-bold text-white">Home</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ff6c63]">Your celebration plan</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#063d39] sm:text-4xl">{plan.occasion || "My celebration"}</h1>
            <p className="mt-2 text-slate-600">{eventDateLabel}{plan.location ? ` · ${plan.location}` : ""}{plan.guests ? ` · ${plan.guests} guests` : ""}</p>
          </div>
          <a href="#details" className="text-sm font-bold text-[#063d39] underline underline-offset-4">Edit celebration details</a>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#e5ded1] bg-white p-5"><p className="text-sm text-slate-500">Checklist</p><p className="mt-2 text-3xl font-bold text-[#063d39]">{checklistProgress}%</p><p className="mt-1 text-sm text-slate-500">{completedCount} of {checklist.length} complete</p></div>
          <div className="rounded-2xl border border-[#e5ded1] bg-white p-5"><p className="text-sm text-slate-500">Budget</p><p className="mt-2 text-3xl font-bold text-[#063d39]">£{budget.toLocaleString("en-GB")}</p><p className="mt-1 text-sm text-slate-500">Total planned</p></div>
          <div className="rounded-2xl border border-[#e5ded1] bg-white p-5"><p className="text-sm text-slate-500">Remaining</p><p className="mt-2 text-3xl font-bold text-[#063d39]">£{remaining.toLocaleString("en-GB")}</p><p className="mt-1 text-sm text-slate-500">After tracked spend</p></div>
          <div className="rounded-2xl border border-[#e5ded1] bg-white p-5"><p className="text-sm text-slate-500">Services needed</p><p className="mt-2 text-3xl font-bold text-[#063d39]">{plan.services.length}</p><p className="mt-1 text-sm text-slate-500">Supplier categories</p></div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-[#e5ded1] bg-white p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff6c63]">Checklist</p><h2 className="mt-2 text-2xl font-bold text-[#063d39]">What to do next</h2></div><span className="rounded-full bg-[#f8f4ec] px-3 py-1 text-sm font-bold text-[#063d39]">{checklistProgress}%</span></div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#ff6c63] transition-all" style={{ width: `${checklistProgress}%` }} /></div>
            <div className="mt-6 space-y-2">
              {checklist.map((item) => (
                <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 hover:border-[#ff6c63]">
                  <input type="checkbox" checked={item.done} onChange={() => toggleTask(item.id)} className="h-5 w-5 accent-[#ff6c63]" />
                  <span className={`font-semibold ${item.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{item.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-2"><input value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addTask(); }} placeholder="Add your own task" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-[#ff6c63]" /><button type="button" onClick={addTask} className="rounded-xl bg-[#063d39] px-4 py-3 font-bold text-white">Add</button></div>
          </section>

          <div className="space-y-8">
            <section className="rounded-3xl border border-[#e5ded1] bg-white p-5 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff6c63]">Budget tracker</p><h2 className="mt-2 text-2xl font-bold text-[#063d39]">Stay on budget</h2>
              <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#f8f4ec] p-4"><p className="text-xs font-semibold text-slate-500">Total budget</p><p className="mt-1 text-xl font-bold text-[#063d39]">£{budget.toLocaleString("en-GB")}</p></div><div className="rounded-xl bg-[#f8f4ec] p-4"><p className="text-xs font-semibold text-slate-500">Left</p><p className="mt-1 text-xl font-bold text-[#063d39]">£{remaining.toLocaleString("en-GB")}</p></div></div>
              <label className="mt-5 block text-sm font-bold text-[#063d39]">How much have you spent so far? (£)<input type="number" min="0" value={spent} onChange={(e) => setSpent(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-normal outline-none focus:border-[#ff6c63]" /></label>
            </section>

            <section className="rounded-3xl border border-[#e5ded1] bg-white p-5 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff6c63]">Suppliers</p><h2 className="mt-2 text-2xl font-bold text-[#063d39]">Services for your event</h2>
              {plan.services.length ? <div className="mt-5 flex flex-wrap gap-2">{plan.services.map((service) => <span key={service} className="rounded-full border border-[#d9e4df] bg-[#f3f8f6] px-3 py-2 text-sm font-bold text-[#063d39]">{service}</span>)}</div> : <p className="mt-4 text-sm text-slate-500">You haven’t selected any services yet.</p>}
              <Link href="/#vendors" className="mt-5 inline-flex rounded-xl bg-[#ff6c63] px-5 py-3 text-sm font-bold text-white hover:bg-[#e95a52]">Find suppliers for my plan →</Link>
            </section>
          </div>
        </div>

        <section id="details" className="mt-8 rounded-3xl border border-[#e5ded1] bg-white p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff6c63]">Celebration details</p><h2 className="mt-2 text-2xl font-bold text-[#063d39]">Keep your plan up to date</h2>
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
