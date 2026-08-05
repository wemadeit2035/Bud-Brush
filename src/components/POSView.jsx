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
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <ProductGrid products={products} cart={cart} setCart={setCart} />
        <CartPanel
          cart={cart}
          setCart={setCart}
          products={products}
          setProducts={setProducts}
          transactions={transactions}
          setTransactions={setTransactions}
          setSyncStatus={setSyncStatus}
          showToast={showToast}
        />
      </div>
    </div>
  );
}
