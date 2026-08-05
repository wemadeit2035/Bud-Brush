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
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editingTransaction, setEditingTransaction] = useState(null);

  // ✅ State for total adjustment (matches original)
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [showAdjustment, setShowAdjustment] = useState(false);

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

  // ✅ Calculate total from filtered transactions
  const totalSum = useMemo(() => {
    return filtered.reduce((sum, tx) => sum + (tx.total || 0), 0);
  }, [filtered]);

  // ✅ Calculate adjusted total
  const adjustedTotal = useMemo(() => {
    return totalSum + adjustmentAmount;
  }, [totalSum, adjustmentAmount]);

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

  // ✅ Format item details with tags and price strikethrough
  const formatItemDetails = (item) => {
    let tags = "";
    let priceDisplay = "";

    const originalTotal = item.unitPrice * item.quantity;
    const paidPrice = item.lineTotal;
    const priceDiff = originalTotal - paidPrice;

    // ✅ Add tags based on item properties
    if (item.customPrice) {
      tags += " ✏️";
    }
    if (item.isBundle) {
      tags += " 🎯";

      // Check which bundle type
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

    // ✅ Price display with strikethrough if discounted
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
        // Markup case (custom price higher than original)
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

  // ✅ Calculate transaction totals
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

  // ✅ Handle adjustment
  const handleApplyAdjustment = () => {
    if (adjustmentAmount === 0) {
      setShowAdjustment(false);
      showToast(
        "Adjustment Removed",
        "Total adjustment has been cleared.",
        "info",
      );
      return;
    }

    setShowAdjustment(true);
    const action = adjustmentAmount > 0 ? "Added" : "Deducted";
    showToast(
      "Adjustment Applied",
      `${action} R${Math.abs(adjustmentAmount).toFixed(2)}${adjustmentNote ? ": " + adjustmentNote : ""}. New total: R${adjustedTotal.toFixed(2)}`,
      "success",
    );
  };

  const handleCancelAdjustment = () => {
    setShowAdjustment(false);
    setAdjustmentAmount(0);
    setAdjustmentNote("");
  };

  const handleEditClick = (transaction) => {
    console.log("✏️ Editing transaction:", transaction.id);
    setEditingTransaction(transaction);
  };

  const handleEditSave = (updatedTransaction) => {
    console.log("💾 Updated transaction:", updatedTransaction.id);
    const updatedTransactions = transactions.map((tx) =>
      tx.id === updatedTransaction.id ? updatedTransaction : tx,
    );
    setTransactions(updatedTransactions);
    setEditingTransaction(null);
    showToast("Success", "Transaction updated successfully.", "success");
  };

  const handleDeleteTransaction = async (transactionId) => {
    console.log(`🗑️ Deleting transaction ${transactionId}...`);

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

      const result = await deleteTransactionFromDb(transactionId);

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

  // ✅ Get payment badge class
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
                          <div className="mt-2 text-xs text-emerald-600 font-semibold">
                            💸 Discount: -R{totalDiscount.toFixed(2)}(
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
            {/* ✅ TFOOT - Sales Total Row */}
            {filtered.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-300">
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
                      onClick={() => setShowAdjustment(!showAdjustment)}
                    >
                      {showAdjustment ? "Hide" : "Adjust"}
                    </button>
                  </td>
                </tr>
                {/* ✅ Adjustment Row */}
                {showAdjustment && (
                  <tr className="bg-amber-50 border-t border-amber-200">
                    <td colSpan="3" className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-amber-700">
                          Adjustment:
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          className="w-32 rounded-2xl border border-amber-300 bg-white px-3 py-1 text-sm"
                          value={adjustmentAmount}
                          onChange={(e) =>
                            setAdjustmentAmount(parseFloat(e.target.value) || 0)
                          }
                          placeholder="0.00"
                        />
                        <input
                          type="text"
                          className="w-40 rounded-2xl border border-amber-300 bg-white px-3 py-1 text-sm"
                          value={adjustmentNote}
                          onChange={(e) => setAdjustmentNote(e.target.value)}
                          placeholder="Note (optional)"
                        />
                      </div>
                    </td>
                    <td colSpan="2" className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          Adjusted Total:
                        </span>
                        <span className="font-bold text-amber-700">
                          R{adjustedTotal.toFixed(2)}
                        </span>
                        {adjustmentAmount !== 0 && (
                          <span className="text-xs text-amber-600">
                            ({adjustmentAmount > 0 ? "+" : ""}
                            {adjustmentAmount.toFixed(2)})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          className="rounded-2xl bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700"
                          onClick={handleApplyAdjustment}
                        >
                          Apply
                        </button>
                        <button
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-1 text-xs hover:bg-slate-100"
                          onClick={handleCancelAdjustment}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {/* ✅ Adjusted Total Row (when adjustment is applied) */}
                {showAdjustment && adjustmentAmount !== 0 && (
                  <tr className="bg-emerald-50 border-t border-emerald-200">
                    <td
                      colSpan="4"
                      className="px-4 py-3 text-right font-bold text-emerald-700"
                    >
                      ADJUSTED TOTAL:
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-emerald-700">
                        R{adjustedTotal.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-emerald-600">
                        {adjustmentNote || "Manual adjustment"}
                      </span>
                    </td>
                  </tr>
                )}
              </tfoot>
            )}
          </table>
        </div>
      </div>
      <PreRollSummary products={products} transactions={transactions} />

      {/* Edit Transaction Modal */}
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
