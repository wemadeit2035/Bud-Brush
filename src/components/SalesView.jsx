import { useMemo, useState } from "react";
import PreRollSummary from "./PreRollSummary";
import EditTransactionModal from "./EditTransactionModal";
import {
  saveProducts,
  deleteTransaction as deleteTransactionFromDb,
} from "../services/database";

export default function SalesView({
  products,
  transactions,
  setTransactions,
  setProducts,
  showToast,
  dailyAdjustments = [],
  setDailyAdjustments,
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("0");
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [showAdjustment, setShowAdjustment] = useState(false);

  const parsedAdjustmentAmount = useMemo(() => {
    const amount = Number(adjustmentAmount);
    return Number.isFinite(amount) ? amount : 0;
  }, [adjustmentAmount]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      const matchesPayment = filter === "all" || tx.payment === filter;
      const matchesSearch =
        tx.note?.toLowerCase().includes(query) ||
        tx.items.some((item) => item.productName.toLowerCase().includes(query));
      return matchesPayment && matchesSearch;
    });
  }, [filter, search, transactions]);

  const totalSum = useMemo(() => {
    return filtered.reduce((sum, tx) => sum + (tx.total || 0), 0);
  }, [filtered]);

  const adjustmentTotal = useMemo(() => {
    return dailyAdjustments.reduce(
      (sum, adjustment) => sum + (Number(adjustment.amount) || 0),
      0,
    );
  }, [dailyAdjustments]);

  const adjustedTotal = useMemo(() => {
    return totalSum + adjustmentTotal;
  }, [totalSum, adjustmentTotal]);

  const exportSalesCsv = () => {
    const rows = [
      ["Date", "Product", "Qty", "Payment", "Total"],
      ...filtered.flatMap((tx) =>
        tx.items.map((item) => [
          new Date(tx.date).toLocaleString(),
          item.productName,
          item.quantity,
          tx.payment,
          item.lineTotal,
        ]),
      ),
    ];

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `sales-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("Exported", "Sales CSV downloaded.", "success");
  };

  const formatItemDetails = (item) => {
    let tags = "";
    let priceDisplay = "";

    const originalTotal = item.unitPrice * item.quantity;
    const paidPrice = item.lineTotal;
    const priceDiff = originalTotal - paidPrice;

    if (item.customPrice) {
      tags += " ✏️";
    }

    if (item.isBundle) {
      tags += " 🎯";
      if (item.bundleType?.includes("Greenhouse PR")) {
        tags += " 🌿";
      } else if (item.bundleType?.includes("Indoor PR")) {
        tags += " 🏠";
      } else if (item.bundleType?.includes("Greenhouse Bud")) {
        tags += " 🌿";
      } else if (item.bundleType?.includes("Indoor Bud")) {
        tags += " 🏠";
      }
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
      display: `${item.quantity}x ${item.productName}${tags} → ${priceDisplay}`,
      tags,
      priceDisplay,
      isCustom: item.customPrice,
      isBundle: item.isBundle,
      discount: priceDiff > 0 ? priceDiff : 0,
    };
  };

  const calculateTransactionTotals = (tx) => {
    let subtotal = 0;
    let total = 0;
    let totalDiscount = 0;
    let discountedItems = 0;

    tx.items.forEach((item) => {
      const originalTotal = item.unitPrice * item.quantity;
      const paidPrice = item.lineTotal;
      subtotal += originalTotal;
      total += paidPrice;

      if (paidPrice < originalTotal) {
        totalDiscount += originalTotal - paidPrice;
        discountedItems++;
      }
    });

    return { subtotal, total, totalDiscount, discountedItems };
  };

  const handleAddAdjustment = () => {
    if (!setDailyAdjustments) {
      showToast(
        "Adjustments Unavailable",
        "Daily adjustments could not be saved in this session.",
        "error",
      );
      return;
    }

    if (adjustmentAmount.trim() === "") {
      showToast(
        "Invalid Adjustment",
        "Enter an amount before adding the adjustment.",
        "warning",
      );
      return;
    }

    if (!adjustmentNote.trim()) {
      showToast(
        "Note Required",
        "Add a note for each adjustment entry.",
        "warning",
      );
      return;
    }

    if (parsedAdjustmentAmount === 0) {
      showToast(
        "Invalid Adjustment",
        "Adjustment amount cannot be zero.",
        "warning",
      );
      return;
    }

    const newAdjustment = {
      id:
        typeof crypto?.randomUUID === "function"
          ? crypto.randomUUID()
          : `adj-${Date.now()}`,
      amount: parsedAdjustmentAmount,
      note: adjustmentNote.trim(),
      createdAt: new Date().toISOString(),
    };

    setDailyAdjustments((currentAdjustments) => [
      ...currentAdjustments,
      newAdjustment,
    ]);
    setAdjustmentAmount("0");
    setAdjustmentNote("");
    setShowAdjustment(true);

    showToast(
      "Adjustment Added",
      `${parsedAdjustmentAmount > 0 ? "Added" : "Deducted"} R${Math.abs(parsedAdjustmentAmount).toFixed(2)}: ${newAdjustment.note}`,
      "success",
    );
  };

  const handleRemoveAdjustment = (adjustmentId) => {
    if (!setDailyAdjustments) return;

    setDailyAdjustments((currentAdjustments) =>
      currentAdjustments.filter((adjustment) => adjustment.id !== adjustmentId),
    );
    showToast("Adjustment Removed", "Removed adjustment entry.", "info");
  };

  const handleEditClick = (transaction) => {
    setEditingTransaction(transaction);
  };

  const handleEditSave = (updatedTransaction) => {
    const updatedTransactions = transactions.map((tx) =>
      tx.id === updatedTransaction.id ? updatedTransaction : tx,
    );
    setTransactions(updatedTransactions);
    setEditingTransaction(null);
    showToast("Success", "Transaction updated successfully.", "success");
  };

  const handleDeleteTransaction = async (transactionId) => {
    try {
      const transaction = transactions.find((tx) => tx.id === transactionId);

      if (transaction && transaction.items) {
        const updatedProducts = products.map((product) => {
          const item = transaction.items.find(
            (i) => i.productId === product.id,
          );
          if (item) {
            return {
              ...product,
              stock: product.stock + item.quantity,
            };
          }
          return product;
        });

        if (typeof setProducts === "function") {
          setProducts(updatedProducts);
        }

        await saveProducts(updatedProducts);
      }

      await deleteTransactionFromDb(transactionId);

      const updatedTransactions = transactions.filter(
        (tx) => tx.id !== transactionId,
      );

      if (typeof setTransactions === "function") {
        setTransactions(updatedTransactions);
      }

      showToast("Deleted", "Transaction removed successfully.", "success");
    } catch (error) {
      console.error("❌ Delete error:", error);
      showToast(
        "Error",
        "Failed to delete transaction. Check console for details.",
        "error",
      );
    }
  };

  const getPaymentBadgeClass = (payment) => {
    const classes = {
      Cash: "bg-emerald-100 text-emerald-700",
      Yoco: "bg-purple-100 text-purple-700",
      EFT: "bg-amber-100 text-amber-700",
      Uberzol: "bg-blue-100 text-blue-700",
    };
    return classes[payment] || "bg-slate-100 text-slate-700";
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Transaction History</h2>
            <p className="text-sm text-slate-500">
              Review sales and export transactions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="🔍 Search..."
              className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-sky-400"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All Payments</option>
              <option value="Cash">Cash</option>
              <option value="Yoco">Yoco</option>
              <option value="EFT">EFT</option>
              <option value="Uberzol">Uberzol</option>
            </select>
            <button
              type="button"
              className="rounded-3xl bg-emerald-600 px-4 py-3 text-sm text-white hover:bg-emerald-700"
              onClick={exportSalesCsv}
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-3xl border border-slate-200">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Date & Note</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No transactions found
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const { subtotal, total, totalDiscount, discountedItems } =
                    calculateTransactionTotals(tx);

                  return (
                    <tr
                      key={tx.id}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold">
                          {new Date(tx.date).toLocaleString()}
                        </div>
                        {tx.note && (
                          <div className="text-xs text-slate-500">
                            {tx.note}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {tx.items.map((item, index) => {
                            const formatted = formatItemDetails(item);
                            return (
                              <div
                                key={index}
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
                            💸 Discount: -R{totalDiscount.toFixed(2)} (
                            {discountedItems} item
                            {discountedItems > 1 ? "s" : ""})
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold">
                          {tx.items.length} items
                        </div>
                        <div className="text-xs text-slate-500">
                          {tx.items.reduce(
                            (sum, item) => sum + item.quantity,
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
                        <div className="font-bold text-slate-900">
                          R{total.toFixed(2)}
                        </div>
                        {totalDiscount > 0 && (
                          <div className="text-xs text-slate-400 line-through">
                            R{subtotal.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs hover:bg-slate-100"
                            onClick={() => handleEditClick(tx)}
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 hover:bg-rose-100"
                            onClick={() => handleDeleteTransaction(tx.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="border-t-2 border-slate-300 bg-slate-50">
                <tr>
                  <td
                    colSpan="4"
                    className="px-4 py-3 text-right font-bold text-slate-700"
                  >
                    TOTAL SALES:
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">
                      R{totalSum.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-1 text-xs hover:bg-slate-100"
                      onClick={() => setShowAdjustment((current) => !current)}
                    >
                      {showAdjustment ? "Hide" : "Adjust"}
                    </button>
                  </td>
                </tr>
                {adjustmentTotal !== 0 && (
                  <tr className="border-t border-emerald-200 bg-emerald-50">
                    <td
                      colSpan="4"
                      className="px-4 py-3 text-right font-bold text-emerald-700"
                    >
                      ADJUSTMENTS TOTAL:
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-emerald-700">
                        R{adjustmentTotal.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-emerald-600">
                      {dailyAdjustments.length} entries
                    </td>
                  </tr>
                )}
              </tfoot>
            )}
          </table>
        </div>

        {(showAdjustment || dailyAdjustments.length > 0) && (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-amber-800">
                  Daily Adjustments
                </h3>
                <p className="text-sm text-amber-700">
                  Add multiple amounts and save each one with its own note.
                </p>
              </div>
              <button
                type="button"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-100"
                onClick={() => setShowAdjustment((current) => !current)}
              >
                {showAdjustment ? "Hide Form" : "Show Form"}
              </button>
            </div>

            {showAdjustment && (
              <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium text-amber-700">
                    Adjustment Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-2xl border border-amber-300 bg-white px-3 py-2 text-sm"
                    value={adjustmentAmount}
                    onChange={(event) =>
                      setAdjustmentAmount(event.target.value)
                    }
                    placeholder="Use a minus sign to deduct"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium text-amber-700">
                    Note for this adjustment
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-amber-300 bg-white px-3 py-2 text-sm"
                    value={adjustmentNote}
                    onChange={(event) => setAdjustmentNote(event.target.value)}
                    placeholder="Reason for the adjustment"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
                    onClick={handleAddAdjustment}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-100"
                    onClick={() => setShowAdjustment(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {dailyAdjustments.length > 0 ? (
              <div className="space-y-3">
                {dailyAdjustments.map((adjustment) => (
                  <div
                    key={adjustment.id}
                    className="flex flex-col gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">
                        {adjustment.amount > 0 ? "+" : ""}R
                        {Number(adjustment.amount || 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-slate-500">
                        {adjustment.note || "No note"}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 hover:bg-rose-100"
                      onClick={() => handleRemoveAdjustment(adjustment.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span className="text-sm font-medium text-slate-600">
                    Adjusted Total
                  </span>
                  <strong className="text-emerald-700">
                    R{adjustedTotal.toFixed(2)}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">
                No adjustments added yet.
              </div>
            )}
          </div>
        )}
      </div>

      <PreRollSummary products={products} transactions={transactions} />

      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          products={products}
          onClose={() => setEditingTransaction(null)}
          onSave={handleEditSave}
          showToast={showToast}
        />
      )}
    </div>
  );
}
