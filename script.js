// ============================================
// BUD & BRUSH - Main Application with Dexie.js
// ============================================

// ----- CONFIGURATION -----
const ADMIN_PASSWORD = "B&B420";
const SESSION_KEY_AUTH = "bb_auth";

// ----- STATE -----
let products = [];
let sales = [];
let cart = [];
let activeView = "pos";
let isAuthenticated = false;
let db = null;
let isDataLoaded = false;

// ----- DEFAULT PRODUCTS -----
const defaultProducts = [
  {
    id: "1",
    category: "Outdoor",
    type: "Pre-roll",
    name: "Swazi Gold",
    price: 35,
    stock: 50,
    bundles: [
      { qty: 5, price: 150 },
      { qty: 3, price: 90 },
    ],
    specials: [],
  },
  {
    id: "2",
    category: "Outdoor",
    type: "Pre-roll",
    name: "Skunk",
    price: 40,
    stock: 50,
    bundles: [{ qty: 3, price: 100 }],
    specials: [],
  },
  {
    id: "3",
    category: "Greenhouse",
    type: "Pre-roll",
    name: "Fruit Mix",
    price: 60,
    stock: 50,
    bundles: [],
    specials: [],
  },
  {
    id: "4",
    category: "Greenhouse",
    type: "Pre-roll",
    name: "Sour Diesel",
    price: 70,
    stock: 50,
    bundles: [{ qty: 3, price: 150 }],
    specials: [],
  },
  {
    id: "5",
    category: "Greenhouse",
    type: "Pre-roll",
    name: "Sour Candy",
    price: 70,
    stock: 50,
    bundles: [{ qty: 3, price: 150 }],
    specials: [],
  },
  {
    id: "6",
    category: "Indoor",
    type: "Pre-roll",
    name: "Runtz",
    price: 90,
    stock: 50,
    bundles: [],
    specials: [],
  },
  {
    id: "7",
    category: "Indoor",
    type: "Pre-roll",
    name: "Bluey",
    price: 100,
    stock: 50,
    bundles: [],
    specials: [],
  },
  {
    id: "8",
    category: "Indoor",
    type: "Pre-roll",
    name: "Orange Fuel",
    price: 120,
    stock: 50,
    bundles: [],
    specials: [],
  },
  {
    id: "9",
    category: "Indoor",
    type: "Pre-roll",
    name: "Cookie Dough",
    price: 130,
    stock: 50,
    bundles: [],
    specials: [],
  },
  {
    id: "10",
    category: "Greenhouse",
    type: "Flower",
    name: "Blue Cheese",
    price: 50,
    stock: 50,
    bundles: [],
    specials: [{ qty: 5, price: 200 }],
  },
  {
    id: "11",
    category: "Greenhouse",
    type: "Flower",
    name: "Blue Fire",
    price: 70,
    stock: 50,
    bundles: [],
    specials: [{ qty: 5, price: 250 }],
  },
  {
    id: "12",
    category: "Greenhouse",
    type: "Flower",
    name: "Velvet",
    price: 80,
    stock: 50,
    bundles: [],
    specials: [{ qty: 5, price: 300 }],
  },
  {
    id: "13",
    category: "Indoor Exotic",
    type: "Flower",
    name: "Sub-Zero",
    price: 150,
    stock: 50,
    bundles: [],
    specials: [],
  },
  {
    id: "14",
    category: "Indoor Exotic",
    type: "Flower",
    name: "Thunderstruck",
    price: 130,
    stock: 50,
    bundles: [],
    specials: [],
  },
  {
    id: "15",
    category: "Indoor Hydro",
    type: "Flower",
    name: "Pineapple Express",
    price: 160,
    stock: 50,
    bundles: [],
    specials: [{ qty: 5, price: 650 }],
  },
  {
    id: "16",
    category: "Indoor Hydro",
    type: "Flower",
    name: "Bruce Banner",
    price: 160,
    stock: 50,
    bundles: [],
    specials: [{ qty: 5, price: 650 }],
  },
  {
    id: "17",
    category: "Indoor Hydro",
    type: "Flower",
    name: "Blue Zushi",
    price: 160,
    stock: 50,
    bundles: [],
    specials: [{ qty: 5, price: 650 }],
  },
];

