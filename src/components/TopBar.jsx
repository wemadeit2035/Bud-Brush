export default function TopBar({ syncStatus, onNewDay, onViewArchives }) {
  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <img
          src="/b-b.png"
          alt="Bud & Brush"
          className="h-12 w-12 rounded-2xl object-cover"
        />
        <div>
          <h1 className="text-2xl font-semibold">Bud & Brush</h1>
          <p className="text-sm text-slate-500">Point of Sale System</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span className="rounded-full bg-slate-100 px-3 py-1">
          {syncStatus}
        </span>
        <button
          className="rounded-2xl bg-amber-500 px-4 py-2 text-white hover:bg-amber-600"
          type="button"
          onClick={onNewDay}
        >
          <i className="fas fa-calendar-plus me-2" />
          New Day
        </button>
        <button
          className="rounded-2xl bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
          type="button"
          onClick={onViewArchives}
        >
          <i className="fas fa-archive me-2" />
          Archives
        </button>
      </div>
    </header>
  );
}
