export default function PreRollSummary({ products, transactions }) {
  const preRollProducts = products.filter(
    (p) => p.type?.toLowerCase() === "pre-roll",
  );

  const today = new Date();
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const soldToday = transactions.reduce((acc, tx) => {
    const txDate = new Date(tx.date);
    if (txDate >= todayStart && txDate <= todayEnd) {
      tx.items.forEach((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (product?.type?.toLowerCase() === "pre-roll") {
          acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
        }
      });
    }
    return acc;
  }, {});

  const rows = preRollProducts.map((product) => {
    const sold = soldToday[product.id] || 0;
    const startStock = product.stock + sold;
    const remaining = product.stock;
    return {
      ...product,
      sold,
      startStock,
      remaining,
    };
  });

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Pre-roll Summary</h2>
          <p className="text-sm text-slate-500">
            Daily pre-roll stock and sales.
          </p>
        </div>
        <button className="rounded-3xl bg-emerald-600 px-4 py-3 text-sm text-white">
          Export Summary
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-slate-50 p-4 text-center">
          <div className="text-sm text-slate-500">As of</div>
          <div className="mt-2 font-semibold">{today.toLocaleDateString()}</div>
        </div>
        <div className="rounded-3xl bg-slate-50 p-4 text-center">
          <div className="text-sm text-slate-500">Start</div>
          <div className="mt-2 font-semibold">
            {rows.reduce((sum, row) => sum + row.startStock, 0)}
          </div>
        </div>
        <div className="rounded-3xl bg-slate-50 p-4 text-center">
          <div className="text-sm text-slate-500">Remaining</div>
          <div className="mt-2 font-semibold">
            {rows.reduce((sum, row) => sum + row.remaining, 0)}
          </div>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Starting Stock</th>
              <th className="px-4 py-3">Sold Today</th>
              <th className="px-4 py-3">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-200">
                <td className="px-4 py-4">
                  <div className="font-semibold">{row.name}</div>
                  <div className="text-xs text-slate-500">
                    {row.category} • {row.type}
                  </div>
                </td>
                <td className="px-4 py-4">{row.startStock}</td>
                <td className="px-4 py-4">{row.sold}</td>
                <td className="px-4 py-4">{row.remaining}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