// ----- DEXIE DATABASE -----
class BudAndBrushDB {
  constructor() {
    try {
      if (typeof Dexie === "undefined") {
        throw new Error("Dexie library not loaded");
      }

      this.db = new Dexie("BudAndBrushDB");
      this.db.version(1).stores({
        products: "id, name, category, type, stock, price",
        sales:
          "id, productId, productName, quantity, price, payment, total, date",
      });

      // Add indexes for faster queries
      this.db.products.hook("creating", function (primKey, obj) {
        // Ensure all fields are properly typed
        obj.price = Number(obj.price) || 0;
        obj.stock = Number(obj.stock) || 0;
        return obj;
      });

      this.db.sales.hook("creating", function (primKey, obj) {
        obj.quantity = Number(obj.quantity) || 0;
        obj.price = Number(obj.price) || 0;
        obj.total = Number(obj.total) || 0;
        return obj;
      });

      this.initialized = false;
    } catch (error) {
      console.error("Database constructor error:", error);
      throw error;
    }
  }

  async init() {
    try {
      await this.db.open();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error("Database open error:", error);
      return false;
    }
  }

  // PRODUCTS
  async getAllProducts() {
    try {
      return await this.db.products.toArray();
    } catch (error) {
      console.error("Error getting products:", error);
      return [];
    }
  }

  async getProduct(id) {
    try {
      return await this.db.products.get(id);
    } catch (error) {
      console.error("Error getting product:", error);
      return null;
    }
  }

  async saveProduct(product) {
    try {
      // Ensure numeric fields are numbers
      product.price = Number(product.price) || 0;
      product.stock = Number(product.stock) || 0;
      return await this.db.products.put(product);
    } catch (error) {
      console.error("Error saving product:", error);
      throw error;
    }
  }

  async saveProducts(products) {
    try {
      // Ensure all products have numeric fields
      products = products.map((p) => ({
        ...p,
        price: Number(p.price) || 0,
        stock: Number(p.stock) || 0,
      }));
      return await this.db.products.bulkPut(products);
    } catch (error) {
      console.error("Error saving products:", error);
      throw error;
    }
  }

  async deleteProduct(id) {
    try {
      return await this.db.products.delete(id);
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  }

  async searchProducts(query) {
    if (!query) return await this.getAllProducts();

    try {
      const lowerQuery = query.toLowerCase();
      return await this.db.products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(lowerQuery) ||
            p.category.toLowerCase().includes(lowerQuery) ||
            p.type.toLowerCase().includes(lowerQuery),
        )
        .toArray();
    } catch (error) {
      console.error("Error searching products:", error);
      return [];
    }
  }

  async getLowStockProducts(threshold = 10) {
    try {
      return await this.db.products.where("stock").below(threshold).toArray();
    } catch (error) {
      console.error("Error getting low stock products:", error);
      return [];
    }
  }

  async getProductsByCategory(category) {
    try {
      return await this.db.products
        .where("category")
        .equals(category)
        .toArray();
    } catch (error) {
      console.error("Error getting products by category:", error);
      return [];
    }
  }

  // SALES
  async getAllSales() {
    try {
      return await this.db.sales.toArray();
    } catch (error) {
      console.error("Error getting sales:", error);
      return [];
    }
  }

  async getSale(id) {
    try {
      return await this.db.sales.get(id);
    } catch (error) {
      console.error("Error getting sale:", error);
      return null;
    }
  }

  async saveSale(sale) {
    try {
      // Ensure numeric fields are numbers
      sale.quantity = Number(sale.quantity) || 0;
      sale.price = Number(sale.price) || 0;
      sale.total = Number(sale.total) || 0;
      return await this.db.sales.put(sale);
    } catch (error) {
      console.error("Error saving sale:", error);
      throw error;
    }
  }

