export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#143f3a] text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://www.justcelebrate.co.uk/justcelebrate-hero-v2.jpg"
        alt="Family celebrating a birthday with balloons and cake"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#082f2c]/90 via-[#0d3835]/45 to-transparent" />

      <div className="mx-auto flex min-h-[410px] max-w-7xl items-center px-5 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-[#ffd6d2]">
            Every reason. One place to plan it.
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Plan the occasion. Find the people who make it happen.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/90">
            Tell us what you’re celebrating and where. We’ll help you build the
            plan and find relevant businesses nearby.
          </p>
          <a
            href="#vendors"
            className="mt-7 inline-flex rounded-2xl bg-[#ff6c63] px-6 py-3 font-bold text-white hover:bg-[#e95a52]"
          >
            Start planning →
          </a>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-white/80">
            <span>✓ Free to plan</span>
            <span>✓ No obligation</span>
            <span>✓ Enquire through Just Celebrate</span>
          </div>
        </div>
      </div>
    </section>
  );
}
