import ProductGrid from "./ProductGrid";
import CartPanel from "./CartPanel";

export default function POSView({
  products,
  cart,
  setCart,
  setProducts,
  transactions,
  setTransactions,
  setSyncStatus,
  showToast,
  members,
  selectedMemberId,
  setSelectedMemberId,
  allowGuestCheckout,
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <ProductGrid products={products} cart={cart} setCart={setCart} />
        <div className="lg:sticky lg:top-4 lg:self-start">
          <CartPanel
            cart={cart}
            setCart={setCart}
            products={products}
            setProducts={setProducts}
            transactions={transactions}
            setTransactions={setTransactions}
            setSyncStatus={setSyncStatus}
            showToast={showToast}
            members={members}
            selectedMemberId={selectedMemberId}
            setSelectedMemberId={setSelectedMemberId}
            allowGuestCheckout={allowGuestCheckout}
          />
        </div>
      </div>
    </div>
  );
}
