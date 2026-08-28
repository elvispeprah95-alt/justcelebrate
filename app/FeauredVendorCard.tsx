type Props = {
  name: string;
  category: string;
  location: string;
  rating: number;
  reviews: number;
  price: string;
  image: string;
};

export default function FeaturedVendorCard({
  name,
  category,
  location,
  rating,
  reviews,
  price,
  image,
}: Props) {
  return (
    <div className="group overflow-hidden rounded-3xl bg-white shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">

      <div className="relative h-72 overflow-hidden">

        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
        />

        <div className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 text-sm font-semibold shadow">
          ✓ Verified
        </div>

      </div>

      <div className="space-y-4 p-6">

        <div className="flex items-center justify-between">

          <h3 className="text-2xl font-bold text-slate-900">
            {name}
          </h3>

          <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-600">
            {category}
          </span>

        </div>

        <p className="text-slate-500">
          📍 {location}
        </p>

        <div className="flex items-center justify-between">

          <span className="font-semibold text-amber-500">
            ⭐ {rating}
          </span>

          <span className="text-slate-500">
            ({reviews} reviews)
          </span>

        </div>

        <div className="flex items-center justify-between">

          <span className="text-lg font-bold text-slate-900">
            From {price}
          </span>

          <button className="rounded-full bg-orange-500 px-5 py-2 font-semibold text-white transition hover:bg-orange-600">
            View Profile
          </button>

        </div>

      </div>

    </div>
  );
}