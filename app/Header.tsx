export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6">

        <div className="text-4xl font-extrabold tracking-tight">
          <span className="text-orange-500">Just</span>
          <span className="text-slate-900">Celebrate</span>
        </div>

        <nav className="hidden items-center gap-8 text-base font-semibold text-slate-700 md:flex">
          <a href="#" className="transition hover:text-orange-500">
            Home
          </a>

          <a href="#" className="transition hover:text-orange-500">
            Vendors
          </a>

          <a href="#" className="transition hover:text-orange-500">
            Categories
          </a>

          <a href="#" className="transition hover:text-orange-500">
            About
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button className="rounded-full px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            Login
          </button>

          <button className="rounded-full bg-orange-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-orange-600">
            Join Free
          </button>
        </div>

      </div>
    </header>
  );
}