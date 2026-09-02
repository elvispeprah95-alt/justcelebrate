const services = [
  { icon: "🏛️", name: "Venues" },
  { icon: "🎧", name: "DJs" },
  { icon: "📸", name: "Photographers" },
  { icon: "🍽️", name: "Caterers" },
  { icon: "🎂", name: "Cakes & treats" },
  { icon: "📷", name: "Photo Booths" },
  { icon: "✨", name: "Event decorators" },
  { icon: "🎈", name: "Children’s Entertainers" },
  { icon: "🎤", name: "Live Singers & Bands" },
  { icon: "🚘", name: "Party & Event Transport" },
  { icon: "🎉", name: "Balloons & Party Decor" },
  { icon: "🪩", name: "Party & Event Hire" },
];

export default function ServiceCategories() {
  return (
    <section id="services" className="bg-white py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ff6c63]">
          Browse by service
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#063d39] sm:text-4xl">
          What do you need for your occasion?
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Choose what you need and we’ll show you relevant businesses for that
          service. No need to scroll through hundreds of unrelated listings.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <a
              key={service.name}
              href="#vendors"
              className="group min-h-32 rounded-2xl border border-[#e5ded1] bg-[#f8f4ec] p-5 transition hover:-translate-y-0.5 hover:border-[#ff6c63] hover:shadow-sm"
            >
              <span className="text-2xl" aria-hidden="true">
                {service.icon}
              </span>
              <h3 className="mt-3 font-bold text-[#063d39]">{service.name}</h3>
              <p className="mt-1 text-sm text-slate-600 group-hover:text-[#063d39]">
                View businesses →
              </p>
            </a>
          ))}
        </div>

        <div className="mt-6 text-center">
          <a
            href="#vendors"
            className="inline-flex rounded-xl border border-[#063d39] px-6 py-3 font-bold text-[#063d39] hover:bg-[#063d39] hover:text-white"
          >
            Browse all services
          </a>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-[#d9e4df] bg-[#f3f8f6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-[#063d39]">🔒 Your details are not for sale</p>
            <p className="mt-1 text-sm text-slate-600">
              When you send an enquiry, your enquiry details are shared only
              with the vendor or vendors you choose to contact.
            </p>
          </div>
          <a
            href="#vendors"
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#063d39] hover:border-[#063d39]"
          >
            How we protect your data
          </a>
        </div>
      </div>
    </section>
  );
}
