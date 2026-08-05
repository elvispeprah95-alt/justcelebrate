export default function SearchBar() {
  return (
    <div className="mx-auto mt-12 flex max-w-5xl flex-wrap items-center justify-center gap-4 rounded-2xl bg-white p-6 shadow-xl">

      <select className="rounded-xl border border-gray-300 px-4 py-3 text-slate-700">
        <option>Service</option>
        <option>Cakes</option>
        <option>Photographer</option>
        <option>DJ</option>
        <option>Venue</option>
      </select>

      <input
        type="text"
        placeholder="Location"
        className="rounded-xl border border-gray-300 px-4 py-3"
      />

      <input
        type="date"
        className="rounded-xl border border-gray-300 px-4 py-3"
      />

      <button className="rounded-xl bg-orange-500 px-8 py-3 font-semibold text-white hover:bg-orange-600 transition">
        Search
      </button>

    </div>
  );
}