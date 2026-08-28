type SearchBarProps = {
  celebration: string;
  setCelebration: (value: string) => void;
};

export default function SearchBar({
  celebration,
  setCelebration,
}: SearchBarProps) {
  return (
    <div className="mx-auto max-w-6xl rounded-3xl bg-white p-6 shadow-2xl">

      <div className="grid gap-4 md:grid-cols-4">

        <select
          value={celebration}
          onChange={(e) => setCelebration(e.target.value)}
          className="rounded-2xl border px-5 py-4"
        >
          <option>Wedding</option>
          <option>Birthday</option>
          <option>Eid</option>
          <option>Diwali</option>
          <option>Graduation</option>
          <option>Corporate</option>
        </select>

        <input
          placeholder="Location"
          className="rounded-2xl border px-5 py-4"
        />

        <input
          type="date"
          className="rounded-2xl border px-5 py-4"
        />

        <button className="rounded-2xl bg-orange-500 px-5 py-4 font-bold text-white hover:bg-orange-600">
          Start Planning
        </button>

      </div>

    </div>
  );
}