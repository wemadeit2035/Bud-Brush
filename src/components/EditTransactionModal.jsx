// EditTransactionModal.jsx
import { useState, useEffect } from "react";
import { saveTransaction } from "../services/database";

export default function EditTransactionModal({
  transaction,
  products,
  onClose,
  onSave,
  showToast,
}) {
  const [editedItems, setEditedItems] = useState([]);
  const [payment, setPayment] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (transaction) {
      setPayment(transaction.payment || "Cash");
      setNote(transaction.note || "");
      setEditedItems(
        transaction.items.map((item) => ({
          ...item,
          originalTotal: item.unitPrice * item.quantity,
        })),
      );
    }
  }, [transaction]);

  const updateItem = (index, field, value) => {
    const updated = [...editedItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditedItems(updated);
  };

  const updateQuantity = (index, newQuantity) => {
    const updated = [...editedItems];
    const item = updated[index];
    const newQty = Math.max(1, parseInt(newQuantity) || 1);
    const unitPrice = item.unitPrice || 0;

    item.quantity = newQty;
    item.lineTotal = unitPrice * newQty;
    setEditedItems(updated);
  };

  const updateUnitPrice = (index, newPrice) => {
    const updated = [...editedItems];
    const item = updated[index];
    const price = parseFloat(newPrice) || 0;

    item.unitPrice = price;
    item.lineTotal = price * item.quantity;
    setEditedItems(updated);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let total = 0;

    editedItems.forEach((item) => {
      const originalTotal = item.unitPrice * item.quantity;
      subtotal += originalTotal;
      total += item.lineTotal || originalTotal;
    });

    return { subtotal, total, discount: subtotal - total };
  };

  const handleSave = async () => {
    const { subtotal, total, discount } = calculateTotals();

    // Prepare items with customPrice as boolean
    const items = editedItems.map((item) => {
      const originalTotal = item.unitPrice * item.quantity;
      const isCustomPrice = item.lineTotal !== originalTotal;

      return {
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal || originalTotal,
        isBundle: item.isBundle || false,
        bundleDiscount: item.bundleDiscount || 0,
        customPrice: isCustomPrice, // ← Boolean!
      };
    });

    const updatedTransaction = {
      id: transaction.id,
      payment: payment,
      total: total,
      subtotal: subtotal,
      discount: discount,
      items: items,
      date: transaction.date,
      note: note,
    };

    try {
      await saveTransaction(updatedTransaction);
      onSave(updatedTransaction);
      showToast("Success", "Transaction updated successfully.", "success");
    } catch (error) {
      console.error("Error saving edited transaction:", error);
      showToast("Error", "Failed to update transaction.", "error");
    }
  };

  if (!transaction) return null;

  const { subtotal, total, discount } = calculateTotals();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            <i className="fa fa-pen-to-square me-2" />
            Edit Transaction
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Payment Method
          </label>
          <select
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-sky-400 focus:outline-none"
          >
            <option value="Cash">Cash</option>
            <option value="Yoco">Yoco</option>
            <option value="EFT">EFT</option>
            <option value="Uberzol">Uberzol</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Items
          </label>
          <div className="space-y-3">
            {editedItems.map((item, index) => {
              const originalTotal = item.unitPrice * item.quantity;
              const isCustomPrice = item.lineTotal !== originalTotal;

              return (
                <div
                  key={index}
                  className="rounded-3xl border border-slate-200 p-4"
                >
                  <div className="mb-2 font-semibold text-slate-900">
                    {item.productName}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(index, e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 focus:border-sky-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">
                        Unit Price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateUnitPrice(index, e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 focus:border-sky-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">
                        Line Total
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.lineTotal || originalTotal}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "lineTotal",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className={`w-full rounded-2xl border px-3 py-2 focus:outline-none ${
                          isCustomPrice
                            ? "border-amber-400 bg-amber-50"
                            : "border-slate-200"
                        }`}
                      />
                      {isCustomPrice && (
                        <div className="mt-1 text-xs text-amber-600">
                          <i className="fa fa-pen-to-square me-1" />
                          Custom price (original: R{originalTotal.toFixed(2)})
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Note
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note..."
            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-sky-400 focus:outline-none"
          />
        </div>

        <div className="border-t border-slate-200 pt-4">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal:</span>
            <span>R{subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Discount:</span>
              <span>-R{discount.toFixed(2)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between text-lg font-semibold text-slate-900">
            <span>Total:</span>
            <span>R{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="w-full rounded-3xl border border-slate-200 px-4 py-3 font-semibold hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="w-full rounded-3xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
