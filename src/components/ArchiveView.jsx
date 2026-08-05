import { useState } from "react";

export default function ArchiveView({ archives, currency, refreshArchives }) {
  const [selectedArchive, setSelectedArchive] = useState(null);

  const viewArchive = (archive) => {
    setSelectedArchive(archive);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Sales Archive</h2>
            <p className="text-sm text-slate-500">
              View daily archived sales history.
            </p>
          </div>
          <button
            type="button"
            className="rounded-3xl bg-slate-900 px-4 py-3 text-sm text-white hover:bg-slate-800"
            onClick={refreshArchives}
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-200">
          <table className="table min-w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Transactions</th>
                <th className="px-4 py-3">Items Sold</th>
                <th className="px-4 py-3">Total Revenue</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {archives.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-slate-500 py-8">
                    No archived days found.
                  </td>
                </tr>
              ) : (
                archives.map((archive) => {
                  const summary = archive.data?.summary || {};
                  return (
                    <tr
                      key={archive.archive_date}
                      className="border-t border-slate-200"
                    >
                      <td className="px-4 py-4 font-semibold">
                        {archive.archive_date}
                      </td>
                      <td className="px-4 py-4">
                        {archive.transaction_count || 0}
                      </td>
                      <td className="px-4 py-4">{archive.item_count || 0}</td>
                      <td className="px-4 py-4">
                        {currency(
                          summary.totalRevenue || archive.total_revenue || 0,
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                          onClick={() => viewArchive(archive)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedArchive && (
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                Details for {selectedArchive.archive_date}
              </h3>
              <p className="text-sm text-slate-500">
                Summary of archived sales for the selected day.
              </p>
            </div>
            <button
              type="button"
              className="rounded-3xl bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200"
              onClick={() => setSelectedArchive(null)}
            >
              Close
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Revenue</div>
              <div className="mt-2 text-xl font-semibold">
                {currency(
                  selectedArchive.data?.summary?.totalRevenue ||
                    selectedArchive.total_revenue ||
                    0,
                )}
              </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Transactions</div>
              <div className="mt-2 text-xl font-semibold">
                {selectedArchive.transaction_count || 0}
              </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Items Sold</div>
              <div className="mt-2 text-xl font-semibold">
                {selectedArchive.item_count ||
                  selectedArchive.data?.summary?.itemCount ||
                  0}
              </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Cash Total</div>
              <div className="mt-2 text-xl font-semibold">
                {currency(
                  selectedArchive.data?.summary?.cashTotal ||
                    selectedArchive.cash_total ||
                    0,
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200">
            <table className="table min-w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {(selectedArchive.data?.transactions || []).map((tx, index) => (
                  <tr key={index} className="border-t border-slate-200">
                    <td className="px-4 py-4">{tx.payment}</td>
                    <td className="px-4 py-4">{currency(tx.total)}</td>
                    <td className="px-4 py-4">{tx.items?.length || 0}</td>
                    <td className="px-4 py-4">{tx.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
