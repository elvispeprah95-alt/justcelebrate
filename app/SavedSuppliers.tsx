"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type SavedSupplier = {
  id: string;
  business_name: string;
  category: string;
  town?: string;
  phone?: string;
  email?: string;
  website?: string;
};
const KEY = "just-celebrate-suppliers";
const CHANGE = "just-celebrate-suppliers-changed";
const PLANNER_KEY = "just-celebrate-private-planner-v1";

const plannerCategory = (category:string) => {
  const value = category.toLowerCase();
  if (value.includes("venue")) return "venue";
  if (value.includes("dj") || value.includes("music")) return "music";
  if (value.includes("photo") || value.includes("video")) return "photography";
  if (value.includes("cater")) return "catering";
  if (value.includes("cake") || value.includes("treat")) return "cake";
  if (value.includes("decor") || value.includes("balloon")) return "decor";
  if (value.includes("transport")) return "transport";
  return "entertainment";
};

function syncPlannerSupplier(vendor:SavedSupplier) {
  try {
    const raw = localStorage.getItem(PLANNER_KEY);
    if (!raw) return;
    const plan = JSON.parse(raw);
    if (!plan || !Array.isArray(plan.suppliers) || !Array.isArray(plan.services)) return;
    const category = plannerCategory(vendor.category);
    if (!plan.services.includes(category)) plan.services.push(category);
    if (!plan.suppliers.some((item:{id:string}) => item.id === vendor.id)) {
      plan.suppliers.push({ id:vendor.id, category, name:vendor.business_name, website:vendor.website || "", notes:vendor.town ? `Based in ${vendor.town}` : "", status:"Shortlisted" });
    }
    plan.step = 3;
    plan.portalTab = "suppliers";
    plan.updatedAt = new Date().toISOString();
    localStorage.setItem(PLANNER_KEY, JSON.stringify(plan));
  } catch {}
}

export function readSuppliers(): SavedSupplier[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    // A previous version may have left an incomplete value. Start clean rather
    // than blocking the planning journey.
    localStorage.removeItem(KEY);
    return [];
  }
  if (!Array.isArray(value)) {
    localStorage.removeItem(KEY);
    return [];
  }
  const valid = value.filter((v): v is SavedSupplier => Boolean(v) && typeof v.id === "string" && typeof v.business_name === "string" && typeof v.category === "string");
  if (valid.length !== value.length) localStorage.setItem(KEY, JSON.stringify(valid));
  return valid.map(v => ({ id:v.id, business_name:v.business_name, category:v.category, town:typeof v.town === "string" ? v.town : "", phone:typeof v.phone === "string" ? v.phone : "", email:typeof v.email === "string" ? v.email : "", website:typeof v.website === "string" ? v.website : "" }));
}

function useSuppliers() {
  const [suppliers,setSuppliers]=useState<SavedSupplier[]>([]); const [ready,setReady]=useState(false); const [error,setError]=useState("");
  useEffect(()=>{const refresh=()=>{try{setSuppliers(readSuppliers());setError("")}catch{setError("We couldn’t load your saved suppliers. Please allow site storage and try again.")}setReady(true)};refresh();window.addEventListener(CHANGE,refresh);window.addEventListener("storage",refresh);return()=>{window.removeEventListener(CHANGE,refresh);window.removeEventListener("storage",refresh)}},[]);
  function update(change:(current:SavedSupplier[])=>SavedSupplier[]){try{const next=change(readSuppliers());localStorage.setItem(KEY,JSON.stringify(next));setSuppliers(next);setError("");window.dispatchEvent(new Event(CHANGE))}catch{setError("This change couldn’t be saved. Please allow site storage and try again.")}}
  return {suppliers,ready,error,update};
}

export function AddToPlan({ vendor }: { vendor: SavedSupplier }) {
  const {suppliers,ready,error,update}=useSuppliers(); const added=suppliers.some(v=>v.id===vendor.id);
  return <div className="mt-3"><button type="button" disabled={!ready||added} onClick={()=>{update(current=>current.some(v=>v.id===vendor.id)?current:[...current,{id:vendor.id,business_name:vendor.business_name,category:vendor.category,town:vendor.town||"",phone:vendor.phone||"",email:vendor.email||"",website:vendor.website||""}]);syncPlannerSupplier(vendor)}} className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold transition ${added?"border-[#c8d5c6] bg-[#eef3e9] text-[#31584b] opacity-100":"border-[#075047] bg-[#075047] text-white hover:bg-[#063f39]"}`}>{added?"✓  Added to my portal":"Add to my portal"}</button>{error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>;
}

export default function SavedSuppliers(){const {suppliers,ready,error,update}=useSuppliers();return <section className="rounded-[1.75rem] border border-[#e2e5dc] bg-[#fffdf9] p-5 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#788b78]">My Planning Portal</p><h2 className="mt-2 text-2xl font-semibold text-[#082f2c]">My suppliers {ready&&suppliers.length>0?`(${suppliers.length})`:""}</h2><p className="mt-2 text-sm text-[#6c7975]">Your chosen suppliers, saved with your celebration plan.</p></div></div>{error&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}{!ready?<p role="status" className="mt-5 text-[#6c7975]">Loading your suppliers…</p>:!error&&suppliers.length===0?<div className="mt-5 rounded-2xl border border-dashed border-[#d8ddd2] bg-[#f5f6f0] p-6 text-center"><p className="font-semibold text-[#31584b]">No suppliers added yet</p><p className="mt-1 text-sm text-[#74807c]">Choose a service and add the businesses you like.</p></div>:null}<div className="mt-5 grid gap-3">{suppliers.map(v=><article key={v.id} className="rounded-2xl border border-[#e2e5dc] bg-white p-5 transition hover:border-[#c8d5c6]"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#eef3e9] px-3 py-1 text-xs font-semibold text-[#56704d]">{v.category}</span><span className="text-xs font-medium text-[#81908a]">Shortlisted</span></div><h3 className="mt-2 text-lg font-semibold text-[#082f2c]">{v.business_name}</h3>{v.town&&<p className="mt-1 text-sm text-[#74807c]">⌖ {v.town}</p>}</div><div className="flex shrink-0 flex-wrap items-center gap-2"><Link href={`/vendor?name=${encodeURIComponent(v.business_name)}`} className="rounded-xl border border-[#d8ddd2] bg-white px-4 py-2.5 text-sm font-semibold text-[#31584b]">View profile</Link>{v.email&&<a href={`mailto:${v.email}`} className="rounded-xl bg-[#075047] px-4 py-2.5 text-sm font-semibold text-white">Contact</a>}</div></div><div className="mt-4 border-t border-[#eef0e9] pt-3"><button type="button" onClick={()=>update(current=>current.filter(item=>item.id!==v.id))} className="text-xs font-medium text-[#7b8782] hover:text-[#31584b]">Remove from portal</button></div></article>)}</div></section>}
