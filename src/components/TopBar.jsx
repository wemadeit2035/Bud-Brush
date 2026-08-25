import { ROLES } from "../constants/accessControl";

export default function TopBar({
  syncStatus,
  onNewDay,
  user,
  userRole,
  onSignOut,
}) {
  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <img
          src="/flower.png"
          alt="Bud & Brush"
          className="h-12 w-12 object-cover"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span className="max-w-48 truncate" title={user?.email}>
          {user?.email}
        </span>
        <span className="rounded-full bg-sky-100 px-3 py-1 font-medium capitalize text-sky-800">
          {userRole}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1">
          {syncStatus}
        </span>
        {userRole === ROLES.ADMIN && (
          <button
            className="inline-flex items-center justify-center"
            type="button"
            onClick={onNewDay}
            title="Archive and clear today's sales"
          >
            <img src="/newday.svg" alt="New Day icon" className="h-10 w-10" />
          </button>
        )}
        <button
          className="rounded-full border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
          type="button"
          onClick={onSignOut}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
