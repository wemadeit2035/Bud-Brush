import { useMemo, useState } from "react";

export default function ProductGrid({ products, cart, setCart }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const filterMatch =
        filter === "all" || product.type?.toLowerCase() === filter;
      const searchMatch = `${product.name} ${product.category} ${product.type}`
        .toLowerCase()
        .includes(query);
      return filterMatch && searchMatch;
    });
  }, [filter, products, search]);

  const addToCart = (productId, qty = 1) => {
    const existing = cart.find((item) => item.productId === productId);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + qty }
            : item,
        ),
      );
    } else {
      setCart([...cart, { productId, quantity: qty }]);
    }
  };

  const handleCardClick = (event, product) => {
    if (product.stock <= 0) return;
    if (event.target.closest("button")) return;
    addToCart(product.id, 1);
  };

  const handleCardKeyDown = (event, product) => {
    if (product.stock <= 0) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      addToCart(product.id, 1);
    }
  };

  const getCategoryBadgeClass = (category) => {
    const normalized = String(category || "").toLowerCase();

    if (normalized.includes("greenhouse")) {
      return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    }
    if (normalized.includes("indoor")) {
      return "bg-amber-100 text-amber-800 border border-amber-200";
    }

    return "bg-slate-100 text-slate-700 border border-slate-200";
  };

  const getTypeBadgeClass = (type) => {
    const normalized = String(type || "").toLowerCase();

    if (normalized.includes("pre-roll")) {
      return "bg-sky-100 text-sky-800 border border-sky-200";
    }
    if (normalized.includes("flower")) {
      return "bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200";
    }

    return "bg-slate-100 text-slate-700 border border-slate-200";
  };

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200 sm:p-5">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search products..."
          className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-sky-400"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {[
            { value: "all", label: "All", icon: "fa-th-large" },
            { value: "pre-roll", label: "Pre-roll", icon: "fa-seedling" },
            { value: "flower", label: "Flower", icon: "fa-cannabis" },
            { value: "indoor", label: "Indoor", icon: "fa-fire" },
            { value: "greenhouse", label: "Greenhouse", icon: "fa-home" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={`rounded-full px-4 py-2 text-sm ${
                filter === option.value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              onClick={() => setFilter(option.value)}
            >
              <i className={`fa ${option.icon} me-2`} />
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
            No products match your search.
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              role="button"
              tabIndex={product.stock > 0 ? 0 : -1}
              aria-disabled={product.stock <= 0}
              className={`rounded-3xl border p-3 sm:p-4 transition ${
                product.stock > 0
                  ? "cursor-pointer border-slate-200 hover:border-sky-300"
                  : "cursor-not-allowed border-slate-200"
              }`}
              onClick={(event) => handleCardClick(event, product)}
              onKeyDown={(event) => handleCardKeyDown(event, product)}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold leading-tight sm:text-base">
                    {product.name}
                  </h3>
                  <div className="mt-1 flex flex-nowrap items-center gap-0.5 overflow-hidden text-[10px] text-slate-500 sm:text-[11px]">
                    <span
                      className={`truncate rounded-full px-1.5 py-0.5 leading-none ${getCategoryBadgeClass(product.category)}`}
                    >
                      {product.category}
                    </span>
                    <span
                      className={`truncate rounded-full px-1.5 py-0.5 leading-none ${getTypeBadgeClass(product.type)}`}
                    >
                      {product.type}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-semibold sm:text-base">
                  R{product.price}
                </span>
              </div>
              <div className="mb-3 text-xs text-slate-500 sm:text-sm">
                {product.stock} in stock
              </div>
              <div className="flex flex-nowrap items-center gap-1 overflow-hidden">
                <button
                  className="min-w-0 flex-1 rounded-full bg-slate-100 px-2 py-1.5 text-xs sm:px-3 sm:text-sm"
                  onClick={() => addToCart(product.id, 1)}
                  disabled={product.stock <= 0}
                >
                  +1
                </button>
                <button
                  className="min-w-0 flex-1 rounded-full bg-slate-100 px-2 py-1.5 text-xs sm:px-3 sm:text-sm"
                  onClick={() => addToCart(product.id, 3)}
                  disabled={product.stock <= 0}
                >
                  +3
                </button>
                <button
                  className="min-w-0 flex-1 rounded-full bg-slate-100 px-2 py-1.5 text-xs sm:px-3 sm:text-sm"
                  onClick={() => addToCart(product.id, 5)}
                  disabled={product.stock <= 0}
                >
                  +5
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
