type Category = { name: string; icon: string; count: number };

export default function ServiceCategories({categories,loading,onSelect}:{categories:Category[];loading:boolean;onSelect:(category:string)=>void}) {
 return <div id="services" className="scroll-mt-28 rounded-[1.6rem] border border-[#dfe3d8] bg-white p-6 sm:p-9">
  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#637976]">STEP 02 / CHOOSE YOUR SERVICES</p>
  <h2 className="mt-4 text-[30px] font-medium tracking-[-0.035em] text-[#103f39] sm:text-[36px]">What do you need for your celebration?</h2>
  <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#66756f]">Choose a service and we’ll help you find the right supplier. Your choices stay connected to My Planning Portal.</p>
  {loading?<p role="status" className="mt-8 text-[#66756f]">Loading services…</p>:<div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{categories.map(category=><button key={category.name} type="button" onClick={()=>onSelect(category.name)} className="group flex min-h-[92px] items-center gap-4 rounded-xl border border-[#e1e2dc] bg-white p-5 text-left transition hover:border-[#91a58d] hover:bg-[#f7f9f3] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#103f39]"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#f1f3eb] text-xl text-[#365f4b]" aria-hidden="true">{category.icon}</span><span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold text-[#103f39]">{category.name}</span><span className="mt-1 block text-[13px] text-[#77827d]">{category.count} {category.count===1?"vendor":"vendors"}</span></span><span className="text-lg text-[#66806f] transition group-hover:translate-x-1" aria-hidden="true">→</span></button>)}</div>}
 </div>;
}
