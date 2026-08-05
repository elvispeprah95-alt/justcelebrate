import SearchBar from "./SearchBar";

export default function Hero() {
  return (
    <section className="bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-8 py-28 text-center">

        <p className="mb-6 text-sm font-bold uppercase tracking-[0.4em] text-orange-500">
          EVERY REASON. EVERY DETAIL. ONE HAPPY PLACE.
        </p>

        <h1 className="mx-auto mb-8 max-w-4xl text-6xl font-extrabold leading-tight text-slate-900">
          Find brilliant local vendors
          <br />
          for every celebration.
        </h1>

        <p className="mx-auto mb-12 max-w-2xl text-xl text-slate-600">
          Compare trusted businesses, read reviews and send one enquiry
          to multiple vendors in seconds.
        </p>

        <SearchBar />

      </div>
    </section>
  );
}