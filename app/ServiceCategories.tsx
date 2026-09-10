type Category = { name: string; icon: string; count: number };

export default function ServiceCategories({
  categories,
  loading,
  onSelect,
}: {
  categories: Category[];
  loading: boolean;
  onSelect: (category: string) => void;
}) {
  return (
    <div id="services" className="scroll-mt-28">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ff6c63]">Suppliers for your plan</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#063d39] sm:text-4xl">What do you need for your occasion?</h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Choose a category to see its businesses, explore profiles and send an enquiry.</p>
      {loading ? (
        <p role="status" className="mt-8 text-slate-500">Loading service categories…</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {categories.map(category => (
            <button
              key={category.name}
              type="button"
              onClick={() => onSelect(category.name)}
              className="group rounded-2xl border border-[#e5ded1] bg-[#f8f4ec] p-4 text-left transition hover:border-[#ff6c63] hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#063d39] sm:p-5"
            >
              <span className="text-2xl" aria-hidden="true">{category.icon}</span>
              <span className="mt-3 block font-bold text-[#063d39]">{category.name}</span>
              <span className="mt-1 block text-sm text-slate-600">{category.count} {category.count === 1 ? "business" : "businesses"} →</span>
            </button>
          ))}
        </div>
      )}
      <p className="mt-8 text-sm text-slate-500">Your enquiry details are shared with the businesses you choose to contact.</p>
    </div>
  );
}
