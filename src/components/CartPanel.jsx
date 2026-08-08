import { useMemo, useState } from "react";
import { saveProducts, saveTransaction } from "../services/database";
import { getPaymentTotalTextClass } from "../constants/paymentColors";
import {
  applyCartBundles,
  calculatePrice,
  getAvailableBundles,
  getBundlePrice,
} from "../services/bundleUtils";

export default function CartPanel({
  cart,
  setCart,
  products,
  setProducts,
  transactions,
  setTransactions,
  setSyncStatus,
  showToast,
}) {
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [uberzolAmount, setUberzolAmount] = useState("");
  const [isUberzolEdited, setIsUberzolEdited] = useState(false);

  const bundleSummary = useMemo(
    () => applyCartBundles(cart, products),
    [cart, products],
  );

  const subtotal = bundleSummary.total;

  // ✅ Update quantity - remove item when 0
  const updateQuantity = (productId, delta) => {
    setCart((currentCart) => {
      const itemIndex = currentCart.findIndex(
        (item) => item.productId === productId,
      );

      if (itemIndex === -1) return currentCart;

      const item = currentCart[itemIndex];
      const newQuantity = Math.max(0, item.quantity + delta);

      if (newQuantity === 0) {
        return currentCart.filter((_, index) => index !== itemIndex);
      }

      const updatedCart = [...currentCart];
      updatedCart[itemIndex] = { ...item, quantity: newQuantity };
      return updatedCart;
    });
  };

  // ✅ Remove item completely
  const removeItem = (productId) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.productId !== productId),
    );
    showToast("Removed", "Item removed from cart.", "info");
  };

  // ✅ Calculate total based on payment method
  const calculateTotal = () => {
    // If Uberzol and user has edited the amount
    if (paymentMethod === "Uberzol" && isUberzolEdited) {
      const amount = parseFloat(uberzolAmount);
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }
    return subtotal;
  };

  // ✅ Handle payment method change
  const handlePaymentChange = (method) => {
    setPaymentMethod(method);

    // Reset Uberzol editing when switching away
    if (method !== "Uberzol") {
      setIsUberzolEdited(false);
      setUberzolAmount("");
    } else {
      // When switching to Uberzol, set initial amount to subtotal
      setUberzolAmount(subtotal.toFixed(2));
      setIsUberzolEdited(false);
    }
  };

  // ✅ Handle Uberzol amount change
  const handleUberzolChange = (value) => {
    setUberzolAmount(value);
    setIsUberzolEdited(true);

    // Update the display total
    const numValue = parseFloat(value);
    const subtotalEl = document.getElementById("cartSubtotal");
    if (subtotalEl && !isNaN(numValue) && numValue >= 0) {
      subtotalEl.textContent = `R${numValue.toFixed(2)}`;
      subtotalEl.className = "total-amount uberzol";
    }
  };

  // ✅ Reset Uberzol amount
  const resetUberzol = () => {
    setUberzolAmount(subtotal.toFixed(2));
    setIsUberzolEdited(false);

    const subtotalEl = document.getElementById("cartSubtotal");
    if (subtotalEl) {
      subtotalEl.textContent = `R${subtotal.toFixed(2)}`;
      subtotalEl.className = "total-amount";
    }

    showToast("Uberzol Reset", "Subtotal reset to cart total.", "info");
  };

  const updateCartItem = (productId, updates) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.productId === productId ? { ...item, ...updates } : item,
      ),
    );
  };

  const checkout = async () => {
    if (cart.length === 0) {
      showToast("Cart Empty", "Add at least one item to the cart.", "warning");
      return;
    }

    // ✅ Validate Uberzol amount
    if (paymentMethod === "Uberzol") {
      const amount = parseFloat(uberzolAmount);
      if (isNaN(amount) || amount <= 0) {
        showToast(
          "Error",
          "Please enter a valid Uberzol amount greater than 0.",
          "error",
        );
        return;
      }
    }

    const bundleItems = bundleSummary.items;
    const items = bundleItems.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        productId: product?.id || "",
        productName: product?.name || "Unknown",
        quantity: item.quantity,
        unitPrice: product?.price || 0,
        lineTotal: item.lineTotal ?? (product?.price || 0) * item.quantity,
        isBundle: item.isBundle || false,
        bundleDiscount: item.bundleDiscount || 0,
        customPrice: item.customPrice || false,
      };
    });

    // ✅ Calculate totals with Uberzol adjustment
    let total = calculateTotal();
    let subtotalAmount = subtotal;

    // If Uberzol, adjust line items proportionally
    let finalItems = items;
    if (paymentMethod === "Uberzol" && isUberzolEdited) {
      const uberzolValue = parseFloat(uberzolAmount);
      if (!isNaN(uberzolValue) && uberzolValue > 0) {
        const proportionFactor = uberzolValue / subtotal;
        finalItems = items.map((item) => ({
          ...item,
          lineTotal: item.lineTotal * proportionFactor,
          customPrice: true,
        }));
        total = uberzolValue;
        subtotalAmount = subtotal;
      }
    }

    // Generate unique ID
    const transactionId = crypto.randomUUID
      ? crypto.randomUUID()
      : `tx-${Date.now()}`;

    // ✅ Build note with Uberzol info
    let note = "";
    if (paymentMethod === "Uberzol") {
      const amount = parseFloat(uberzolAmount);
      if (!isNaN(amount)) {
        note = `Uberzol total: R${amount.toFixed(2)}`;
        if (isUberzolEdited && amount !== subtotal) {
          note += ` (adjusted from R${subtotal.toFixed(2)})`;
        }
      }
    }

    const transaction = {
      id: transactionId,
      payment: paymentMethod,
      total: total,
      subtotal: subtotalAmount,
      discount: bundleSummary.discount || 0,
      items: finalItems,
      date: new Date().toISOString(),
      note: note,
      itemCount: finalItems.length,
    };

    // Update products (deduct stock)
    const updatedProducts = products.map((product) => {
      const cartItem = cart.find((item) => item.productId === product.id);
      if (!cartItem) return product;
      return {
        ...product,
        stock: Math.max(0, product.stock - cartItem.quantity),
      };
    });

    try {
      await saveTransaction(transaction);
      await saveProducts(updatedProducts);

      setProducts(updatedProducts);
      setTransactions([...(transactions || []), transaction]);
      setCart([]);

      // Reset Uberzol state
      setIsUberzolEdited(false);
      setUberzolAmount("");

      setSyncStatus("Transaction recorded!");
      showToast(
        "Transaction Recorded",
        "Sale completed successfully.",
        "success",
      );
    } catch (error) {
      console.error("Checkout error:", error);
      showToast("Error", "Failed to save transaction.", "error");
    }
  };

  const displayedTotal = calculateTotal();

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          <i className="fa fa-shopping-cart me-2" />
          Cart
        </h2>
        <span className="text-sm text-slate-500">{cart.length} items</span>
      </div>
      <div className="space-y-4">
        {cart.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            Your cart is empty
          </div>
        ) : (
          bundleSummary.items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            const availableBundles = getAvailableBundles(
              product,
              cart,
              products,
            );
            const bundlePrice = calculatePrice(product, item.quantity);
            const displayedPrice = item.lineTotal ?? bundlePrice;
            const editablePrice = item.customPrice ?? displayedPrice;

            return (
              <div
                key={item.productId}
                className="rounded-3xl border border-slate-200 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">
                      {product?.name || "Unknown"}
                    </h3>
                    <p className="text-sm text-slate-500">
                      R{product?.price} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-full bg-slate-100 px-3 py-1 hover:bg-slate-200"
                      onClick={() => updateQuantity(item.productId, -1)}
                    >
                      -
                    </button>
                    <span className="min-w-[20px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      className="rounded-full bg-slate-100 px-3 py-1 hover:bg-slate-200"
                      onClick={() => updateQuantity(item.productId, 1)}
                    >
                      +
                    </button>
                    <button
                      className="ml-1 rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700 hover:bg-rose-200"
                      onClick={() => removeItem(item.productId)}
                      aria-label="Remove item"
                    >
                      <span className="text-sm leading-none">x</span>
                    </button>
                  </div>
                </div>
                {availableBundles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <select
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      value={item.selectedBundle || "none"}
                      onChange={(event) => {
                        const selectedBundle = event.target.value;
                        const nextValue =
                          selectedBundle === "none"
                            ? undefined
                            : getBundlePrice(product, {
                                ...item,
                                selectedBundle,
                              });
                        updateCartItem(item.productId, {
                          selectedBundle:
                            selectedBundle === "none" ? null : selectedBundle,
                          customPrice: nextValue,
                        });
                      }}
                    >
                      <option value="none">Regular price</option>
                      {availableBundles.map((bundle) => (
                        <option key={bundle.id} value={bundle.id}>
                          {bundle.name}
                        </option>
                      ))}
                    </select>
                    {item.isBundle && (
                      <p className="text-xs text-emerald-600">
                        Bundle applied • R{displayedPrice.toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
                <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Line total</span>
                    <strong>R{displayedPrice.toFixed(2)}</strong>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-slate-500">Edit price</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-24 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={editablePrice}
                      onChange={(event) => {
                        const rawValue = event.target.value;
                        if (rawValue === "") {
                          updateCartItem(item.productId, {
                            customPrice: undefined,
                          });
                          return;
                        }

                        const parsedValue = Number(rawValue);
                        updateCartItem(item.productId, {
                          customPrice: Number.isNaN(parsedValue)
                            ? undefined
                            : parsedValue,
                        });
                      }}
                    />
                    <button
                      type="button"
                      className="rounded-2xl border border-slate-200 bg-white px-2 py-2 text-xs hover:bg-slate-50"
                      onClick={() =>
                        updateCartItem(item.productId, {
                          customPrice: undefined,
                        })
                      }
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-6 rounded-3xl bg-slate-50 p-4">
        <div className="mb-4 flex items-center justify-between text-sm text-slate-600">
          <span>Payment method</span>
          <select
            className="rounded-3xl border border-slate-200 bg-white px-4 py-2 text-sm"
            value={paymentMethod}
            onChange={(event) => handlePaymentChange(event.target.value)}
          >
            <option value="Cash">Cash</option>
            <option value="Yoco">Yoco</option>
            <option value="EFT">EFT</option>
            <option value="Uberzol">Uberzol</option>
          </select>
        </div>

        {/* ✅ Uberzol Subtotal Input */}
        {paymentMethod === "Uberzol" && (
          <div className="mb-4 rounded-3xl bg-white p-4 border border-blue-200">
            <label className="text-sm font-medium text-slate-600">
              <i className="fa fa-credit-card me-2" />
              Uberzol Total
              <span className="ml-2 text-xs text-slate-400">
                {isUberzolEdited ? "(custom)" : "(auto-calculated)"}
              </span>
            </label>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-600">R</span>
              <input
                type="number"
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-blue-400 focus:outline-none"
                value={uberzolAmount}
                onChange={(event) => handleUberzolChange(event.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
              <button
                type="button"
                className="rounded-3xl bg-slate-200 px-4 py-3 text-sm text-slate-700 hover:bg-slate-300"
                onClick={resetUberzol}
                title="Reset to cart total"
              >
                <i className="fa fa-rotate-left" />
              </button>
            </div>
            {isUberzolEdited && (
              <div className="mt-2 text-xs text-amber-600">
                <i className="fa fa-triangle-exclamation me-1" />
                Custom amount set. Original total: R{subtotal.toFixed(2)}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <strong
            id="cartSubtotal"
            className={getPaymentTotalTextClass(paymentMethod)}
          >
            R{displayedTotal.toFixed(2)}
          </strong>
        </div>
        {bundleSummary.discount > 0 && (
          <div className="mt-2 flex items-center justify-between text-sm text-emerald-600">
            <span>Bundle discount</span>
            <strong>-R{bundleSummary.discount.toFixed(2)}</strong>
          </div>
        )}
      </div>
      <button
        type="button"
        className="mt-4 w-full rounded-3xl bg-slate-900 px-5 py-3 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={checkout}
        disabled={cart.length === 0}
      >
        Checkout{" "}
        {paymentMethod === "Uberzol" && (
          <i className="fa fa-credit-card ms-1" />
        )}
      </button>
    </div>
  );
}
