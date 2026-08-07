import { useMemo, useState } from "react";
import { saveProducts } from "../services/database";

const createEmptyBundle = () => ({
  id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
  name: "",
  qty: "",
  price: "",
});

export default function InventoryView({ products, setProducts, showToast }) {
  const [search, setSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [formState, setFormState] = useState({
    name: "",
    category: "",
    type: "",
    price: "",
    stock: "",
    bundles: [],
  });

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) =>
      `${product.name} ${product.category} ${product.type}`
        .toLowerCase()
        .includes(query),
    );
  }, [products, search]);

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

  const resetForm = () => {
    setEditingProduct(null);
    setFormState({
      name: "",
      category: "",
      type: "",
      price: "",
      stock: "",
      bundles: [],
    });
  };

  const handleEdit = (product) => {
    setEditingProduct(product.id);
    setFormState({
      name: product.name,
      category: product.category,
      type: product.type,
      price: product.price,
      stock: product.stock,
      bundles: Array.isArray(product.bundles)
        ? product.bundles.map((bundle) => ({
            id:
              bundle.id ||
              `${bundle.qty || "qty"}-${bundle.price || "price"}-${Math.random().toString(36).slice(2, 6)}`,
            name: bundle.name || "",
            qty: String(bundle.qty ?? ""),
            price: String(bundle.price ?? ""),
          }))
        : [],
    });
  };

  const updateBundleField = (bundleId, field, value) => {
    setFormState((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) =>
        bundle.id === bundleId ? { ...bundle, [field]: value } : bundle,
      ),
    }));
  };

  const addBundleField = () => {
    setFormState((current) => ({
      ...current,
      bundles: [...current.bundles, createEmptyBundle()],
    }));
  };

  const removeBundleField = (bundleId) => {
    setFormState((current) => ({
      ...current,
      bundles: current.bundles.filter((bundle) => bundle.id !== bundleId),
    }));
  };

  const handleDelete = async (productId) => {
    const updated = products.filter((product) => product.id !== productId);
    setProducts(updated);
    await saveProducts(updated);
    showToast("Deleted", "Product removed from inventory.", "success");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formState.name || !formState.category || !formState.type) {
      showToast("Validation", "Please complete all fields.", "warning");
      return;
    }

    const cleanedBundles = (formState.bundles || [])
      .filter((bundle) => bundle.qty !== "" || bundle.price !== "")
      .map((bundle) => ({
        id: bundle.id,
        name: (bundle.name || "").trim(),
        qty: Number(bundle.qty),
        price: Number(bundle.price),
      }));

    const hasInvalidBundle = cleanedBundles.some(
      (bundle) =>
        Number.isNaN(bundle.qty) ||
        Number.isNaN(bundle.price) ||
        bundle.qty <= 0 ||
        bundle.price < 0,
    );

    if (hasInvalidBundle) {
      showToast(
        "Validation",
        "Bundle rules must have a quantity greater than 0 and a valid price.",
        "warning",
      );
      return;
    }

    const newProduct = {
      id: editingProduct || Date.now().toString(),
      name: formState.name,
      category: formState.category,
      type: formState.type,
      price: Number(formState.price) || 0,
      stock: Number(formState.stock) || 0,
      bundles: cleanedBundles,
    };

    const updated = editingProduct
      ? products.map((product) =>
          product.id === editingProduct ? newProduct : product,
        )
      : [newProduct, ...products];

    setProducts(updated);
    await saveProducts(updated);
    showToast("Saved", "Product saved successfully.", "success");
    resetForm();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Stock Management</h2>
          <button
            type="button"
            className="rounded-3xl bg-emerald-600 px-4 py-2 text-sm text-white"
            onClick={resetForm}
          >
            Add Product
          </button>
        </div>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search inventory..."
            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-sky-400"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="overflow-x-auto rounded-3xl border border-slate-200">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-t border-slate-200">
                  <td className="px-4 py-4">
                    <div className="font-semibold">{product.name}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span
                        className={`rounded-full px-2 py-1 ${getCategoryBadgeClass(product.category)}`}
                      >
                        {product.category}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 ${getTypeBadgeClass(product.type)}`}
                      >
                        {product.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">R{product.price}</td>
                  <td className="px-4 py-4">{product.stock}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        product.stock < 5
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {product.stock < 5 ? "Low stock" : "In stock"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                        onClick={() => handleEdit(product)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
                        onClick={() => handleDelete(product.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Add / Edit Product</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Product Name
            </label>
            <input
              type="text"
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
              value={formState.name}
              onChange={(event) =>
                setFormState({ ...formState, name: event.target.value })
              }
              required
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Category
              </label>
              <input
                type="text"
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
                value={formState.category}
                onChange={(event) =>
                  setFormState({ ...formState, category: event.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Type
              </label>
              <input
                type="text"
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
                value={formState.type}
                onChange={(event) =>
                  setFormState({ ...formState, type: event.target.value })
                }
                required
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Price (R)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
                value={formState.price}
                onChange={(event) =>
                  setFormState({ ...formState, price: event.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Stock
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
                value={formState.stock}
                onChange={(event) =>
                  setFormState({ ...formState, stock: event.target.value })
                }
                required
              />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">
                Bundle Rules
              </label>
              <button
                type="button"
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                onClick={addBundleField}
              >
                Add Bundle
              </button>
            </div>
            <div className="space-y-3">
              {formState.bundles.length === 0 ? (
                <div className="text-xs text-slate-500">
                  No bundle rules yet. Add one to offer deals like 3 for R150.
                </div>
              ) : (
                formState.bundles.map((bundle, index) => (
                  <div
                    key={bundle.id}
                    className="rounded-2xl border border-slate-200 bg-white p-3"
                  >
                    <div className="mb-2 text-xs font-semibold text-slate-500">
                      Bundle {index + 1}
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      <input
                        type="text"
                        placeholder="Bundle name (optional)"
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                        value={bundle.name}
                        onChange={(event) =>
                          updateBundleField(
                            bundle.id,
                            "name",
                            event.target.value,
                          )
                        }
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                        value={bundle.qty}
                        onChange={(event) =>
                          updateBundleField(
                            bundle.id,
                            "qty",
                            event.target.value,
                          )
                        }
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Bundle price"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                          value={bundle.price}
                          onChange={(event) =>
                            updateBundleField(
                              bundle.id,
                              "price",
                              event.target.value,
                            )
                          }
                        />
                        <button
                          type="button"
                          className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
                          onClick={() => removeBundleField(bundle.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="w-full rounded-3xl bg-emerald-600 px-4 py-3 text-white"
            >
              Save Product
            </button>
            <button
              type="button"
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700"
              onClick={resetForm}
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
