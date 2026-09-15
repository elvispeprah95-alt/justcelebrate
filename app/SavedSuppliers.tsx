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
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.some(v => !v || typeof v.id !== "string" || typeof v.business_name !== "string" || typeof v.category !== "string")) throw new Error("Invalid saved suppliers");
  return value.map(v => ({ id:v.id, business_name:v.business_name, category:v.category, town:typeof v.town === "string" ? v.town : "", phone:typeof v.phone === "string" ? v.phone : "", email:typeof v.email === "string" ? v.email : "", website:typeof v.website === "string" ? v.website : "" }));
}

function useSuppliers() {
  const [suppliers,setSuppliers]=useState<SavedSupplier[]>([]); const [ready,setReady]=useState(false); const [error,setError]=useState("");
  useEffect(()=>{const refresh=()=>{try{setSuppliers(readSuppliers());setError("")}catch{setError("We couldn’t load your saved suppliers. Please allow site storage and try again.")}setReady(true)};refresh();window.addEventListener(CHANGE,refresh);window.addEventListener("storage",refresh);return()=>{window.removeEventListener(CHANGE,refresh);window.removeEventListener("storage",refresh)}},[]);
  function update(change:(current:SavedSupplier[])=>SavedSupplier[]){try{const next=change(readSuppliers());localStorage.setItem(KEY,JSON.stringify(next));setSuppliers(next);setError("");window.dispatchEvent(new Event(CHANGE))}catch{setError("This change couldn’t be saved. Please allow site storage and try again.")}}
  return {suppliers,ready,error,update};
}

export function AddToPlan({ vendor }: { vendor: SavedSupplier }) {
  const {suppliers,ready,error,update}=useSuppliers(); const added=suppliers.some(v=>v.id===vendor.id);
  return <div className="mt-4"><button type="button" disabled={!ready||added} onClick={()=>{update(current=>current.some(v=>v.id===vendor.id)?current:[...current,{id:vendor.id,business_name:vendor.business_name,category:vendor.category,town:vendor.town||"",phone:vendor.phone||"",email:vendor.email||"",website:vendor.website||""}]);syncPlannerSupplier(vendor)}} className="w-full rounded-xl bg-[#063d39] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{added?"✓ Added to my portal":"Add to my portal"}</button>{added&&<Link href="/celebration-planner/index.html#planner" className="mt-2 block text-center text-sm font-bold text-[#063d39] underline">View my planning portal →</Link>}{error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>;
}

export default function SavedSuppliers(){const {suppliers,ready,error,update}=useSuppliers();return <div><h2 className="text-2xl font-bold text-[#063d39]">My suppliers {ready&&suppliers.length>0?`(${suppliers.length})`:""}</h2><p className="mt-2 text-sm text-slate-600">Your shortlisted businesses, saved with your plan on this device. Adding a supplier does not confirm a booking.</p>{error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{!ready?<p role="status" className="mt-4">Loading your suppliers…</p>:!error&&suppliers.length===0?<p className="mt-4 rounded-xl bg-[#f8f4ec] p-4 text-slate-600">No suppliers selected yet.</p>:null}<div className="mt-5 grid gap-4 sm:grid-cols-2">{suppliers.map(v=><article key={v.id} className="rounded-2xl border border-[#e5ded1] p-5"><p className="text-xs font-bold text-orange-600">{v.category} · Shortlisted</p><h3 className="mt-2 text-lg font-bold text-[#063d39]">{v.business_name}</h3>{v.town&&<p className="mt-1 text-sm text-slate-500">{v.town}</p>}<div className="mt-4 flex flex-wrap gap-3 text-sm font-bold text-[#063d39]"><Link href={`/vendor?name=${encodeURIComponent(v.business_name)}`} className="underline">View profile</Link>{v.email&&<a href={`mailto:${v.email}`} className="underline">Email vendor</a>}{v.phone&&<a href={`tel:${v.phone.replace(/\s/g,"")}`} className="underline">Call vendor</a>}</div><button type="button" onClick={()=>update(current=>current.filter(item=>item.id!==v.id))} className="mt-4 text-sm text-slate-500 underline">Remove from plan</button></article>)}</div></div>}
