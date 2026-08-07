export default function TabNav({ activeView, onChangeView, onClearDay }) {
  const tabs = [
    { id: "pos", label: "POS", icon: "fa-cash-register" },
    { id: "inventory", label: "Inventory", icon: "fa-boxes" },
    { id: "sales", label: "Sales", icon: "fa-history" },
    { id: "dashboard", label: "Dashboard", icon: "fa-chart-pie" },
    { id: "archive", label: "Archive", icon: "fa-archive" },
  ];

  return (
    <nav className="flex flex-wrap gap-3 rounded-3xl bg-white p-3 shadow-sm border border-slate-200">
      {tabs.map((tab) => (
        <a
          key={tab.id}
          href={`#${tab.id}`}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeView === tab.id
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
          onClick={(event) => {
            event.preventDefault();
            onChangeView(tab.id);
          }}
        >
          <i className={`fa ${tab.icon} me-2`} />
          {tab.label}
        </a>
      ))}
      <button
        className="ml-auto rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700"
        type="button"
        onClick={onClearDay}
      >
        <i className="fa fa-trash-alt me-2" />
        Clear Day
      </button>
    </nav>
  );
}
