import SearchBar from "./SearchBar";

type HeroProps = {
  celebration: string;
  setCelebration: (value: string) => void;
};

const headings: Record<string, string> = {
  Wedding: "Every wedding deserves something unforgettable.",
  Birthday: "Let's plan an unforgettable birthday.",
  Eid: "Celebrate together with trusted local businesses.",
  Diwali: "Bring light, colour and joy to your celebration.",
  Graduation: "Celebrate an incredible achievement.",
  Corporate: "Create an event your guests will remember.",
};

export default function Hero({
  celebration,
  setCelebration,
}: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50">

      <div className="mx-auto flex min-h-[80vh] max-w-7xl flex-col items-center justify-center px-8 text-center">

        <p className="mb-6 rounded-full bg-orange-100 px-5 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-orange-600">
          Every Celebration Starts Here
        </p>

        <h1 className="max-w-5xl text-6xl font-extrabold leading-tight text-slate-900">
          {headings[celebration]}
        </h1>

        <p className="mt-8 max-w-2xl text-xl text-slate-600">
          Find trusted local businesses and inspiration for every celebration.
        </p>

        <div className="mt-12 w-full">
          <SearchBar
            celebration={celebration}
            setCelebration={setCelebration}
          />
        </div>

      </div>
    </section>
  );
}