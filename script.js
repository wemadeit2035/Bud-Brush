// ============================================
// BUD & BRUSH - Main Application with Supabase
// ============================================

// ----- CONFIGURATION -----
const ADMIN_PASSWORD = "B&B420";
const SESSION_KEY_AUTH = "bb_auth";

// Supabase Configuration - Replace with your credentials
const SUPABASE_URL = "https://ghfkqospijjdgixporvy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoZmtxb3NwaWpqZGdpeHBvcnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NDE5NzYsImV4cCI6MjEwMDIxNzk3Nn0.rVOZJcbxMCiu-0O_OGrj9F_2aQZ4g77P17jVMoVPN6s";

// ----- STATE -----
let products = [];
let sales = [];
let cart = [];
let activeView = "pos";
let isAuthenticated = false;
let isDataLoaded = false;
let supabaseClient = null; // CHANGED: use supabaseClient instead of supabase
let currentUser = null;

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
  },
  {
    id: "2",
    category: "Outdoor",
    type: "Pre-roll",
    name: "Skunk",
    price: 40,
    stock: 50,
    bundles: [{ qty: 3, price: 100 }],
  },
  {
    id: "3",
    category: "Greenhouse",
    type: "Pre-roll",
    name: "Fruit Mix",
    price: 60,
    stock: 50,
    bundles: [],
  },
  {
    id: "4",
    category: "Greenhouse",
    type: "Pre-roll",
    name: "Sour Diesel",
    price: 70,
    stock: 50,
    bundles: [{ qty: 3, price: 150 }],
  },
  {
    id: "5",
    category: "Greenhouse",
    type: "Pre-roll",
    name: "Sour Candy",
    price: 70,
    stock: 50,
    bundles: [{ qty: 3, price: 150 }],
  },
  {
    id: "6",
    category: "Indoor",
    type: "Pre-roll",
    name: "Runtz",
    price: 90,
    stock: 50,
    bundles: [],
  },
  {
    id: "7",
    category: "Indoor",
    type: "Pre-roll",
    name: "Bluey",
    price: 100,
    stock: 50,
    bundles: [],
  },
  {
    id: "8",
    category: "Indoor",
    type: "Pre-roll",
    name: "Orange Fuel",
    price: 120,
    stock: 50,
    bundles: [],
  },
  {
    id: "9",
    category: "Indoor",
    type: "Pre-roll",
    name: "Cookie Dough",
    price: 130,
    stock: 50,
    bundles: [],
  },
  {
    id: "10",
    category: "Greenhouse",
    type: "Flower",
    name: "Blue Cheese",
    price: 50,
    stock: 50,
    bundles: [],
  },
  {
    id: "11",
    category: "Greenhouse",
    type: "Flower",
    name: "Blue Fire",
    price: 70,
    stock: 50,
    bundles: [],
  },
  {
    id: "12",
    category: "Greenhouse",
    type: "Flower",
    name: "Velvet",
    price: 80,
    stock: 50,
    bundles: [],
  },
  {
    id: "13",
    category: "Indoor Exotic",
    type: "Flower",
    name: "Sub-Zero",
    price: 150,
    stock: 50,
    bundles: [],
  },
  {
    id: "14",
    category: "Indoor Exotic",
    type: "Flower",
    name: "Thunderstruck",
    price: 130,
    stock: 50,
    bundles: [],
  },
  {
    id: "15",
    category: "Indoor Hydro",
    type: "Flower",
    name: "Pineapple Express",
    price: 160,
    stock: 50,
    bundles: [],
  },
  {
    id: "16",
    category: "Indoor Hydro",
    type: "Flower",
    name: "Bruce Banner",
    price: 160,
    stock: 50,
    bundles: [],
  },
  {
    id: "17",
    category: "Indoor Hydro",
    type: "Flower",
    name: "Blue Zushi",
    price: 160,
    stock: 50,
    bundles: [],
  },
];

// ============================================
// SUPABASE DATABASE CLASS
// ============================================
class BudAndBrushSupabase {
  constructor() {
    this.initialized = false;
    this.client = null; // CHANGED: use client instead of supabase
  }

