import CategoryCard from "./CategoryCard";

export default function Categories() {
  const categories = [
    { emoji: "🎂", title: "Cakes" },
    { emoji: "📸", title: "Photography" },
    { emoji: "🎵", title: "DJs" },
    { emoji: "🌸", title: "Florists" },
    { emoji: "🍽️", title: "Catering" },
    { emoji: "🏰", title: "Venues" },
    { emoji: "🚗", title: "Wedding Cars" },
    { emoji: "🎈", title: "Balloons" },
  ];

  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-8">

        <p className="mb-3 text-center font-semibold uppercase tracking-[0.3em] text-orange-500">
          Explore
        </p>

        <h2 className="mb-4 text-center text-5xl font-bold text-slate-900">
          Browse Popular Categories
        </h2>

        <p className="mx-auto mb-14 max-w-2xl text-center text-lg text-slate-600">
          Everything you need for an unforgettable celebration, all in one place.
        </p>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.title}
              emoji={category.emoji}
              title={category.title}
            />
          ))}
        </div>

      </div>
    </section>
  );
}