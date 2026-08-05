export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6">

        <div className="text-4xl font-extrabold tracking-tight">
          <span className="text-orange-500">Just</span>
          <span className="text-slate-900">Celebrate</span>
        </div>

        <nav className="hidden gap-8 text-base font-semibold text-slate-700 md:flex">
          <a href="#" className="hover:text-orange-500 transition">
            Home
          </a>

          <a href="#" className="hover:text-orange-500 transition">
            Vendors
          </a>

          <a href="#" className="hover:text-orange-500 transition">
            Categories
          </a>

          <a href="#" className="hover:text-orange-500 transition">
            About
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button className="rounded-full px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-100">
            Login
          </button>

          <button className="rounded-full bg-orange-500 px-6 py-2 text-sm font-semibold text-white hover:bg-orange-600">
            Join Free
          </button>
        </div>

      </div>
    </header>
  );
}