  async saveSales(sales) {
    try {
      // Ensure all sales have numeric fields
      sales = sales.map((s) => ({
        ...s,
        quantity: Number(s.quantity) || 0,
        price: Number(s.price) || 0,
        total: Number(s.total) || 0,
      }));
      return await this.db.sales.bulkPut(sales);
    } catch (error) {
      console.error("Error saving sales:", error);
      throw error;
    }
  }

  async deleteSale(id) {
    try {
      return await this.db.sales.delete(id);
    } catch (error) {
      console.error("Error deleting sale:", error);
      throw error;
    }
  }

  async getSalesByDate(startDate, endDate) {
    try {
      const allSales = await this.getAllSales();
      return allSales.filter((s) => {
        const d = new Date(s.date);
        return d >= startDate && d <= endDate;
      });
    } catch (error) {
      console.error("Error getting sales by date:", error);
      return [];
    }
  }

  async getSalesByPayment(payment) {
    try {
      return await this.db.sales.where("payment").equals(payment).toArray();
    } catch (error) {
      console.error("Error getting sales by payment:", error);
      return [];
    }
  }

  async getDailyRevenue(date) {
    try {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const allSales = await this.getAllSales();
      const filtered = allSales.filter((s) => {
        const d = new Date(s.date);
        return d >= start && d <= end;
      });

      return filtered.reduce((sum, s) => sum + (s.total || 0), 0);
    } catch (error) {
      console.error("Error getting daily revenue:", error);
      return 0;
    }
  }

  async getRevenueByPayment(payment) {
    try {
      const allSales = await this.getAllSales();
      const filtered = allSales.filter((s) => s.payment === payment);
      return filtered.reduce((sum, s) => sum + (s.total || 0), 0);
    } catch (error) {
      console.error("Error getting revenue by payment:", error);
      return 0;
    }
  }

  async getTopProducts(limit = 5) {
    try {
      const allSales = await this.getAllSales();
      const productMap = new Map();

      allSales.forEach((sale) => {
        if (!productMap.has(sale.productId)) {
          productMap.set(sale.productId, {
            id: sale.productId,
            name: sale.productName,
            quantity: 0,
            revenue: 0,
          });
        }
        const entry = productMap.get(sale.productId);
        entry.quantity += sale.quantity || 0;
        entry.revenue += sale.total || 0;
      });

      return Array.from(productMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, limit);
    } catch (error) {
      console.error("Error getting top products:", error);
      return [];
    }
  }

  // MAINTENANCE
  async clearAll() {
    try {
      await this.db.products.clear();
      await this.db.sales.clear();
    } catch (error) {
      console.error("Error clearing database:", error);
    }
  }

  async exportData() {
    try {
      const products = await this.getAllProducts();
      const sales = await this.getAllSales();
      return {
        products,
        sales,
        exportedAt: new Date().toISOString(),
        version: "1.0",
      };
    } catch (error) {
      console.error("Error exporting data:", error);
      return null;
    }
  }

  async importData(data) {
    try {
      if (data.products && data.products.length > 0) {
        await this.saveProducts(data.products);
      }
      if (data.sales && data.sales.length > 0) {
        await this.saveSales(data.sales);
      }
      return true;
    } catch (error) {
      console.error("Error importing data:", error);
      return false;
    }
  }

  async getStats() {
    try {
      const products = await this.getAllProducts();
      const sales = await this.getAllSales();
      const totalRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);
      const totalItems = products.length;
      const lowStock = products.filter((p) => (p.stock || 0) < 10);

      return {
        totalRevenue,
        totalItems,
        lowStock: lowStock.length,
        totalSales: sales.length,
      };
    } catch (error) {
      console.error("Error getting stats:", error);
      return {
        totalRevenue: 0,
        totalItems: 0,
        lowStock: 0,
        totalSales: 0,
      };
    }
  }
}

