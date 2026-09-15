type Category = { name: string; icon: string; count: number };

export default function ServiceCategories({categories,loading,onSelect}:{categories:Category[];loading:boolean;onSelect:(category:string)=>void}) {
 return <div id="services" className="scroll-mt-28 rounded-[2rem] border border-[#e5ded1] bg-white p-6 shadow-sm sm:p-8">
  <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-500">Choose your next service</p>
  <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#063d39] sm:text-4xl">What do you need for your celebration?</h2>
  <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Pick one service at a time. We’ll show you the right vendors, then you can save your favourite straight to My Planning Portal.</p>
  {loading?<p role="status" className="mt-8 text-slate-500">Loading services…</p>:<div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{categories.map(category=><button key={category.name} type="button" onClick={()=>onSelect(category.name)} className="group rounded-2xl border border-[#e5ded1] bg-[#f8f4ec] p-4 text-left transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-white hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#063d39] sm:p-5"><span className="flex size-11 items-center justify-center rounded-xl bg-white text-2xl shadow-sm" aria-hidden="true">{category.icon}</span><span className="mt-4 block font-extrabold text-[#063d39]">{category.name}</span><span className="mt-1 block text-sm text-slate-500">{category.count} {category.count===1?"vendor":"vendors"}</span><span className="mt-3 block text-sm font-bold text-orange-600">Choose a vendor →</span></button>)}</div>}
 </div>;
}
