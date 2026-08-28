import ExploreCelebrationCard from "./ExploreCelebrationCard";

export default function ExploreCelebrations() {
  const celebrations = [
    {
      title: "Weddings",
      subtitle: "Traditional & Modern",
      vendors: "1,248",
      image: "/images/wedding.jpg",
    },
    {
      title: "Birthdays",
      subtitle: "Children & Adults",
      vendors: "842",
      image: "/images/birthday.jpg",
    },
    {
      title: "Eid",
      subtitle: "Family Celebrations",
      vendors: "212",
      image: "/images/eid.jpg",
    },
    {
      title: "Diwali",
      subtitle: "Festival of Lights",
      vendors: "198",
      image: "/images/diwali.jpg",
    },
    {
      title: "Graduations",
      subtitle: "Celebrate Success",
      vendors: "321",
      image: "/images/graduation.jpg",
    },
    {
      title: "Corporate Events",
      subtitle: "Professional & Elegant",
      vendors: "703",
      image: "/images/corporate.jpg",
    },
  ];

  return (
    <section className="bg-slate-50 py-28">
      <div className="mx-auto max-w-7xl px-8">

        <div className="mb-16 text-center">
          <p className="font-semibold uppercase tracking-[0.35em] text-orange-500">
            Explore Celebrations
          </p>

          <h2 className="mt-4 text-5xl font-bold text-slate-900">
            Every celebration deserves
            <br />
            the perfect team.
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-xl leading-8 text-slate-600">
            Discover inspiration, trusted vendors and ideas for every
            celebration and every community.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {celebrations.map((celebration) => (
            <ExploreCelebrationCard
              key={celebration.title}
              title={celebration.title}
              subtitle={celebration.subtitle}
              vendors={celebration.vendors}
              image={celebration.image}
            />
          ))}
        </div>

      </div>
    </section>
  );
}