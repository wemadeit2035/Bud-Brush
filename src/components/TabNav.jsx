export default function TabNav({ activeView, onChangeView }) {
  const tabs = [
    { id: "pos", label: "POS", iconSrc: "/pos.svg" },
    { id: "members", label: "Members", iconSrc: "/inventory.svg" },
    { id: "inventory", label: "Inventory", iconSrc: "/inventory.svg" },
    { id: "sales", label: "Sales", iconSrc: "/sales.svg" },
    { id: "dashboard", label: "Dashboard", iconSrc: "/dashboard.svg" },
    { id: "archive", label: "Archive", iconSrc: "/archives.svg" },
  ];

  return (
    <nav className="flex flex-wrap gap-3 rounded-3xl bg-white p-3 shadow-sm border border-slate-200">
      {tabs.map((tab) => (
        <a
          key={tab.id}
          href={`#${tab.id}`}
          className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold leading-none transition ${
            activeView === tab.id
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
          onClick={(event) => {
            event.preventDefault();
            onChangeView(tab.id);
          }}
        >
          <img
            src={tab.iconSrc}
            alt={`${tab.label} icon`}
            className="h-4 w-4 shrink-0"
          />
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