// ----- INITIALIZE DATABASE -----
let database = null;

async function initDatabase() {
  try {
    // Wait for Dexie to load
    if (window.dexieLoadPromise) {
      await window.dexieLoadPromise;
    }

    // Check if Dexie is available
    if (typeof Dexie === "undefined") {
      throw new Error("Dexie library not available after loading");
    }

    database = new BudAndBrushDB();
    const opened = await database.init();

    if (!opened) {
      throw new Error("Failed to open database");
    }

    // Check if products exist, if not load defaults
    const existingProducts = await database.getAllProducts();
    if (existingProducts.length === 0) {
      await database.saveProducts(defaultProducts);
    }

    return true;
  } catch (error) {
    console.error("Database initialization error:", error);
    setSyncStatus("Database error: " + error.message, "danger");
    return false;
  }
}

// ----- HELPERS -----
function normalizeProduct(p) {
  if (!p) return null;
  return {
    ...p,
    id: String(p.id),
    price: Number(p.price || 0),
    stock: Number(p.stock || 0),
    bundles: p.bundles || [],
    specials: p.specials || [],
  };
}

function normalizeSale(s) {
  if (!s) return null;
  return {
    ...s,
    id: String(s.id),
    productId: String(s.productId),
    quantity: Number(s.quantity || 0),
    price: Number(s.price || 0),
    total: Number(s.total || 0),
    date: s.date || new Date().toISOString(),
  };
}

function currency(v) {
  return Number(v || 0).toFixed(2);
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getCategoryClass(cat) {
  return `category-${slugify(cat) || "default"}`;
}

function getTypeClass(type) {
  return `type-${slugify(type) || "default"}`;
}

function getProductById(id) {
  return products.find((p) => String(p.id) === String(id));
}

function setSyncStatus(msg, tone = "info") {
  const el = document.getElementById("syncStatus");
  if (!el) return;
  el.textContent = msg;
  el.className = `sync-status ${tone}`.trim();
}

// ----- CALCULATE PRICE WITH BUNDLES -----
function calculatePrice(product, quantity) {
  if (!product || quantity <= 0) return 0;
  const unitPrice = Number(product.price) || 0;
  let best = unitPrice * quantity;
  const rules = [...(product.bundles || []), ...(product.specials || [])];
  rules.forEach((rule) => {
    if (!rule || rule.qty <= 0) return;
    const count = Math.floor(quantity / rule.qty);
    const rem = quantity % rule.qty;
    const total = count * Number(rule.price) + rem * unitPrice;
    if (total < best) best = total;
  });
  return best;
}

// ----- LOAD DATA FROM DATABASE -----
async function loadData() {
  try {
    // Load products
    const dbProducts = await database.getAllProducts();
    products = dbProducts.map(normalizeProduct).filter(Boolean);

    // Load sales
    const dbSales = await database.getAllSales();
    sales = dbSales.map(normalizeSale).filter(Boolean);

    isDataLoaded = true;
    setSyncStatus(
      `Loaded ${products.length} items and ${sales.length} contributions`,
      "success",
    );
    return true;
  } catch (error) {
    console.error("Error loading data:", error);
    setSyncStatus("Error loading data", "danger");
    return false;
  }
}

// ----- SAVE DATA -----
async function saveProducts() {
  if (!database) return false;
  try {
    await database.saveProducts(products);
    return true;
  } catch (error) {
    console.error("Error saving products:", error);
    return false;
  }
}

async function saveSales() {
  if (!database) return false;
  try {
    await database.saveSales(sales);
    return true;
  } catch (error) {
    console.error("Error saving sales:", error);
    return false;
  }
}

// ----- RENDER FUNCTIONS -----
function renderProducts() {
  const grid = document.getElementById("productGrid");
  const query = document.getElementById("productSearch").value.toLowerCase();
  const filtered = products.filter((p) =>
    `${p.name} ${p.category} ${p.type}`.toLowerCase().includes(query),
  );

  if (!filtered.length) {
    grid.innerHTML =
      '<div class="empty-state">No items match your search.</div>';
    return;
  }

  grid.innerHTML = filtered
    .map(
      (p) => `
    <button type="button" class="product-card" data-id="${p.id}">
      <div class="d-flex justify-content-between align-items-start">
        <strong>${p.name}</strong>
        <span class="product-badge ${getCategoryClass(p.category)}">${p.category}</span>
      </div>
      <p class="meta mb-2 mt-2"><span class="product-badge ${getTypeClass(p.type)}">${p.type}</span></p>
      <div class="price">${currency(p.price)}</div>
      <p class="meta small mb-2">${p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}</p>
      <p class="meta small">${p.bundles?.length ? `Bundles: ${p.bundles.map((b) => `${b.qty} for ${currency(b.price)}`).join(" · ")}` : "Regular pricing"}</p>
    </button>
  `,
    )
    .join("");

  grid.querySelectorAll("[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(btn.dataset.id, 1));
  });
}

