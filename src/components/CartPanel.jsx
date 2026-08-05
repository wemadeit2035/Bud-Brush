import { useMemo, useState } from "react";
import { saveProducts, saveTransaction } from "../services/database";
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
  const [uberzolAmount, setUberzolAmount] = useState(0);

  const bundleSummary = useMemo(
    () => applyCartBundles(cart, products),
    [cart, products],
  );

  const subtotal = bundleSummary.total;

  // ✅ FIXED: Remove item when quantity becomes 0
  const updateQuantity = (productId, delta) => {
    setCart((currentCart) => {
      // Find the item
      const itemIndex = currentCart.findIndex(
        (item) => item.productId === productId,
      );

      if (itemIndex === -1) return currentCart;

      const item = currentCart[itemIndex];
      const newQuantity = Math.max(0, item.quantity + delta);

      // ✅ If quantity becomes 0, remove the item
      if (newQuantity === 0) {
        return currentCart.filter((_, index) => index !== itemIndex);
      }

      // Otherwise update the quantity
      const updatedCart = [...currentCart];
      updatedCart[itemIndex] = { ...item, quantity: newQuantity };
      return updatedCart;
    });
  };

  // ✅ Add function to remove item completely
  const removeItem = (productId) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.productId !== productId),
    );
    showToast("Removed", "Item removed from cart.", "info");
  };

  const calculateTotal = () => {
    if (paymentMethod === "Uberzol" && uberzolAmount > 0) {
      return uberzolAmount;
    }
    return subtotal;
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

    // Generate unique ID
    const transactionId = crypto.randomUUID
      ? crypto.randomUUID()
      : `tx-${Date.now()}`;

    const transaction = {
      id: transactionId,
      payment: paymentMethod,
      total: calculateTotal(),
      subtotal: subtotal,
      discount: bundleSummary.discount || 0,
      items: items,
      date: new Date().toISOString(),
      note: paymentMethod === "Uberzol" ? `Uberzol total ${uberzolAmount}` : "",
      itemCount: items.length,
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
      // Save to database
      await saveTransaction(transaction);
      await saveProducts(updatedProducts);

      // Update state
      setProducts(updatedProducts);
      setTransactions([...(transactions || []), transaction]);
      setCart([]); // Clear cart
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

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">🛒 Cart</h2>
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
                    {/* ✅ Minus button - will remove item if quantity becomes 0 */}
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
                    {/* ✅ Add remove button (X) */}
                    <button
                      className="ml-1 rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700 hover:bg-rose-200"
                      onClick={() => removeItem(item.productId)}
                    >
                      ✕
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
            onChange={(event) => setPaymentMethod(event.target.value)}
          >
            <option value="Cash">Cash</option>
            <option value="Yoco">Yoco</option>
            <option value="EFT">EFT</option>
            <option value="Uberzol">Uberzol</option>
          </select>
        </div>
        {paymentMethod === "Uberzol" && (
          <div className="mb-4 rounded-3xl bg-white p-4">
            <label className="text-sm text-slate-600">Uberzol Total</label>
            <input
              type="number"
              className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={uberzolAmount}
              onChange={(event) => setUberzolAmount(Number(event.target.value))}
              min="0"
              step="0.01"
            />
          </div>
        )}
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <strong>R{calculateTotal().toFixed(2)}</strong>
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
        Checkout
      </button>
    </div>
  );
}
