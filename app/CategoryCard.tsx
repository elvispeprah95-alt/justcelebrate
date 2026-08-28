type CelebrationCardProps = {
  title: string;
  image: string;
  vendors: string;
};

export default function CelebrationCard({
  title,
  image,
  vendors,
}: CelebrationCardProps) {
  return (
    <div className="group overflow-hidden rounded-3xl bg-white shadow-lg transition duration-300 hover:-translate-y-2 hover:shadow-2xl">

      <div className="relative h-64 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

        <h3 className="absolute bottom-5 left-5 text-3xl font-bold text-white">
          {title}
        </h3>
      </div>

      <div className="flex items-center justify-between p-6">

        <p className="text-slate-500">
          {vendors} vendors
        </p>

        <button className="rounded-full bg-orange-500 px-5 py-2 font-semibold text-white transition hover:bg-orange-600">
          Explore →
        </button>

      </div>

    </div>
  );
}