function renderCart() {
  const list = document.getElementById("cartItems");
  const subtotalEl = document.getElementById("cartSubtotal");
  const countEl = document.getElementById("cartCount");

  if (!cart.length) {
    list.innerHTML = '<div class="empty-state">Your cart is empty.</div>';
    subtotalEl.textContent = currency(0);
    countEl.textContent = "0 items";
    return;
  }

  let subtotal = 0;
  list.innerHTML = cart
    .map((item) => {
      const product = getProductById(item.productId);
      if (!product) return "";
      const total = calculatePrice(product, item.quantity);
      subtotal += total;
      return `
      <div class="cart-item">
        <div class="d-flex justify-content-between align-items-start">
          <div><strong>${product.name}</strong><div class="meta small">${product.bundles?.length || product.specials?.length ? "Bundle pricing applied" : "Standard pricing"}</div></div>
          <button class="btn btn-link text-danger p-0" data-remove="${product.id}">Remove</button>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" data-update="${product.id}" data-delta="-1">−</button>
          <span class="fw-semibold">${item.quantity}</span>
          <button class="qty-btn" data-update="${product.id}" data-delta="1">+</button>
        </div>
        <div class="d-flex justify-content-between mt-2">
          <span class="small text-muted">${currency(product.price)} each</span>
          <strong>${currency(total)}</strong>
        </div>
      </div>
    `;
    })
    .join("");

  subtotalEl.textContent = currency(subtotal);
  countEl.textContent = `${cart.reduce((s, i) => s + i.quantity, 0)} items`;

  list.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      cart = cart.filter((i) => String(i.productId) !== btn.dataset.remove);
      renderCart();
    });
  });

  list.querySelectorAll("[data-update]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.update;
      const delta = Number(btn.dataset.delta);
      const item = cart.find((i) => String(i.productId) === id);
      if (item) {
        item.quantity += delta;
        if (item.quantity <= 0)
          cart = cart.filter((i) => String(i.productId) !== id);
        renderCart();
      }
    });
  });
}

