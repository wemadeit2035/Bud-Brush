import { useState } from "react";
import {
  TOTAL_REVENUE_TEXT_CLASS,
  getPaymentBadgeClass,
  getPaymentTotalTextClass,
} from "../constants/paymentColors";

export default function ArchiveView({
  archives,
  currency,
  refreshArchives,
  onDeleteArchive,
}) {
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [deletingArchiveDate, setDeletingArchiveDate] = useState("");

  const viewArchive = (archive) => {
    setSelectedArchive(archive);
  };

  const handleDeleteClick = async (archive) => {
    if (!archive?.archive_date || typeof onDeleteArchive !== "function") return;

    const confirmed = window.confirm(
      `Delete archive for ${archive.archive_date}? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingArchiveDate(archive.archive_date);
    const deleted = await onDeleteArchive(archive.archive_date);
    setDeletingArchiveDate("");

    if (deleted && selectedArchive?.archive_date === archive.archive_date) {
      setSelectedArchive(null);
    }
  };

  const formatItemDetails = (item) => {
    let tags = "";
    let priceDisplay = "";

    const originalTotal = (item.unitPrice || 0) * (item.quantity || 0);
    const paidPrice = Number(item.lineTotal || 0);
    const priceDiff = originalTotal - paidPrice;

    if (item.customPrice) {
      tags += ' <i class="fa fa-pen-to-square"></i>';
    }

    if (item.isBundle) {
      tags += ' <i class="fa fa-bullseye"></i>';
    }

    if (paidPrice !== originalTotal) {
      const isDiscount = priceDiff > 0;
      const diffAmount = Math.abs(priceDiff);

      if (isDiscount) {
        priceDisplay = `
          <span class="line-through text-slate-400">R${originalTotal.toFixed(2)}</span>
          <span class="font-bold text-emerald-600">R${paidPrice.toFixed(2)}</span>
          <span class="text-xs text-emerald-600">(-R${diffAmount.toFixed(2)})</span>
        `;
      } else {
        priceDisplay = `
          <span class="line-through text-slate-400">R${originalTotal.toFixed(2)}</span>
          <span class="font-bold text-amber-600">R${paidPrice.toFixed(2)}</span>
          <span class="text-xs text-amber-600">(+R${diffAmount.toFixed(2)})</span>
        `;
      }
    } else {
      priceDisplay = `<span class="font-medium">R${paidPrice.toFixed(2)}</span>`;
    }

    return {
      display: `${item.quantity || 0}x ${item.productName || "Item"}${tags} → ${priceDisplay}`,
    };
  };

  const calculateTransactionTotals = (tx) => {
    let subtotal = 0;
    let total = 0;
    let totalDiscount = 0;
    let discountedItems = 0;

    (tx.items || []).forEach((item) => {
      const originalTotal = (item.unitPrice || 0) * (item.quantity || 0);
      const paidPrice = Number(item.lineTotal ?? originalTotal);
      subtotal += originalTotal;
      total += paidPrice;

      if (paidPrice < originalTotal) {
        totalDiscount += originalTotal - paidPrice;
        discountedItems++;
      }
    });

    return { subtotal, total, totalDiscount, discountedItems };
  };

  const archivedPreRollSummary = selectedArchive?.data?.summary?.preRollSummary;
  const archivedPreRollRows = Array.isArray(archivedPreRollSummary?.rows)
    ? archivedPreRollSummary.rows
    : [];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <img src="/archives.svg" alt="Archive icon" className="h-5 w-5" />
              Sales Archive
            </h2>
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
                      <td
                        className={`px-4 py-4 font-semibold ${TOTAL_REVENUE_TEXT_CLASS}`}
                      >
                        {currency(
                          summary.totalRevenue || archive.total_revenue || 0,
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                            onClick={() => viewArchive(archive)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                            onClick={() => handleDeleteClick(archive)}
                            disabled={
                              deletingArchiveDate === archive.archive_date
                            }
                          >
                            {deletingArchiveDate === archive.archive_date
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-3xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Revenue</div>
              <div
                className={`mt-2 text-xl font-semibold ${TOTAL_REVENUE_TEXT_CLASS}`}
              >
                {currency(
                  selectedArchive.data?.summary?.totalRevenue ||
                    selectedArchive.total_revenue ||
                    0,
                )}
              </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Cash Total</div>
              <div className="mt-2 text-xl font-semibold text-emerald-700">
                {currency(
                  selectedArchive.data?.summary?.cashTotal ||
                    selectedArchive.cash_total ||
                    0,
                )}
              </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">EFT Total</div>
              <div className="mt-2 text-xl font-semibold text-amber-700">
                {currency(
                  selectedArchive.data?.summary?.eftTotal ||
                    selectedArchive.eft_total ||
                    0,
                )}
              </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Yoco Total</div>
              <div className="mt-2 text-xl font-semibold text-sky-600">
                {currency(
                  selectedArchive.data?.summary?.yocoTotal ||
                    selectedArchive.yoco_total ||
                    0,
                )}
              </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Uberzol Total</div>
              <div className="mt-2 text-xl font-semibold text-violet-700">
                {currency(
                  selectedArchive.data?.summary?.uberzolTotal ||
                    selectedArchive.uberzol_total ||
                    0,
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700">
                Day Adjustments
              </h4>
              <span className="text-xs text-slate-500">
                {selectedArchive.data?.summary?.adjustments?.length || 0}{" "}
                entries
              </span>
            </div>
            {selectedArchive.data?.summary?.adjustments?.length > 0 ? (
              <div className="space-y-2">
                {selectedArchive.data.summary.adjustments.map((adjustment) => (
                  <div
                    key={adjustment.id}
                    className="flex items-start justify-between gap-4 rounded-2xl bg-white px-4 py-3"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">
                        {adjustment.amount > 0 ? "+" : ""}
                        {currency(adjustment.amount)}
                      </div>
                      <div className="text-sm text-slate-500">
                        {adjustment.note || "No note"}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {adjustment.createdAt
                        ? new Date(adjustment.createdAt).toLocaleString()
                        : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                No adjustments were saved for this day.
              </div>
            )}
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-700">
                  Pre-roll Summary
                </h4>
                <p className="text-xs text-slate-500">
                  Archived pre-roll stock snapshot for this day.
                </p>
              </div>
              <span className="text-xs text-slate-500">
                As of{" "}
                {archivedPreRollSummary?.asOf || selectedArchive.archive_date}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-xs text-slate-500">Start</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {Number(archivedPreRollSummary?.totalStart || 0)}
                </div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-xs text-slate-500">Sold</div>
                <div className="mt-1 font-semibold text-emerald-700">
                  {Number(archivedPreRollSummary?.totalSold || 0)}
                </div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="text-xs text-slate-500">Remaining</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {Number(archivedPreRollSummary?.totalRemaining || 0)}
                </div>
              </div>
            </div>

            {archivedPreRollRows.length > 0 ? (
              <div className="mt-4 overflow-x-auto rounded-3xl border border-slate-200">
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Starting Stock</th>
                      <th className="px-4 py-3">Sold</th>
                      <th className="px-4 py-3">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedPreRollRows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-slate-200 bg-white"
                      >
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
            ) : (
              <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">
                No pre-roll snapshot stored for this archive.
              </div>
            )}
          </div>

          <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200">
            <table className="table min-w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Date & Note</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {(selectedArchive.data?.transactions || []).length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  (selectedArchive.data?.transactions || []).map(
                    (tx, index) => {
                      const {
                        subtotal,
                        total,
                        totalDiscount,
                        discountedItems,
                      } = calculateTransactionTotals(tx);

                      return (
                        <tr
                          key={
                            tx.id || `${selectedArchive.archive_date}-${index}`
                          }
                          className="border-t border-slate-200 hover:bg-slate-50"
                        >
                          <td className="px-4 py-4">
                            <div className="font-semibold">
                              {tx.date
                                ? new Date(tx.date).toLocaleString()
                                : selectedArchive.archive_date}
                            </div>
                            {tx.note && (
                              <div className="text-xs text-slate-500">
                                {tx.note}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              {(tx.items || []).map((item, itemIndex) => {
                                const formatted = formatItemDetails(item);
                                return (
                                  <div
                                    key={itemIndex}
                                    className="text-xs"
                                    dangerouslySetInnerHTML={{
                                      __html: formatted.display,
                                    }}
                                  />
                                );
                              })}
                            </div>
                            {totalDiscount > 0 && (
                              <div className="mt-2 text-xs font-semibold text-emerald-600">
                                <i className="fa fa-tags me-1" />
                                Discount: -R{totalDiscount.toFixed(2)} (
                                {discountedItems} item
                                {discountedItems > 1 ? "s" : ""})
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-semibold">
                              {(tx.items || []).length} items
                            </div>
                            <div className="text-xs text-slate-500">
                              {(tx.items || []).reduce(
                                (sum, item) => sum + (item.quantity || 0),
                                0,
                              )}{" "}
                              units
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${getPaymentBadgeClass(tx.payment)}`}
                            >
                              {tx.payment}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div
                              className={`font-bold ${getPaymentTotalTextClass(tx.payment)}`}
                            >
                              R{total.toFixed(2)}
                            </div>
                            {totalDiscount > 0 && (
                              <div className="text-xs text-slate-400 line-through">
                                R{subtotal.toFixed(2)}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    },
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
