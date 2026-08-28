type Props = {
  title: string;
  subtitle: string;
  vendors: string;
  image: string;
};

export default function ExploreCelebrationCard({
  title,
 subtitle,
  vendors,
  image,
}: Props) {
  return (
    <div className="group overflow-hidden rounded-3xl bg-white shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">

      <div className="relative h-72 overflow-hidden">

        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute bottom-0 p-6">

          <h3 className="text-3xl font-bold text-white">
            {title}
          </h3>

          <p className="mt-2 text-white/90">
            {subtitle}
          </p>

        </div>

      </div>

      <div className="flex items-center justify-between p-6">

        <span className="font-medium text-slate-500">
          {vendors} vendors
        </span>

        <button className="rounded-full bg-orange-500 px-5 py-2 font-semibold text-white transition hover:bg-orange-600">
          Explore →
        </button>

      </div>

    </div>
  );
}
