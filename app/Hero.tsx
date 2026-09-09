export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#143f3a] text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://www.justcelebrate.co.uk/justcelebrate-hero-v2.jpg"
        alt="Family celebrating a birthday with balloons and cake"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#082f2c]/90 via-[#0d3835]/55 to-transparent" />

      <div className="mx-auto flex min-h-[440px] max-w-7xl items-center px-5 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-[#ffd6d2]">
            Your celebration. One place to plan it.
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Plan your celebration, all in one place.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/90">
            From your first idea to the big day, organise the essentials and find the right people when you need them.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#planner" className="inline-flex rounded-2xl bg-[#ff6c63] px-6 py-3 font-bold text-white hover:bg-[#e95a52]">
              Start planning →
            </a>
            <a href="#vendors" className="inline-flex rounded-2xl border border-white/50 bg-white/10 px-6 py-3 font-bold text-white hover:bg-white/20">
              Browse vendors
            </a>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-white/80">
            <span>✓ Build your plan</span>
            <span>✓ Track your budget</span>
            <span>✓ Find trusted suppliers</span>
          </div>
        </div>
      </div>
    </section>
  );
}