function renderInventoryTable() {
  const tbody = document.getElementById("inventoryTable");
  tbody.innerHTML = products
    .map((p) => {
      let status = '<span class="stock-good">In stock</span>';
      if (p.stock < 5) status = '<span class="stock-low">Low stock</span>';
      else if (p.stock < 15)
        status = '<span class="stock-medium">Running low</span>';
      return `
      <tr>
        <td><strong>${p.name}</strong><div class="meta small"><span class="product-badge ${getCategoryClass(p.category)}">${p.category}</span> <span class="product-badge ${getTypeClass(p.type)}">${p.type}</span></div></td>
        <td>${currency(p.price)}</td>
        <td>${p.stock}</td>
        <td>${status}</td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-secondary btn-sm" data-edit="${p.id}">Edit</button>
            <button class="btn btn-outline-danger btn-sm" data-delete="${p.id}">Delete</button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");

  tbody.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => editProduct(btn.dataset.edit));
  });
  tbody.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => deleteProduct(btn.dataset.delete));
  });
}

function renderSalesHistory() {
  const tbody = document.getElementById("salesHistoryTable");
  const filter = document.getElementById("salesPaymentFilter").value;
  const search = document.getElementById("salesSearch").value.toLowerCase();

  const filtered = sales.filter((s) => {
    const matchPayment = filter === "all" || s.payment === filter;
    const matchSearch = `${s.productName} ${s.payment}`
      .toLowerCase()
      .includes(search);
    return matchPayment && matchSearch;
  });

  if (!filtered.length) {
    tbody.innerHTML =
      '<tr><td colspan="5"><div class="empty-state">No contributions match the filters yet.</div></td></tr>';
    return;
  }

  tbody.innerHTML = filtered
    .slice()
    .reverse()
    .map((s) => {
      const badge =
        s.payment === "Cash"
          ? "<span class='badge-cash'>Cash</span>"
          : s.payment === "Yoco"
            ? "<span class='badge-yoco'>Yoco</span>"
            : "<span class='badge-eft'>EFT</span>";
      return `
      <tr>
        <td>${new Date(s.date).toLocaleString()}</td>
        <td>${s.productName}</td>
        <td>${s.quantity}</td>
        <td>${badge}</td>
        <td>${currency(s.total)}</td>
      </tr>
    `;
    })
    .join("");
}

function renderDashboard() {
  const revenue = sales.reduce((s, sale) => s + Number(sale.total || 0), 0);
  const cash = sales
    .filter((s) => s.payment === "Cash")
    .reduce((s, sale) => s + Number(sale.total || 0), 0);
  const yoco = sales
    .filter((s) => s.payment === "Yoco")
    .reduce((s, sale) => s + Number(sale.total || 0), 0);
  const eft = sales
    .filter((s) => s.payment === "EFT")
    .reduce((s, sale) => s + Number(sale.total || 0), 0);

  document.getElementById("dashboardRevenue").textContent = currency(revenue);
  document.getElementById("dashboardCash").textContent = currency(cash);
  document.getElementById("dashboardYoco").textContent = currency(yoco);
  document.getElementById("dashboardEftSales").textContent = currency(eft);

  // Payment breakdown
  const breakdown = [
    { label: "Cash", value: cash, total: revenue },
    { label: "Yoco", value: yoco, total: revenue },
    { label: "EFT", value: eft, total: revenue },
  ];
  document.getElementById("paymentBreakdown").innerHTML = breakdown
    .map((entry) => {
      const pct = revenue ? ((entry.value / revenue) * 100).toFixed(1) : 0;
      return `
      <div class="payment-bar">
        <div class="d-flex justify-content-between"><strong>${entry.label}</strong><span>${currency(entry.value)} · ${pct}%</span></div>
        <div class="bar"><span style="width:${pct}%"></span></div>
      </div>
    `;
    })
    .join("");

  // Top products
  const salesByProduct = products
    .map((p) => ({
      name: p.name,
      units: sales
        .filter((s) => String(s.productId) === String(p.id))
        .reduce((sum, s) => sum + s.quantity, 0),
    }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  document.getElementById("topProductsList").innerHTML = salesByProduct.some(
    (i) => i.units > 0,
  )
    ? salesByProduct
        .map(
          (i) =>
            `<div class="d-flex justify-content-between py-2 border-bottom"><span>${i.name}</span><strong>${i.units} contributed</strong></div>`,
        )
        .join("")
    : '<div class="empty-state">No contributions recorded yet.</div>';

  // Stock alerts
  const low = products
    .filter((p) => p.stock < 10)
    .sort((a, b) => a.stock - b.stock);
  document.getElementById("stockAlertsList").innerHTML = low.length
    ? low
        .map(
          (p) =>
            `<div class="d-flex justify-content-between py-2 border-bottom"><span>${p.name}</span><strong>${p.stock} left</strong></div>`,
        )
        .join("")
    : '<div class="empty-state">All items are comfortably stocked.</div>';

  renderDailyRevenueChart();
}

function renderDailyRevenueChart() {
  const container = document.getElementById("dailyRevenueChart");
  const days = 7;
  const labels = [];
  const totals = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const total = sales
      .filter((s) => new Date(s.date).toISOString().slice(0, 10) === key)
      .reduce((sum, s) => sum + Number(s.total || 0), 0);
    labels.push(
      d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    );
    totals.push(total);
  }

  const max = Math.max(...totals, 1);
  container.innerHTML = `
    <div class="daily-chart-bars">
      ${totals
        .map((v, idx) => {
          const height = Math.max(8, (v / max) * 100);
          return `
          <div class="daily-chart-bar-group">
            <div class="daily-chart-bar" style="height:${height}%">
              <span class="daily-chart-value">${currency(v)}</span>
            </div>
            <div class="daily-chart-label">${labels[idx]}</div>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

function renderAll() {
  renderProducts();
  renderCart();
  renderInventoryTable();
  renderSalesHistory();
  renderDashboard();
}

// ----- CART ACTIONS -----
function addToCart(productId, qty = 1) {
  const product = getProductById(productId);
  if (!product) return;
  if (product.stock < qty) {
    alert(`Only ${product.stock} unit(s) of ${product.name} remain.`);
    return;
  }
  const existing = cart.find((i) => String(i.productId) === String(productId));
  if (existing) existing.quantity += qty;
  else cart.push({ productId: String(productId), quantity: qty });
  renderCart();
}

async function checkout() {
  if (!cart.length) {
    alert("Add at least one item to the cart first.");
    return;
  }

  const payment = document.getElementById("paymentMethod").value;
  const newSales = [];

  for (const item of cart) {
    const product = getProductById(item.productId);
    if (!product) continue;
    if (product.stock < item.quantity) {
      alert(`Only ${product.stock} unit(s) of ${product.name} remain.`);
      return;
    }
    product.stock -= item.quantity;
    newSales.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      productId: String(product.id),
      productName: product.name,
      quantity: item.quantity,
      price: product.price,
      payment,
      total: calculatePrice(product, item.quantity),
      date: new Date().toISOString(),
    });
  }

  sales.push(...newSales);
  await saveProducts();
  await saveSales();
  cart = [];
  renderAll();
  setSyncStatus("Contribution recorded!", "success");
}

// ----- INVENTORY ACTIONS -----
async function deleteProduct(id) {
  const p = getProductById(id);
  if (!p) return;
  if (!confirm(`Delete ${p.name} from stock?`)) return;
  products = products.filter((item) => String(item.id) !== String(id));
  await saveProducts();
  renderAll();
}

function resetProductForm() {
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
  document.getElementById("productName").focus();
}

function editProduct(id) {
  const p = getProductById(id);
  if (!p) return;
  document.getElementById("productId").value = p.id;
  document.getElementById("productName").value = p.name;
  document.getElementById("productCategory").value = p.category;
  document.getElementById("productType").value = p.type;
  document.getElementById("productPrice").value = p.price;
  document.getElementById("productStock").value = p.stock;
  switchView("inventory");
}

async function saveProduct(event) {
  event.preventDefault();
  const id = document.getElementById("productId").value;
  const name = document.getElementById("productName").value.trim();
  const category = document.getElementById("productCategory").value.trim();
  const type = document.getElementById("productType").value.trim();
  const price = Number(document.getElementById("productPrice").value);
  const stock = Number(document.getElementById("productStock").value);

  if (!name || !category || !type || isNaN(price) || isNaN(stock)) {
    alert("Please complete all item fields.");
    return;
  }

  if (id) {
    const existing = getProductById(id);
    if (existing) {
      existing.name = name;
      existing.category = category;
      existing.type = type;
      existing.price = price;
      existing.stock = stock;
    }
  } else {
    const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    products.push({
      id: newId,
      category,
      type,
      name,
      price,
      stock,
      bundles: [],
      specials: [],
    });
  }

  await saveProducts();
  renderAll();
  resetProductForm();
  setSyncStatus("Item saved!", "success");
}

function exportSalesCsv() {
  const filter = document.getElementById("salesPaymentFilter").value;
  const search = document.getElementById("salesSearch").value.toLowerCase();
  const filtered = sales.filter((s) => {
    const matchPayment = filter === "all" || s.payment === filter;
    const matchSearch = `${s.productName} ${s.payment}`
      .toLowerCase()
      .includes(search);
    return matchPayment && matchSearch;
  });

  const rows = [
    ["Date", "Product", "Qty", "Payment", "Total"],
    ...filtered.map((s) => [
      new Date(s.date).toLocaleString(),
      s.productName,
      s.quantity,
      s.payment,
      s.total,
    ]),
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "contributions-export.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

// ----- VIEW SWITCHING -----
function switchView(view) {
  activeView = view;
  document.querySelectorAll(".view-pane").forEach((pane) => {
    pane.classList.toggle("active", pane.id === `${view}-view`);
  });
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
}

// ----- LOGIN -----
function checkAuth() {
  const authToken = sessionStorage.getItem(SESSION_KEY_AUTH);
  if (authToken === "authenticated") {
    isAuthenticated = true;
    return true;
  }
  return false;
}

function handleLogin() {
  const input = document.getElementById("loginPassword");
  const error = document.getElementById("loginError");
  if (input.value === ADMIN_PASSWORD) {
    isAuthenticated = true;
    sessionStorage.setItem(SESSION_KEY_AUTH, "authenticated");

    document.getElementById("loginOverlay").style.display = "none";
    document.getElementById("appShell").style.display = "block";

    initializeApp();
  } else {
    error.classList.remove("d-none");
    input.value = "";
    input.focus();
    setTimeout(() => error.classList.add("d-none"), 3000);
  }
}

async function initializeApp() {
  setSyncStatus("Initializing database...", "info");

  // Initialize database
  const dbInitialized = await initDatabase();
  if (!dbInitialized) {
    setSyncStatus(
      "Failed to initialize database. Check console for errors.",
      "danger",
    );
    return;
  }

  // Load data
  await loadData();

  renderAll();
  setSyncStatus("Ready - offline mode", "success");
}

// ----- INIT -----
async function init() {
  // Wait for Dexie to load first
  if (window.dexieLoadPromise) {
    try {
      await window.dexieLoadPromise;
    } catch (error) {
      console.error("Failed to load Dexie:", error);
    }
  }

  // Check for existing authentication
  if (checkAuth()) {
    document.getElementById("loginOverlay").style.display = "none";
    document.getElementById("appShell").style.display = "block";
    initializeApp();
  } else {
    document.getElementById("loginOverlay").style.display = "flex";
    document.getElementById("appShell").style.display = "none";
    document.getElementById("loginPassword").focus();
  }

  // Login
  document.getElementById("loginBtn").addEventListener("click", handleLogin);
  document.getElementById("loginPassword").addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleLogin();
  });

  // Tabs
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  // POS
  document
    .getElementById("productSearch")
    .addEventListener("input", renderProducts);
  document.getElementById("checkoutBtn").addEventListener("click", checkout);
  document.getElementById("paymentMethod").value = "Cash";

  // Inventory
  document
    .getElementById("productForm")
    .addEventListener("submit", saveProduct);
  document
    .getElementById("newProductBtn")
    .addEventListener("click", resetProductForm);
  document
    .getElementById("resetProductForm")
    .addEventListener("click", resetProductForm);

  // Sales
  document
    .getElementById("salesSearch")
    .addEventListener("input", renderSalesHistory);
  document
    .getElementById("salesPaymentFilter")
    .addEventListener("change", renderSalesHistory);
  document
    .getElementById("exportSalesBtn")
    .addEventListener("click", exportSalesCsv);
}

// Start the app when DOM is ready
document.addEventListener("DOMContentLoaded", init);