  async init() {
    try {
      // Load Supabase client
      if (typeof supabaseJs === "undefined") {
        throw new Error("Supabase library not loaded");
      }

      // CHANGED: Use a different variable name
      const { createClient } = supabaseJs;
      this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // Test connection
      const { data, error } = await this.client
        .from("products")
        .select("count", { count: "exact", head: true });

      if (error) throw error;

      this.initialized = true;
      return true;
    } catch (error) {
      console.error("Supabase initialization error:", error);
      return false;
    }
  }

  // ----- AUTHENTICATION -----
  async signIn(email, password) {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      currentUser = data.user;
      return { success: true, user: data.user };
    } catch (error) {
      console.error("Sign in error:", error);
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      const { error } = await this.client.auth.signOut();
      if (error) throw error;
      currentUser = null;
      return { success: true };
    } catch (error) {
      console.error("Sign out error:", error);
      return { success: false, error: error.message };
    }
  }

  async getCurrentUser() {
    try {
      const {
        data: { user },
        error,
      } = await this.client.auth.getUser();
      if (error) throw error;
      currentUser = user;
      return user;
    } catch (error) {
      console.error("Get user error:", error);
      return null;
    }
  }

  // ----- PRODUCTS -----
  async getAllProducts() {
    try {
      const { data, error } = await this.client
        .from("products")
        .select("*")
        .order("name");

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting products:", error);
      return [];
    }
  }

  async getProduct(id) {
    try {
      const { data, error } = await this.client
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error getting product:", error);
      return null;
    }
  }

  // Replace the saveProduct method with this:
  async saveProduct(product) {
    try {
      // Ensure proper formatting
      const formattedProduct = {
        id: String(product.id),
        name: product.name,
        category: product.category,
        type: product.type,
        price: Number(product.price) || 0,
        stock: Number(product.stock) || 0,
        bundles: product.bundles || [],
      };

      console.log(
        "Saving product:",
        formattedProduct.id,
        formattedProduct.name,
      );

      // Use upsert (works with both real Supabase and fallback)
      const { data, error } = await this.client
        .from("products")
        .upsert(formattedProduct, { onConflict: "id" });

      if (error) {
        console.error("Upsert error:", error);
        // Fallback: try insert then update
        try {
          const { error: insertError } = await this.client
            .from("products")
            .insert(formattedProduct);

          if (insertError) {
            // Try update
            const { error: updateError } = await this.client
              .from("products")
              .update(formattedProduct)
              .eq("id", formattedProduct.id);

            if (updateError) {
              throw updateError;
            }
          }
        } catch (fallbackError) {
          console.error("Fallback save error:", fallbackError);
          throw fallbackError;
        }
      }

      return product.id;
    } catch (error) {
      console.error("Error saving product:", error);
      throw error;
    }
  }

  // Replace the saveProducts method with this:
  async saveProducts(products) {
    try {
      console.log("Saving multiple products:", products.length);

      // Format all products
      const formattedProducts = products.map((p) => ({
        id: String(p.id),
        name: p.name,
        category: p.category,
        type: p.type,
        price: Number(p.price) || 0,
        stock: Number(p.stock) || 0,
        bundles: p.bundles || [],
      }));

      // Try bulk upsert
      const { data, error } = await this.client
        .from("products")
        .upsert(formattedProducts, { onConflict: "id" });

      if (error) {
        console.error("Bulk upsert error:", error);
        // Fallback: process individually
        for (const product of formattedProducts) {
          await this.saveProduct(product);
        }
      }

      return true;
    } catch (error) {
      console.error("Error saving products:", error);
      // Last resort: try each product individually
      try {
        for (const product of products) {
          await this.saveProduct(product);
        }
        return true;
      } catch (finalError) {
        console.error("Final fallback failed:", finalError);
        throw finalError;
      }
    }
  }

  async deleteProduct(id) {
    try {
      const { error } = await this.client
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  }

  async searchProducts(query) {
    try {
      if (!query) return await this.getAllProducts();

      const { data, error } = await this.client
        .from("products")
        .select("*")
        .or(
          `name.ilike.%${query}%,category.ilike.%${query}%,type.ilike.%${query}%`,
        )
        .order("name");

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error searching products:", error);
      return [];
    }
  }

  async getLowStockProducts(threshold = 10) {
    try {
      const { data, error } = await this.client
        .from("products")
        .select("*")
        .lt("stock", threshold)
        .order("stock");

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting low stock products:", error);
      return [];
    }
  }

  async getProductsByCategory(category) {
    try {
      const { data, error } = await this.client
        .from("products")
        .select("*")
        .eq("category", category)
        .order("name");

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting products by category:", error);
      return [];
    }
  }

  // ----- SALES -----
  async getAllSales() {
    try {
      const { data, error } = await this.client
        .from("sales")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      // Map database column names back to camelCase for the app
      return (data || []).map((item) => ({
        id: item.id,
        productId: item.productid, // Map productid to productId
        productName: item.productname, // Map productname to productName
        quantity: item.quantity,
        price: item.price,
        payment: item.payment,
        total: item.total,
        date: item.date,
        note: item.note,
      }));
    } catch (error) {
      console.error("Error getting sales:", error);
      return [];
    }
  }

  async getSale(id) {
    try {
      const { data, error } = await this.client
        .from("sales")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error getting sale:", error);
      return null;
    }
  }

  async saveSale(sale) {
    try {
      sale.quantity = Number(sale.quantity) || 0;
      sale.price = Number(sale.price) || 0;
      sale.total = Number(sale.total) || 0;

      // Use lowercase column names to match your database
      const saleData = {
        id: sale.id,
        productid: sale.productid, // Changed from productId to productid
        productname: sale.productname, // Changed from productName to productname
        quantity: sale.quantity,
        price: sale.price,
        payment: sale.payment,
        total: sale.total,
        date: sale.date || new Date().toISOString(),
      };

      // Only add note if it exists
      if (sale.note) {
        saleData.note = sale.note;
      }

      console.log("Attempting to insert sale:", saleData);

      const { data, error } = await this.client
        .from("sales")
        .insert(saleData)
        .select();

      if (error) {
        console.error("Insert error:", error);
        throw error;
      }

      console.log("Sale saved successfully:", data);
      return sale.id;
    } catch (error) {
      console.error("Error saving sale:", error);
      throw error;
    }
  }

  async saveSales(sales) {
    try {
      for (const sale of sales) {
        await this.saveSale(sale);
      }
      return true;
    } catch (error) {
      console.error("Error saving sales:", error);
      throw error;
    }
  }

  async deleteSale(id) {
    try {
      const { error } = await this.client.from("sales").delete().eq("id", id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting sale:", error);
      throw error;
    }
  }

  async getSalesByDate(startDate, endDate) {
    try {
      const { data, error } = await this.client
        .from("sales")
        .select("*")
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString())
        .order("date", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting sales by date:", error);
      return [];
    }
  }

  async getSalesByPayment(payment) {
    try {
      const { data, error } = await this.client
        .from("sales")
        .select("*")
        .eq("payment", payment)
        .order("date", { ascending: false });

      if (error) throw error;
      return data || [];
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

      const { data, error } = await this.client
        .from("sales")
        .select("total")
        .gte("date", start.toISOString())
        .lte("date", end.toISOString());

      if (error) throw error;

      return data.reduce((sum, s) => sum + (s.total || 0), 0);
    } catch (error) {
      console.error("Error getting daily revenue:", error);
      return 0;
    }
  }

  async getRevenueByPayment(payment) {
    try {
      const { data, error } = await this.client
        .from("sales")
        .select("total")
        .eq("payment", payment);

      if (error) throw error;

      return data.reduce((sum, s) => sum + (s.total || 0), 0);
    } catch (error) {
      console.error("Error getting revenue by payment:", error);
      return 0;
    }
  }

  async getTopProducts(limit = 5) {
    try {
      // Get all sales
      const { data: salesData, error } = await this.client
        .from("sales")
        .select("productid, productname, quantity, total");

      if (error) throw error;

      // Aggregate in memory
      const productMap = new Map();
      salesData.forEach((sale) => {
        if (!productMap.has(sale.productid)) {
          productMap.set(sale.productid, {
            id: sale.productid,
            name: sale.productname,
            quantity: 0,
            revenue: 0,
          });
        }
        const entry = productMap.get(sale.productid);
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

  // ----- STATS -----
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

  // ----- REAL-TIME SUBSCRIPTIONS -----
  subscribeToProducts(callback) {
    return this.client
      .channel("products_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        (payload) => {
          callback(payload);
        },
      )
      .subscribe();
  }

  subscribeToSales(callback) {
    return this.client
      .channel("sales_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
        },
        (payload) => {
          callback(payload);
        },
      )
      .subscribe();
  }
}

// ============================================
// INITIALIZE SUPABASE
// ============================================
let database = null;

async function initDatabase() {
  try {
    // Load Supabase client
    if (window.supabaseLoadPromise) {
      await window.supabaseLoadPromise;
    }

    if (typeof supabaseJs === "undefined") {
      throw new Error("Supabase library not loaded");
    }

    database = new BudAndBrushSupabase();
    const initialized = await database.init();

    if (!initialized) {
      throw new Error("Failed to initialize Supabase");
    }

    // Check if products exist, if not load defaults
    const existingProducts = await database.getAllProducts();
    console.log("Existing products:", existingProducts.length);

    if (existingProducts.length === 0) {
      console.log("No products found, seeding default data...");
      await database.saveProducts(defaultProducts);
      console.log("Default products seeded successfully!");

      // Verify the data was inserted
      const verifyProducts = await database.getAllProducts();
      console.log("Products after seeding:", verifyProducts.length);
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
  };
}

function normalizeSale(s) {
  if (!s) return null;
  return {
    ...s,
    id: String(s.id),
    productid: String(s.productid),
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
  const rules = product.bundles || [];
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
    const dbProducts = await database.getAllProducts();
    products = dbProducts.map(normalizeProduct).filter(Boolean);

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

  // Check if Uberzol is active and has a manual value
  const paymentMethod = document.getElementById("paymentMethod")?.value;
  const isUberzol = paymentMethod === "Uberzol";
  const uberzolInput = document.getElementById("uberzolSubtotalInput");
  let uberzolValue = null;

  if (isUberzol && uberzolInput && uberzolInput.dataset.userEdited === "true") {
    uberzolValue = parseFloat(uberzolInput.value);
  }

  if (!cart.length) {
    list.innerHTML = '<div class="empty-state">Your cart is empty.</div>';
    subtotalEl.textContent = currency(0);
    countEl.textContent = "0 items";
    return;
  }

  let subtotal = 0;
  list.innerHTML = cart
    .map((item) => {
      const product = getProductById(item.productid);
      if (!product) return "";

      const currentPrice =
        item.customPrice !== undefined
          ? item.customPrice
          : calculatePrice(product, item.quantity);
      const total = currentPrice;
      subtotal += total;

      return `
      <div class="cart-item" data-product-id="${product.id}">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <strong>${product.name}</strong>
            <div class="meta small">${product.bundles?.length ? "Bundle pricing available" : "Standard pricing"}</div>
          </div>
          <button class="btn btn-link text-danger p-0" data-remove="${product.id}">Remove</button>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" data-update="${product.id}" data-delta="-1">−</button>
          <span class="fw-semibold">${item.quantity}</span>
          <button class="qty-btn" data-update="${product.id}" data-delta="1">+</button>
        </div>
        <div class="d-flex justify-content-between mt-2 align-items-center">
          <span class="small text-muted">${currency(product.price)} each</span>
          <div class="price-edit-group">
            <span class="currency-symbol">R</span>
            <input type="number" 
                   class="cart-price-input" 
                   data-product-id="${product.id}"
                   step="0.01" 
                   min="0"
                   value="${currency(currentPrice)}"
                   placeholder="0.00"
            />
            <button class="btn btn-link text-primary p-0 reset-price-btn" data-product-id="${product.id}" title="Reset to default price">
              <i class="fas fa-undo-alt"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  // Use Uberzol value if set, otherwise use calculated subtotal
  if (
    isUberzol &&
    uberzolValue !== null &&
    !isNaN(uberzolValue) &&
    uberzolValue >= 0
  ) {
    subtotalEl.textContent = currency(uberzolValue);
    subtotalEl.style.color = "#7c3aed";
  } else {
    subtotalEl.textContent = currency(subtotal);
    subtotalEl.style.color = "";
  }

  countEl.textContent = `${cart.reduce((s, i) => s + i.quantity, 0)} items`;

  list.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      cart = cart.filter((i) => String(i.productid) !== btn.dataset.remove);
      renderCart();
    });
  });

  list.querySelectorAll("[data-update]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.update;
      const delta = Number(btn.dataset.delta);
      const item = cart.find((i) => String(i.productid) === id);
      if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
          cart = cart.filter((i) => String(i.productid) !== id);
        } else {
          const product = getProductById(id);
          if (product) {
            const defaultPrice = calculatePrice(product, item.quantity);
            if (item.customPrice !== undefined) {
              const oldQuantity = item.quantity - delta;
              const oldPrice = item.customPrice;
              if (oldQuantity > 0) {
                const perUnitPrice = oldPrice / oldQuantity;
                item.customPrice = perUnitPrice * item.quantity;
              } else {
                item.customPrice = defaultPrice;
              }
            }
          }
        }
        renderCart();
      }
    });
  });

  list.querySelectorAll(".cart-price-input").forEach((input) => {
    input.addEventListener("input", function () {
      const productid = this.dataset.productid;
      const value = parseFloat(this.value);
      const item = cart.find((i) => String(i.productid) === productid);
      if (item && !isNaN(value) && value >= 0) {
        item.customPrice = value;
        updateCartSubtotal();
      }
    });

    input.addEventListener("focus", function () {
      this.select();
    });
  });

  list.querySelectorAll(".reset-price-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const productid = this.dataset.productid;
      const item = cart.find((i) => String(i.productid) === productid);
      const product = getProductById(productid);
      if (item && product) {
        delete item.customPrice;
        renderCart();
      }
    });
  });

  // Update Uberzol subtotal if visible
  const uberzolGroup = document.getElementById("uberzolSubtotalGroup");
  if (uberzolGroup && uberzolGroup.style.display !== "none") {
    updateUberzolSubtotal();
  }
}
function updateCartSubtotal() {
  let subtotal = 0;
  cart.forEach((item) => {
    const product = getProductById(item.productid);
    if (product) {
      const price =
        item.customPrice !== undefined
          ? item.customPrice
          : calculatePrice(product, item.quantity);
      subtotal += price;
    }
  });
  document.getElementById("cartSubtotal").textContent = currency(subtotal);
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
    const matchSearch = `${s.productname} ${s.payment}`
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
      const badgeClass =
        s.payment === "Cash"
          ? "badge-cash"
          : s.payment === "Yoco"
            ? "badge-yoco"
            : s.payment === "Uberzol"
              ? "badge-uberzol"
              : "badge-eft";
      return `
      <tr>
        <td>${new Date(s.date).toLocaleString()}</td>
        <td>${s.productname}</td>
        <td>${s.quantity}</td>
        <td><span class="${badgeClass}">${s.payment}</span></td>
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
  const uberzol = sales
    .filter((s) => s.payment === "Uberzol")
    .reduce((s, sale) => s + Number(sale.total || 0), 0);

  document.getElementById("dashboardRevenue").textContent = currency(revenue);
  document.getElementById("dashboardCash").textContent = currency(cash);
  document.getElementById("dashboardYoco").textContent = currency(yoco);
  document.getElementById("dashboardEftSales").textContent = currency(eft);
  document.getElementById("dashboardUberzol").textContent = currency(uberzol);

  const breakdown = [
    { label: "Cash", value: cash, total: revenue },
    { label: "Yoco", value: yoco, total: revenue },
    { label: "EFT", value: eft, total: revenue },
    { label: "Uberzol", value: uberzol, total: revenue },
  ];

  const breakdownContainer = document.getElementById("paymentBreakdown");
  if (breakdownContainer) {
    breakdownContainer.innerHTML = breakdown
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
  }

  const salesByProduct = products
    .map((p) => ({
      name: p.name,
      units: sales
        .filter((s) => String(s.productid) === String(p.id))
        .reduce((sum, s) => sum + s.quantity, 0),
    }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  const topProductsList = document.getElementById("topProductsList");
  if (topProductsList) {
    topProductsList.innerHTML = salesByProduct.some((i) => i.units > 0)
      ? salesByProduct
          .map(
            (i) =>
              `<div class="d-flex justify-content-between py-2 border-bottom"><span>${i.name}</span><strong>${i.units} contributed</strong></div>`,
          )
          .join("")
      : '<div class="empty-state">No contributions recorded yet.</div>';
  }

  const low = products
    .filter((p) => p.stock < 10)
    .sort((a, b) => a.stock - b.stock);

  const stockAlertsList = document.getElementById("stockAlertsList");
  if (stockAlertsList) {
    stockAlertsList.innerHTML = low.length
      ? low
          .map(
            (p) =>
              `<div class="d-flex justify-content-between py-2 border-bottom"><span>${p.name}</span><strong>${p.stock} left</strong></div>`,
          )
          .join("")
      : '<div class="empty-state">All items are comfortably stocked.</div>';
  }

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

  if (totals.every((t) => t === 0)) {
    container.innerHTML =
      '<div class="empty-state">No sales data for the last 7 days</div>';
    return;
  }

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
  updateCategoryTypeLists();
}

// ----- CART ACTIONS -----
function addToCart(productid, qty = 1) {
  const product = getProductById(productid);
  if (!product) return;
  if (product.stock < qty) {
    alert(`Only ${product.stock} unit(s) of ${product.name} remain.`);
    return;
  }
  const existing = cart.find((i) => String(i.productid) === String(productid));
  if (existing) existing.quantity += qty;
  else cart.push({ productid: String(productid), quantity: qty });
  renderCart();
}

async function checkout() {
  if (!cart.length) {
    alert("Add at least one item to the cart first.");
    return;
  }

  const payment = document.getElementById("paymentMethod").value;
  const newSales = [];

  // Check if Uberzol is selected and get the manual subtotal
  let uberzolTotal = null;
  if (payment === "Uberzol") {
    const input = document.getElementById("uberzolSubtotalInput");
    if (input) {
      const value = parseFloat(input.value);
      if (!isNaN(value) && value > 0) {
        uberzolTotal = value;
      } else {
        alert("Please enter a valid Uberzol amount (greater than 0).");
        return;
      }
    }
  }

  // Calculate proportions for Uberzol distribution
  let calculatedSubtotal = 0;
  if (payment === "Uberzol" && uberzolTotal !== null) {
    // Calculate the normal subtotal for proportion distribution
    cart.forEach((item) => {
      const product = getProductById(item.productid);
      if (product) {
        calculatedSubtotal += calculatePrice(product, item.quantity);
      }
    });
  }

  for (const item of cart) {
    const product = getProductById(item.productid);
    if (!product) continue;
    if (product.stock < item.quantity) {
      alert(`Only ${product.stock} unit(s) of ${product.name} remain.`);
      return;
    }
    product.stock -= item.quantity;

    let total;
    if (payment === "Uberzol" && uberzolTotal !== null) {
      // Distribute the Uberzol total proportionally
      const itemTotal = calculatePrice(product, item.quantity);
      const proportion =
        calculatedSubtotal > 0
          ? itemTotal / calculatedSubtotal
          : 1 / cart.length;
      total = uberzolTotal * proportion;
    } else {
      // Use custom price if set, otherwise calculate with bundles
      total =
        item.customPrice !== undefined
          ? item.customPrice
          : calculatePrice(product, item.quantity);
    }

    newSales.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      productid: String(product.id),
      productname: product.name,
      quantity: item.quantity,
      price: product.price,
      payment,
      total: total,
      date: new Date().toISOString(),
      // Add note if Uberzol was used with manual total
      ...(payment === "Uberzol" && {
        note: `Uberzol total: ${currency(uberzolTotal)}`,
      }),
    });
  }

  sales.push(...newSales);
  await saveProducts();
  await saveSales();
  cart = [];
  renderAll();
  setSyncStatus("Contribution recorded!", "success");
}

// ----- UBERZOL SUBTOTAL EDITING -----
function updateUberzolSubtotal() {
  const uberzolGroup = document.getElementById("uberzolSubtotalGroup");
  if (!uberzolGroup || uberzolGroup.style.display === "none") return;

  // Calculate the current cart subtotal
  let subtotal = 0;
  cart.forEach((item) => {
    const product = getProductById(item.productid);
    if (product) {
      const price =
        item.customPrice !== undefined
          ? item.customPrice
          : calculatePrice(product, item.quantity);
      subtotal += price;
    }
  });

  // Get the input field
  const input = document.getElementById("uberzolSubtotalInput");
  if (!input) return;

  // If the input is empty or the user hasn't edited it, set it to the subtotal
  if (!input.dataset.userEdited || input.dataset.userEdited === "false") {
    input.value = subtotal.toFixed(2);
  }

  // Update the cart subtotal display to show the Uberzol amount
  const subtotalEl = document.getElementById("cartSubtotal");
  if (subtotalEl && input.value) {
    const uberzolAmount = parseFloat(input.value) || 0;
    subtotalEl.textContent = currency(uberzolAmount);
    subtotalEl.style.color = "#7c3aed";
  }
}

function resetUberzolSubtotal() {
  const input = document.getElementById("uberzolSubtotalInput");
  if (!input) return;

  // Reset to the calculated subtotal
  let subtotal = 0;
  cart.forEach((item) => {
    const product = getProductById(item.productid);
    if (product) {
      const price =
        item.customPrice !== undefined
          ? item.customPrice
          : calculatePrice(product, item.quantity);
      subtotal += price;
    }
  });

  input.value = subtotal.toFixed(2);
  input.dataset.userEdited = "false";

  // Update the display
  const subtotalEl = document.getElementById("cartSubtotal");
  if (subtotalEl) {
    subtotalEl.textContent = currency(subtotal);
    subtotalEl.style.color = "";
  }

  setSyncStatus("Uberzol subtotal reset", "info");
}

function setupUberzolSubtotalListener() {
  const input = document.getElementById("uberzolSubtotalInput");
  if (!input) return;

  input.addEventListener("input", function () {
    this.dataset.userEdited = "true";
    const value = parseFloat(this.value);

    // Update the cart subtotal display
    const subtotalEl = document.getElementById("cartSubtotal");
    if (subtotalEl && !isNaN(value) && value >= 0) {
      subtotalEl.textContent = currency(value);
      subtotalEl.style.color = "#7c3aed";
    } else if (subtotalEl) {
      // If invalid, show the calculated subtotal
      let calculatedSubtotal = 0;
      cart.forEach((item) => {
        const product = getProductById(item.productid);
        if (product) {
          const price =
            item.customPrice !== undefined
              ? item.customPrice
              : calculatePrice(product, item.quantity);
          calculatedSubtotal += price;
        }
      });
      subtotalEl.textContent = currency(calculatedSubtotal);
      subtotalEl.style.color = "";
    }
  });

  // Select all text on focus
  input.addEventListener("focus", function () {
    this.select();
  });
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
  document.getElementById("productid").value = "";
  document.getElementById("productname").focus();
  const container = document.getElementById("bundlesContainer");
  container.innerHTML = `
    <div class="bundle-input-group d-flex gap-2 mb-2">
      <input type="number" class="form-control bundle-qty" placeholder="Qty" min="1" />
      <input type="number" class="form-control bundle-price" placeholder="Price" step="0.01" />
      <button type="button" class="btn btn-outline-danger remove-bundle-btn">×</button>
    </div>
  `;
  updateBundleRemoveButtons();
}

function editProduct(id) {
  const p = getProductById(id);
  if (!p) return;
  document.getElementById("productid").value = p.id;
  document.getElementById("productname").value = p.name;
  document.getElementById("productCategory").value = p.category;
  document.getElementById("productType").value = p.type;
  document.getElementById("productPrice").value = p.price;
  document.getElementById("productStock").value = p.stock;

  const container = document.getElementById("bundlesContainer");
  container.innerHTML = "";
  if (p.bundles && p.bundles.length > 0) {
    p.bundles.forEach((bundle) => {
      addBundleInput(bundle.qty, bundle.price);
    });
  } else {
    addBundleInput();
  }
  updateBundleRemoveButtons();
  switchView("inventory");
}

function addBundleInput(qty = "", price = "") {
  const container = document.getElementById("bundlesContainer");
  const div = document.createElement("div");
  div.className = "bundle-input-group d-flex gap-2 mb-2";
  div.innerHTML = `
    <input type="number" class="form-control bundle-qty" placeholder="Qty" min="1" value="${qty}" />
    <input type="number" class="form-control bundle-price" placeholder="Price" step="0.01" value="${price}" />
    <button type="button" class="btn btn-outline-danger remove-bundle-btn">×</button>
  `;
  container.appendChild(div);
  updateBundleRemoveButtons();
}

function updateBundleRemoveButtons() {
  document.querySelectorAll(".remove-bundle-btn").forEach((btn) => {
    btn.removeEventListener("click", handleBundleRemove);
    btn.addEventListener("click", handleBundleRemove);
  });
}

function handleBundleRemove(e) {
  const group = e.target.closest(".bundle-input-group");
  if (document.querySelectorAll(".bundle-input-group").length > 1) {
    group.remove();
  } else {
    group.querySelector(".bundle-qty").value = "";
    group.querySelector(".bundle-price").value = "";
  }
}

function getBundlesFromForm() {
  const groups = document.querySelectorAll(".bundle-input-group");
  const bundles = [];
  groups.forEach((group) => {
    const qty = parseInt(group.querySelector(".bundle-qty").value);
    const price = parseFloat(group.querySelector(".bundle-price").value);
    if (qty > 0 && price > 0) {
      bundles.push({ qty, price });
    }
  });
  return bundles;
}

function updateCategoryTypeLists() {
  const categories = [...new Set(products.map((p) => p.category))];
  const categoryList = document.getElementById("categoryList");
  if (categoryList) {
    categoryList.innerHTML = categories
      .map((c) => `<option value="${c}">`)
      .join("");
  }

  const types = [...new Set(products.map((p) => p.type))];
  const typeList = document.getElementById("typeList");
  if (typeList) {
    typeList.innerHTML = types.map((t) => `<option value="${t}">`).join("");
  }
}

async function saveProduct(event) {
  event.preventDefault();
  const id = document.getElementById("productid").value;
  const name = document.getElementById("productname").value.trim();
  const category = document.getElementById("productCategory").value.trim();
  const type = document.getElementById("productType").value.trim();
  const price = Number(document.getElementById("productPrice").value);
  const stock = Number(document.getElementById("productStock").value);
  const bundles = getBundlesFromForm();

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
      existing.bundles = bundles;
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
      bundles: bundles,
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
    const matchSearch = `${s.productname} ${s.payment}`
      .toLowerCase()
      .includes(search);
    return matchPayment && matchSearch;
  });

  const rows = [
    ["Date", "Product", "Qty", "Payment", "Total"],
    ...filtered.map((s) => [
      new Date(s.date).toLocaleString(),
      s.productname,
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

  if (view === "dashboard") {
    renderDashboard();
  }
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

  const dbInitialized = await initDatabase();
  if (!dbInitialized) {
    setSyncStatus(
      "Failed to initialize database. Check console for errors.",
      "danger",
    );
    return;
  }

  await loadData();
  renderAll();
  setSyncStatus("Ready - connected to Supabase", "success");
}

// ----- INIT -----
async function init() {
  if (window.supabaseLoadPromise) {
    try {
      await window.supabaseLoadPromise;
    } catch (error) {
      console.warn("Supabase load issue:", error);
    }
  }

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

  // Payment method handler - Show/hide Uberzol subtotal editor
  document
    .getElementById("paymentMethod")
    .addEventListener("change", function () {
      const uberzolGroup = document.getElementById("uberzolSubtotalGroup");
      const uberzolInput = document.getElementById("uberzolSubtotalInput");
      const subtotalEl = document.getElementById("cartSubtotal");

      if (this.value === "Uberzol") {
        uberzolGroup.style.display = "block";
        // Reset the input to show calculated subtotal
        if (uberzolInput) {
          let subtotal = 0;
          cart.forEach((item) => {
            const product = getProductById(item.productid);
            if (product) {
              const price =
                item.customPrice !== undefined
                  ? item.customPrice
                  : calculatePrice(product, item.quantity);
              subtotal += price;
            }
          });
          uberzolInput.value = subtotal.toFixed(2);
          uberzolInput.dataset.userEdited = "false";
        }
        if (subtotalEl) {
          subtotalEl.style.color = "#7c3aed";
        }
        // Add visual indicator
        document
          .querySelector(".cart-summary")
          ?.classList.add("uberzol-active");
      } else {
        uberzolGroup.style.display = "none";
        if (subtotalEl) {
          // Reset to calculated subtotal
          let subtotal = 0;
          cart.forEach((item) => {
            const product = getProductById(item.productid);
            if (product) {
              const price =
                item.customPrice !== undefined
                  ? item.customPrice
                  : calculatePrice(product, item.quantity);
              subtotal += price;
            }
          });
          subtotalEl.textContent = currency(subtotal);
          subtotalEl.style.color = "";
        }
        document
          .querySelector(".cart-summary")
          ?.classList.remove("uberzol-active");
      }
    });

  // Reset Uberzol subtotal button
  document
    .getElementById("resetUberzolSubtotalBtn")
    .addEventListener("click", resetUberzolSubtotal);

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
  document
    .getElementById("addBundleBtn")
    .addEventListener("click", () => addBundleInput());

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

console.log("🌿 Bud & Brush application loaded with Supabase");
console.log("✅ Data is stored remotely and accessible from anywhere");
