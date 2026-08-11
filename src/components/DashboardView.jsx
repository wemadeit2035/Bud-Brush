import {
  TOTAL_REVENUE_TEXT_CLASS,
  getPaymentTotalTextClass,
} from "../constants/paymentColors";

export default function DashboardView({
  products,
  transactions,
  archives = [],
}) {
  const totalRevenue = transactions.reduce(
    (sum, tx) => sum + (tx.total || 0),
    0,
  );
  const paymentMethods = ["Cash", "Yoco", "EFT", "Uberzol"];
  const paymentTotals = transactions.reduce(
    (acc, tx) => {
      const paymentMethod = tx.payment || "Cash";
      acc[paymentMethod] = (acc[paymentMethod] || 0) + (tx.total || 0);
      return acc;
    },
    { Cash: 0, Yoco: 0, EFT: 0, Uberzol: 0 },
  );

  const topProducts = Object.values(
    transactions.reduce((acc, tx) => {
      tx.items.forEach((item) => {
        acc[item.productId] = acc[item.productId] || {
          name: item.productName,
          units: 0,
          revenue: 0,
        };
        acc[item.productId].units += item.quantity;
        acc[item.productId].revenue += item.lineTotal;
      });
      return acc;
    }, {}),
  )
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  const lowStock = products.filter((product) => {
    const normalizedType = String(product.type || "")
      .toLowerCase()
      .replace(/\s+/g, "-");
    const isTrackedType =
      normalizedType === "pre-roll" || normalizedType === "flower";
    return isTrackedType && product.stock < 15;
  });

  const dailyRevenue = (() => {
    const totalsByDay = new Map();

    // Primary source: archived day totals keyed by archive date.
    archives.forEach((archive) => {
      const key = String(archive?.archive_date || "").slice(0, 10);
      if (!key) return;

      const archiveTotal = Number(
        archive?.total_revenue || archive?.data?.summary?.totalRevenue || 0,
      );
      totalsByDay.set(key, archiveTotal);
    });

    // Fallback source: current transactions only for dates not yet archived.
    const txTotalsByDay = new Map();
    transactions.forEach((tx) => {
      if (!tx?.date) return;
      const txDate = new Date(tx.date);
      if (Number.isNaN(txDate.getTime())) return;
      txDate.setHours(0, 0, 0, 0);
      const key = txDate.toISOString().slice(0, 10);
      txTotalsByDay.set(
        key,
        (txTotalsByDay.get(key) || 0) + Number(tx.total || 0),
      );
    });

    txTotalsByDay.forEach((value, key) => {
      if (!totalsByDay.has(key)) {
        totalsByDay.set(key, value);
      }
    });

    const days = Array.from(totalsByDay.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .slice(0, 7)
      .map(([key, value]) => {
        const date = new Date(`${key}T00:00:00`);
        return {
          key,
          label: date.toLocaleDateString(undefined, { weekday: "short" }),
          dateLabel: date.toLocaleDateString(undefined, {
            day: "2-digit",
            month: "short",
          }),
          value,
        };
      });

    const values = days.map((day) => day.value || 0);
    const maxValue = Math.max(...values, 0);

    return days.map((day) => {
      const value = day.value || 0;
      const percent = maxValue > 0 ? (value / maxValue) * 100 : 0;
      return {
        ...day,
        value,
        percent,
      };
    });
  })();

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <img src="/dashboard.svg" alt="Dashboard icon" className="h-5 w-5" />
          Dashboard
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500">Total Revenue</div>
          <div
            className={`mt-4 text-3xl font-semibold ${TOTAL_REVENUE_TEXT_CLASS}`}
          >
            R{totalRevenue.toFixed(2)}
          </div>
        </div>
        {paymentMethods.map((method) => (
          <div
            key={method}
            className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200"
          >
            <div className="text-sm text-slate-500">{method}</div>
            <div
              className={`mt-4 text-2xl font-semibold ${getPaymentTotalTextClass(method)}`}
            >
              R{paymentTotals[method].toFixed(2)}
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
          <h3 className="mb-4 font-semibold">Payment Breakdown</h3>
          <div className="space-y-3">
            {paymentMethods.map((key) => (
              <div
                key={key}
                className="flex items-center justify-between text-sm text-slate-700"
              >
                <span>{key}</span>
                <strong className={getPaymentTotalTextClass(key)}>
                  R{paymentTotals[key].toFixed(2)}
                </strong>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
          <h3 className="mb-4 font-semibold">Top Products</h3>
          <div className="space-y-3">
            {topProducts.length > 0 ? (
              topProducts.map((product) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between text-sm text-slate-700"
                >
                  <span>{product.name}</span>
                  <strong>{product.units} units</strong>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">No product sales yet</div>
            )}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
          <h3 className="mb-4 font-semibold">Stock Alerts</h3>
          <div className="space-y-3">
            {lowStock.length > 0 ? (
              lowStock.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between text-sm text-slate-700"
                >
                  <span>{product.name}</span>
                  <strong className="text-rose-700">
                    {product.stock} left
                  </strong>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">
                All items are comfortably stocked
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
        <h3 className="mb-4 font-semibold">Daily Revenue (7 Days)</h3>
        <div className="grid gap-3 md:grid-cols-7">
          {dailyRevenue.map((day) => (
            <div
              key={day.key}
              className="rounded-3xl bg-slate-50 p-4 text-center text-sm"
            >
              <div className="mb-2 text-xs text-slate-500">{day.label}</div>
              <div className="mb-2 text-[11px] text-slate-400">
                {day.dateLabel}
              </div>
              <div className="flex h-24 items-end rounded-3xl bg-slate-100 p-2">
                <div
                  className="w-full rounded-2xl bg-sky-500"
                  style={{
                    height: `${Math.max(day.percent, day.value > 0 ? 8 : 0)}%`,
                  }}
                  title={`R${day.value.toFixed(2)}`}
                />
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-700">
                R{day.value.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
