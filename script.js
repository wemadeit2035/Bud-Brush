// ============================================
// BUD & BRUSH - Main Application with Supabase
// ============================================

// ----- CONFIGURATION -----
const ADMIN_PASSWORD = "B&B420";
const SESSION_KEY_AUTH = "bb_auth";

// Supabase Configuration
const SUPABASE_URL = "https://ghfkqospijjdgixporvy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoZmtxb3NwaWpqZGdpeHBvcnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NDE5NzYsImV4cCI6MjEwMDIxNzk3Nn0.rVOZJcbxMCiu-0O_OGrj9F_2aQZ4g77P17jVMoVPN6s";

// ----- CONSTANTS -----
const PAYMENT_METHODS = {
  CASH: "Cash",
  YOCO: "Yoco",
  EFT: "EFT",
  UBERZOL: "Uberzol",
};

const BUNDLE_RULES = {
  GREENHOUSE_PREROLL: { qty: 3, price: 150 },
  GREENHOUSE_FLOWER: { qty: 5, price: 250 },
  INDOOR_PREROLL: { qty: 3, price: 300 },
  INDOOR_FLOWER: { qty: 5, price: 400 },
};

const STOCK_THRESHOLDS = {
  LOW: 5,
  WARNING: 15,
};

// ----- STATE -----
let products = [];
let sales = [];
let transactions = [];
let cart = [];
let activeView = "pos";
let isAuthenticated = false;
let isDataLoaded = false;
let supabaseClient = null;
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
// ERROR HANDLER
// ============================================
class ErrorHandler {
  static handle(error, context = "") {
    console.error(`[${context}]`, error);

    let message = "An unexpected error occurred.";
    if (error.message?.includes("duplicate key")) {
      message = "This item already exists.";
    } else if (error.message?.includes("foreign key")) {
      message = "This item is referenced by other records.";
    } else if (error.message?.includes("network")) {
      message = "Network error. Please check your connection.";
    } else if (error.message) {
      message = error.message;
    }

    showToast("Error", message, "error");
    return message;
  }
}

// ============================================
// RETRY LOGIC
// ============================================
async function withRetry(fn, maxRetries = 3, delay = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }
  throw lastError;
}

// ============================================
// VALIDATORS
// ============================================
const Validators = {
  isPositiveNumber: (value) => typeof value === "number" && value > 0,
  isNonNegativeNumber: (value) => typeof value === "number" && value >= 0,
  isNotEmpty: (value) => value && value.trim().length > 0,

  sanitizeString: (value) => {
    if (!value) return "";
    return value.replace(/[<>]/g, "").trim();
  },

  validateTransaction: (data) => {
    const errors = [];
    if (!data.items || data.items.length === 0) {
      errors.push("Transaction must have at least one item");
    }
    if (
      !data.payment ||
      !Object.values(PAYMENT_METHODS).includes(data.payment)
    ) {
      errors.push("Invalid payment method");
    }
    if (data.total < 0) {
      errors.push("Total cannot be negative");
    }
    data.items?.forEach((item, index) => {
      if (item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      }
      if (item.lineTotal < 0) {
        errors.push(`Item ${index + 1}: Price cannot be negative`);
      }
    });
    return {
      valid: errors.length === 0,
      errors,
    };
  },
};

// ============================================
// CART CALCULATOR
// ============================================
class CartCalculator {
  static calculateSubtotal(cartItems) {
    return cartItems.reduce((sum, item) => {
      const product = getProductById(item.productId);
      if (!product) return sum;
      const price =
        item.customPrice !== undefined
          ? item.customPrice
          : calculatePrice(product, item.quantity);
      return sum + price;
    }, 0);
  }

  static calculateTotalWithBundles(cartItems) {
    const result = applyCartBundles(cartItems);
    return result.total;
  }

  static getItemCount(cartItems) {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }
}

// ============================================
// SUPABASE DATABASE CLASS
// ============================================
class BudAndBrushSupabase {
  constructor() {
    this.initialized = false;
    this.client = null;
  }

  async init() {
    try {
      // Check if supabase is available globally
      let supabaseJs = window.supabaseJs || window.supabase;

      if (!supabaseJs) {
        // Try to load it dynamically
        console.log("Supabase not loaded, attempting to load...");
        await this.loadSupabaseLibrary();
        supabaseJs = window.supabaseJs || window.supabase;
      }

      if (!supabaseJs) {
        throw new Error(
          "Supabase library not available. Please check your internet connection and try again.",
        );
      }

      const { createClient } = supabaseJs;
      this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // Test connection
      const { data, error } = await this.client
        .from("products")
        .select("count", { count: "exact", head: true });

      if (error) {
        console.error("Supabase connection test failed:", error);
        throw error;
      }

      this.initialized = true;
      console.log("✅ Supabase initialized successfully");
      return true;
    } catch (error) {
      console.error("Supabase initialization error:", error);
      return false;
    }
  }

  async loadSupabaseLibrary() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js";
      script.onload = () => {
        console.log("✅ Supabase library loaded dynamically");
        resolve();
      };
      script.onerror = () => {
        reject(
          new Error(
            "Failed to load Supabase library. Please check your internet connection.",
          ),
        );
      };
      document.head.appendChild(script);
    });
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

  async saveProduct(product) {
    try {
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

      const { data, error } = await this.client
        .from("products")
        .upsert(formattedProduct, { onConflict: "id" });

      if (error) {
        console.error("Upsert error:", error);
        throw error;
      }

      return product.id;
    } catch (error) {
      console.error("Error saving product:", error);
      throw error;
    }
  }

  async saveProducts(products) {
    try {
      const formattedProducts = products.map((p) => ({
        id: String(p.id),
        name: p.name,
        category: p.category,
        type: p.type,
        price: Number(p.price) || 0,
        stock: Number(p.stock) || 0,
        bundles: p.bundles || [],
      }));

      const { data, error } = await this.client
        .from("products")
        .upsert(formattedProducts, { onConflict: "id" });

      if (error) {
        console.error("Bulk upsert error:", error);
        // Fallback to individual saves
        for (const product of formattedProducts) {
          await this.saveProduct(product);
        }
      }

      return true;
    } catch (error) {
      console.error("Error saving products:", error);
      throw error;
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

  // ============================================
  // TRANSACTION FUNCTIONS
  // ============================================

  async saveTransaction(transaction) {
    try {
      console.log("💾 Saving transaction with custom_price:", transaction);

      const { data: txData, error: txError } = await this.client
        .from("transactions")
        .insert({
          transaction_date: transaction.date || new Date().toISOString(),
          payment: transaction.payment,
          subtotal: transaction.subtotal,
          discount: transaction.discount || 0,
          total: transaction.total,
          note: transaction.note || null,
          item_count: transaction.items.length,
        })
        .select()
        .single();

      if (txError) throw txError;

      // ✅ FIXED: Use 'items' not 'transactionItems'
      const items = transaction.items.map((item) => ({
        transaction_id: txData.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        line_total: item.lineTotal,
        is_bundle: item.isBundle || false,
        bundle_discount: item.bundleDiscount || 0,
        custom_price: item.customPrice === true,
      }));

      console.log("📝 Items being saved:", JSON.stringify(items, null, 2));

      const { error: itemsError } = await this.client
        .from("transaction_items")
        .insert(items);

      if (itemsError) {
        console.error("❌ Items error:", itemsError);
        throw itemsError;
      }

      console.log("✅ Transaction saved successfully with ID:", txData.id);
      return txData.id;
    } catch (error) {
      console.error("❌ Error saving transaction:", error);
      throw error;
    }
  }

  async getAllTransactions() {
    try {
      const { data: transactions, error: txError } = await this.client
        .from("transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (txError) throw txError;

      const { data: items, error: itemsError } = await this.client
        .from("transaction_items")
        .select("*");

      if (itemsError) throw itemsError;

      const itemsByTransaction = {};
      items.forEach((item) => {
        if (!itemsByTransaction[item.transaction_id]) {
          itemsByTransaction[item.transaction_id] = [];
        }
        itemsByTransaction[item.transaction_id].push({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          lineTotal: item.line_total,
          isBundle: item.is_bundle,
          bundleDiscount: item.bundle_discount,
          customPrice: item.custom_price || false,
        });
      });

      return transactions.map((tx) => ({
        id: tx.id,
        date: tx.transaction_date,
        payment: tx.payment,
        subtotal: tx.subtotal,
        discount: tx.discount,
        total: tx.total,
        note: tx.note,
        itemCount: tx.item_count,
        items: itemsByTransaction[tx.id] || [],
      }));
    } catch (error) {
      console.error("Error getting transactions:", error);
      return [];
    }
  }

  async deleteTransaction(transactionId) {
    try {
      const { error: itemsError } = await this.client
        .from("transaction_items")
        .delete()
        .eq("transaction_id", transactionId);

      if (itemsError) throw itemsError;

      const { error: txError } = await this.client
        .from("transactions")
        .delete()
        .eq("id", transactionId);

      if (txError) throw txError;

      return true;
    } catch (error) {
      console.error("Error deleting transaction:", error);
      throw error;
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
}

// ============================================
// INITIALIZE SUPABASE
// ============================================
let database = null;

async function initDatabase() {
  try {
    // Check if supabase is available
    let supabaseJs = window.supabaseJs || window.supabase;

    if (!supabaseJs) {
      console.log("🔄 Loading Supabase library...");
      setSyncStatus("Loading Supabase...", "info");

      // Try loading the library
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js";
        script.onload = () => {
          console.log("✅ Supabase library loaded");
          resolve();
        };
        script.onerror = () => {
          reject(new Error("Failed to load Supabase library"));
        };
        document.head.appendChild(script);
      });

      supabaseJs = window.supabaseJs || window.supabase;
    }

    if (!supabaseJs) {
      throw new Error(
        "Supabase library not available. Please check your internet connection.",
      );
    }

    database = new BudAndBrushSupabase();
    const initialized = await database.init();

    if (!initialized) {
      throw new Error("Failed to initialize Supabase connection");
    }

    // Check if products exist
    const existingProducts = await database.getAllProducts();
    console.log("Existing products:", existingProducts.length);

    if (existingProducts.length === 0) {
      console.log("No products found, seeding default data...");
      await database.saveProducts(defaultProducts);
      console.log("Default products seeded successfully!");
    }

    setSyncStatus("Connected to database", "success");
    return true;
  } catch (error) {
    console.error("Database initialization error:", error);
    setSyncStatus("Database error: " + error.message, "danger");
    showToast(
      "Connection Error",
      "Failed to connect to database. Please refresh and try again.",
      "error",
    );
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
    productId: String(s.productId || s.productid || ""),
    productName: String(s.productName || s.productname || ""),
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

  // Category-based bundles
  if (product.category === "Greenhouse" && product.type === "Pre-roll") {
    if (quantity >= 3) {
      const bundleCount = Math.floor(quantity / 3);
      const rem = quantity % 3;
      const total = bundleCount * 150 + rem * unitPrice;
      if (total < best) best = total;
    }
  }

  if (product.category === "Indoor" && product.type === "Pre-roll") {
    if (quantity >= 3) {
      const bundleCount = Math.floor(quantity / 3);
      const rem = quantity % 3;
      const total = bundleCount * 300 + rem * unitPrice;
      if (total < best) best = total;
    }
  }

  return best;
}

// Get available bundles for a product based on category/type
function getAvailableBundles(product, quantity) {
  const bundles = [];

  // ✅ Greenhouse Pre-roll Bundle - Show even for single items
  if (product.category === "Greenhouse" && product.type === "Pre-roll") {
    // Count total Greenhouse Pre-rolls in cart
    const totalGreenhousePrerolls = cart
      .filter((item) => {
        const p = getProductById(item.productId);
        return p && p.category === "Greenhouse" && p.type === "Pre-roll";
      })
      .reduce((sum, item) => sum + item.quantity, 0);

    const currentQty = totalGreenhousePrerolls;
    const needed = Math.max(0, 3 - currentQty);
    const isActive = currentQty >= 3;

    bundles.push({
      id: "greenhouse-pr-3",
      name: `🌿 Greenhouse PR Special (3 for R150)${needed > 0 ? ` - Add ${needed} more` : " - Applied!"}`,
      price: 150,
      qty: 3,
      currentQty: currentQty,
      needed: needed,
      isActive: isActive,
      type: "greenhouse-pr",
      category: "Greenhouse",
      productType: "Pre-roll",
    });
  }

  // ✅ Greenhouse Flower Bundle
  if (product.category === "Greenhouse" && product.type === "Flower") {
    const totalGreenhouseFlowers = cart
      .filter((item) => {
        const p = getProductById(item.productId);
        return p && p.category === "Greenhouse" && p.type === "Flower";
      })
      .reduce((sum, item) => sum + item.quantity, 0);

    const currentQty = totalGreenhouseFlowers;
    const needed = Math.max(0, 5 - currentQty);
    const isActive = currentQty >= 5;

    bundles.push({
      id: "greenhouse-flower-5",
      name: `🌿 Greenhouse Bud Special (5g for R250)${needed > 0 ? ` - Add ${needed} more` : " - Applied!"}`,
      price: 250,
      qty: 5,
      currentQty: currentQty,
      needed: needed,
      isActive: isActive,
      type: "greenhouse-flower",
      category: "Greenhouse",
      productType: "Flower",
    });
  }

  // ✅ Indoor Pre-roll Bundle
  if (
    (product.category === "Indoor" ||
      product.category === "Indoor Exotic" ||
      product.category === "Indoor Hydro") &&
    product.type === "Pre-roll"
  ) {
    const totalIndoorPrerolls = cart
      .filter((item) => {
        const p = getProductById(item.productId);
        return (
          p &&
          (p.category === "Indoor" ||
            p.category === "Indoor Exotic" ||
            p.category === "Indoor Hydro") &&
          p.type === "Pre-roll"
        );
      })
      .reduce((sum, item) => sum + item.quantity, 0);

    const currentQty = totalIndoorPrerolls;
    const needed = Math.max(0, 3 - currentQty);
    const isActive = currentQty >= 3;

    bundles.push({
      id: "indoor-pr-3",
      name: `🏠 Indoor PR Special (3 for R300)${needed > 0 ? ` - Add ${needed} more` : " - Applied!"}`,
      price: 300,
      qty: 3,
      currentQty: currentQty,
      needed: needed,
      isActive: isActive,
      type: "indoor-pr",
      category: "Indoor",
      productType: "Pre-roll",
    });
  }

  // ✅ Indoor Flower Bundle
  if (
    (product.category === "Indoor" ||
      product.category === "Indoor Exotic" ||
      product.category === "Indoor Hydro") &&
    product.type === "Flower"
  ) {
    const totalIndoorFlowers = cart
      .filter((item) => {
        const p = getProductById(item.productId);
        return (
          p &&
          (p.category === "Indoor" ||
            p.category === "Indoor Exotic" ||
            p.category === "Indoor Hydro") &&
          p.type === "Flower"
        );
      })
      .reduce((sum, item) => sum + item.quantity, 0);

    const currentQty = totalIndoorFlowers;
    const needed = Math.max(0, 5 - currentQty);
    const isActive = currentQty >= 5;

    bundles.push({
      id: "indoor-flower-5",
      name: `🏠 Indoor Bud Special (5g for R400)${needed > 0 ? ` - Add ${needed} more` : " - Applied!"}`,
      price: 400,
      qty: 5,
      currentQty: currentQty,
      needed: needed,
      isActive: isActive,
      type: "indoor-flower",
      category: "Indoor",
      productType: "Flower",
    });
  }

  return bundles;
}

// ✅ Bundle change handler function
function handleBundleChange(e) {
  const select = e.target;
  const productId = select.dataset.productId;
  const bundleId = select.value;
  const item = cart.find((i) => String(i.productId) === productId);

  if (item) {
    const product = getProductById(productId);
    if (bundleId === "none") {
      // Remove bundle
      item.selectedBundle = null;
      item.bundleApplied = null;
      delete item.customPrice;
    } else {
      // Apply bundle
      const availableBundles = getAvailableBundles(product, item.quantity);
      const selectedBundle = availableBundles.find((b) => b.id === bundleId);
      if (selectedBundle) {
        item.selectedBundle = bundleId;
        item.bundleApplied = {
          id: selectedBundle.id,
          name: selectedBundle.name,
          price: selectedBundle.price,
        };
        // Set the bundle price
        item.customPrice = selectedBundle.price;
      }
    }
    renderCart();
  }
}

// ✅ Bundle change handler function
function handleBundleChange(e) {
  const select = e.target;
  const productId = select.dataset.productId;
  const bundleId = select.value;
  const item = cart.find((i) => String(i.productId) === productId);

  if (item) {
    const product = getProductById(productId);
    if (bundleId === "none") {
      // Remove bundle
      item.selectedBundle = null;
      item.bundleApplied = null;
      delete item.customPrice;
    } else {
      // Apply bundle
      const availableBundles = getAvailableBundles(product, item.quantity);
      const selectedBundle = availableBundles.find((b) => b.id === bundleId);
      if (selectedBundle) {
        item.selectedBundle = bundleId;
        item.bundleApplied = {
          id: selectedBundle.id,
          name: selectedBundle.name,
          price: selectedBundle.price,
        };
        // Set the bundle price
        item.customPrice = selectedBundle.price;
      }
    }
    renderCart();
  }
}

// ✅ ADD THIS FUNCTION RIGHT HERE - Handle add to bundle click
function handleAddToBundle(e) {
  const btn = e.target.closest(".add-to-bundle-btn");
  if (!btn) return;

  const productId = btn.dataset.productId;
  const bundleType = btn.dataset.bundleType;
  const addQty = parseInt(btn.dataset.addQty) || 1;

  // Get the selected product from the dropdown
  const container = btn.closest(".add-to-bundle-container");
  const select = container.querySelector(".add-product-select");
  const selectedProductId = select.value;

  if (!selectedProductId) {
    showToast(
      "Select Product",
      "Please select a strain to add to the bundle.",
      "warning",
    );
    return;
  }

  // Check if product already exists in cart
  const existingItem = cart.find(
    (i) => String(i.productId) === selectedProductId,
  );
  const product = getProductById(selectedProductId);

  // Check stock
  if (product.stock < addQty) {
    showToast(
      "Stock Alert",
      `Only ${product.stock} of ${product.name} available.`,
      "error",
    );
    return;
  }

  if (existingItem) {
    existingItem.quantity += addQty;
  } else {
    cart.push({
      productId: selectedProductId,
      quantity: addQty,
    });
  }

  showToast(
    "Added to Bundle",
    `Added ${addQty}x ${product.name} to cart!`,
    "success",
  );

  // Check if bundle is now complete
  const bundleTypeMap = {
    "greenhouse-pr": { category: "Greenhouse", type: "Pre-roll", neededQty: 3 },
    "greenhouse-flower": {
      category: "Greenhouse",
      type: "Flower",
      neededQty: 5,
    },
    "indoor-pr": { category: "Indoor", type: "Pre-roll", neededQty: 3 },
    "indoor-flower": { category: "Indoor", type: "Flower", neededQty: 5 },
  };

  const bundleInfo = bundleTypeMap[bundleType];
  if (bundleInfo) {
    // Count total items of this category/type in cart
    const totalItems = cart
      .filter((item) => {
        const p = getProductById(item.productId);
        return (
          p && p.category === bundleInfo.category && p.type === bundleInfo.type
        );
      })
      .reduce((sum, item) => sum + item.quantity, 0);

    if (totalItems >= bundleInfo.neededQty) {
      // Auto-apply the bundle
      const allBundles = getAvailableBundles(product, totalItems);
      const activeBundle = allBundles.find(
        (b) => b.isActive && b.type === bundleType,
      );

      if (activeBundle) {
        // Apply bundle to all items of this category/type
        cart.forEach((item) => {
          const p = getProductById(item.productId);
          if (
            p &&
            p.category === bundleInfo.category &&
            p.type === bundleInfo.type
          ) {
            item.selectedBundle = activeBundle.id;
            item.bundleApplied = {
              id: activeBundle.id,
              name: activeBundle.name,
              price: activeBundle.price,
            };
            // Distribute the bundle price proportionally
            const totalPrice = activeBundle.price;
            const totalQty = totalItems;
            item.customPrice = (item.quantity / totalQty) * totalPrice;
          }
        });

        showToast(
          "🎉 Bundle Applied!",
          `You got the ${activeBundle.name}!`,
          "success",
        );
      }
    }
  }

  renderCart();
}

// ----- CART-LEVEL BUNDLE CALCULATION -----
function applyCartBundles(cartItems) {
  const processedItems = [];
  const remainingItems = [];

  cartItems.forEach((item) => {
    const product = getProductById(item.productId);
    if (!product) return;

    // ✅ CHECK: Does this item have a custom price?
    const hasCustomPrice = item.customPrice !== undefined;

    if (hasCustomPrice) {
      // Items with custom price go directly to remaining
      remainingItems.push({
        ...item,
        product: product,
        originalTotal: product.price * item.quantity,
        isCustomPrice: true,
        customPrice: true,
      });
      return;
    }

    if (product.bundles && product.bundles.length > 0) {
      const bundlePrice = calculatePrice(product, item.quantity);
      const originalTotal = product.price * item.quantity;
      const isBundle = bundlePrice < originalTotal;
      const bundleDiscount = isBundle ? originalTotal - bundlePrice : 0;

      processedItems.push({
        ...item,
        product: product,
        originalTotal: originalTotal,
        lineTotal: isBundle ? bundlePrice : originalTotal,
        isBundle: isBundle,
        bundleDiscount: bundleDiscount,
        bundleType: isBundle ? `Product Bundle (${product.name})` : null,
        customPrice: false,
      });
    } else {
      remainingItems.push({
        ...item,
        product: product,
        originalTotal: product.price * item.quantity,
        isCustomPrice: false,
        customPrice: false,
      });
    }
  });

  // Separate items by category/type for bundle calculation
  const greenhousePrerolls = [];
  const greenhouseFlowers = [];
  const indoorPrerolls = [];
  const indoorFlowers = [];
  const otherItems = [];

  remainingItems.forEach((item) => {
    if (item.isCustomPrice) {
      otherItems.push(item);
      return;
    }

    const product = item.product;
    if (product.category === "Greenhouse" && product.type === "Pre-roll") {
      greenhousePrerolls.push(item);
    } else if (product.category === "Greenhouse" && product.type === "Flower") {
      greenhouseFlowers.push(item);
    } else if (
      (product.category === "Indoor" ||
        product.category === "Indoor Exotic" ||
        product.category === "Indoor Hydro") &&
      product.type === "Pre-roll"
    ) {
      indoorPrerolls.push(item);
    } else if (
      (product.category === "Indoor" ||
        product.category === "Indoor Exotic" ||
        product.category === "Indoor Hydro") &&
      product.type === "Flower"
    ) {
      indoorFlowers.push(item);
    } else {
      otherItems.push(item);
    }
  });

  // Bundle calculation function with bundle name tracking
  function calculateBundle(items, bundleQty, bundlePrice, bundleName) {
    if (items.length === 0) {
      return {
        items: [],
        totalUnits: 0,
        bundleCount: 0,
        remaining: 0,
        normalTotal: 0,
        bundledTotal: 0,
        discount: 0,
        bundleName: bundleName,
      };
    }

    const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
    const bundleCount = Math.floor(totalUnits / bundleQty);
    const remaining = totalUnits % bundleQty;
    const normalTotal = items.reduce(
      (sum, item) => sum + item.originalTotal,
      0,
    );

    let bundledTotal = 0;
    let discount = 0;

    if (bundleCount > 0) {
      const bundledUnits = bundleCount * bundleQty;
      const bundledPrice = bundleCount * bundlePrice;

      let remainingUnits = bundledUnits;
      let bundleOriginalPrice = 0;

      for (const item of items) {
        if (remainingUnits <= 0) break;
        const unitsToTake = Math.min(item.quantity, remainingUnits);
        const proportion = unitsToTake / item.quantity;
        bundleOriginalPrice += item.originalTotal * proportion;
        remainingUnits -= unitsToTake;
      }

      discount = bundleOriginalPrice - bundledPrice;
      bundledTotal = bundledPrice + (normalTotal - bundleOriginalPrice);
    } else {
      bundledTotal = normalTotal;
      discount = 0;
    }

    const resultItems = items.map((item) => {
      const proportion = normalTotal > 0 ? item.originalTotal / normalTotal : 0;
      const itemDiscount = discount * proportion;
      const finalPrice = item.originalTotal - itemDiscount;
      const isBundle = bundleCount > 0 && item.quantity >= bundleQty;

      return {
        ...item,
        lineTotal: finalPrice,
        isBundle: isBundle,
        bundleDiscount: itemDiscount,
        bundleType: isBundle ? bundleName : null,
        customPrice: false,
      };
    });

    return {
      items: resultItems,
      totalUnits,
      bundleCount,
      remaining,
      normalTotal,
      bundledTotal,
      discount,
      bundleName: bundleName,
    };
  }

  // Calculate all bundles with their names
  const greenhousePrerollResult = calculateBundle(
    greenhousePrerolls,
    3,
    150,
    "🌿 Greenhouse PR Special (3 for R150)",
  );

  const greenhouseFlowerResult = calculateBundle(
    greenhouseFlowers,
    5,
    250,
    "🌿 Greenhouse Bud Special (5g for R250)",
  );

  const indoorPrerollResult = calculateBundle(
    indoorPrerolls,
    3,
    300,
    "🏠 Indoor PR Special (3 for R300)",
  );

  const indoorFlowerResult = calculateBundle(
    indoorFlowers,
    5,
    400,
    "🏠 Indoor Bud Special (5g for R400)",
  );

  // ✅ IMPORTANT: Preserve customPrice for items that had it
  const resultItems = [
    ...processedItems,
    ...greenhousePrerollResult.items,
    ...greenhouseFlowerResult.items,
    ...indoorPrerollResult.items,
    ...indoorFlowerResult.items,
    ...otherItems.map((item) => ({
      ...item,
      lineTotal: item.originalTotal,
      isBundle: false,
      bundleDiscount: 0,
      bundleType: null,
      customPrice: item.customPrice || false,
    })),
  ];

  const subtotal = resultItems.reduce(
    (sum, item) => sum + item.originalTotal,
    0,
  );
  const total = resultItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const discount = subtotal - total;

  // Build bundle info for the transaction note
  const bundleInfo = {
    greenhousePrerollBundles: greenhousePrerollResult.bundleCount,
    greenhousePrerollRemaining: greenhousePrerollResult.remaining,
    greenhouseFlowerBundles: greenhouseFlowerResult.bundleCount,
    greenhouseFlowerRemaining: greenhouseFlowerResult.remaining,
    indoorPrerollBundles: indoorPrerollResult.bundleCount,
    indoorPrerollRemaining: indoorPrerollResult.remaining,
    indoorFlowerBundles: indoorFlowerResult.bundleCount,
    indoorFlowerRemaining: indoorFlowerResult.remaining,
    processedItemBundles: processedItems.filter((item) => item.isBundle).length,
    // ✅ Add bundle names for display
    bundleNames: {
      greenhousePreroll:
        greenhousePrerollResult.bundleCount > 0
          ? greenhousePrerollResult.bundleName
          : null,
      greenhouseFlower:
        greenhouseFlowerResult.bundleCount > 0
          ? greenhouseFlowerResult.bundleName
          : null,
      indoorPreroll:
        indoorPrerollResult.bundleCount > 0
          ? indoorPrerollResult.bundleName
          : null,
      indoorFlower:
        indoorFlowerResult.bundleCount > 0
          ? indoorFlowerResult.bundleName
          : null,
    },
  };

  console.log("📊 Bundle Info:", bundleInfo);

  return {
    items: resultItems,
    subtotal: subtotal,
    total: total,
    discount: discount,
    bundleInfo: bundleInfo,
  };
}

// ----- LOAD DATA FROM DATABASE -----
async function loadData() {
  try {
    const dbProducts = await database.getAllProducts();
    products = dbProducts.map(normalizeProduct).filter(Boolean);
    console.log(`Loaded ${products.length} products`);

    try {
      transactions = await database.getAllTransactions();
      console.log(`Loaded ${transactions.length} transactions`);

      sales = [];
      transactions.forEach((tx) => {
        tx.items.forEach((item) => {
          sales.push({
            id: tx.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.unitPrice,
            payment: tx.payment,
            total: item.lineTotal,
            date: tx.date,
            note: tx.note,
            isBundle: item.isBundle,
            bundleDiscount: item.bundleDiscount,
          });
        });
      });
    } catch (error) {
      console.warn("Could not load transactions, starting fresh:", error);
      transactions = [];
      sales = [];
    }

    isDataLoaded = true;
    setSyncStatus(
      `Loaded ${products.length} items and ${transactions.length} transactions`,
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
      '<div class="empty-state"><div class="empty-icon">🔍</div><h4>No products found</h4><p>Try adjusting your search</p></div>';
    return;
  }

  grid.innerHTML = filtered
    .map(
      (p) => `
    <div class="product-card" data-id="${p.id}">
      <div class="product-header">
        <span class="product-name">${p.name}</span>
        <span class="product-badge ${getCategoryClass(p.category)}">${p.category}</span>
      </div>
      <div>
        <span class="product-badge ${getTypeClass(p.type)}">${p.type}</span>
      </div>
      <div class="product-price">${currency(p.price)}</div>
      <div class="product-stock ${p.stock < STOCK_THRESHOLDS.LOW ? "low" : ""}">
        ${p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
      </div>
      ${p.bundles?.length ? `<div class="product-bundles">${p.bundles.map((b) => `${b.qty}×${currency(b.price)}`).join(" · ")}</div>` : ""}
      <div class="product-quick-actions">
        <button class="qty-btn-sm" data-add="1">+1</button>
        <button class="qty-btn-sm" data-add="3">+3</button>
        <button class="qty-btn-sm" data-add="5">+5</button>
      </div>
    </div>
  `,
    )
    .join("");

  grid.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".product-quick-actions")) return;
      addToCart(card.dataset.id, 1);
    });
  });

  grid.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = btn.closest(".product-card");
      const qty = parseInt(btn.dataset.add);
      addToCart(card.dataset.id, qty);
    });
  });
}

function renderCart() {
  const list = document.getElementById("cartItems");
  const subtotalEl = document.getElementById("cartSubtotal");
  const countEl = document.getElementById("cartCount");

  const paymentMethod = document.getElementById("paymentMethod")?.value;
  const isUberzol = paymentMethod === "Uberzol";
  const uberzolInput = document.getElementById("uberzolSubtotalInput");
  let uberzolValue = null;

  if (isUberzol && uberzolInput && uberzolInput.dataset.userEdited === "true") {
    uberzolValue = parseFloat(uberzolInput.value);
  }

  if (!cart.length) {
    list.innerHTML =
      '<div class="empty-state"><div class="empty-icon">🛒</div><h4>Your cart is empty</h4><p>Browse products and add items to get started</p></div>';
    subtotalEl.textContent = currency(0);
    countEl.textContent = "0 items";
    return;
  }

  let subtotal = 0;
  list.innerHTML = cart
    .map((item) => {
      const product = getProductById(item.productId);
      if (!product) return "";

      // Get current price
      let currentPrice =
        item.customPrice !== undefined
          ? item.customPrice
          : calculatePrice(product, item.quantity);

      // Check if bundle is selected and no custom override
      if (
        item.selectedBundle &&
        item.bundleApplied &&
        item.customPrice === undefined
      ) {
        currentPrice = item.bundleApplied.price;
      }

      const total = currentPrice;
      subtotal += total;

      // ✅ Get available bundles for this product
      const availableBundles = getAvailableBundles(product, item.quantity);

      // ✅ Build bundle selector HTML with "Add More" functionality
      let bundleHtml = "";
      if (availableBundles.length > 0) {
        bundleHtml = `
  <div class="bundle-selector mt-2">
    <select class="bundle-select form-control form-control-sm" data-product-id="${product.id}">
      <option value="none">Regular Price</option>
      ${availableBundles
        .map(
          (b) => `
        <option value="${b.id}" ${item.selectedBundle === b.id ? "selected" : ""}>
          ${b.name}
        </option>
      `,
        )
        .join("")}
    </select>
    ${availableBundles
      .map((b) => {
        if (b.needed > 0 && !b.isActive) {
          // Get all products of the same category/type that can be added
          const addableProducts = products.filter(
            (p) =>
              p.category === b.category &&
              p.type === b.productType &&
              p.stock > 0 &&
              // Don't show products already at max stock or already in cart with high quantity
              !cart.some(
                (c) =>
                  String(c.productId) === String(p.id) && c.quantity >= p.stock,
              ),
          );

          // Count how many more items we need to reach the bundle
          const neededCount = b.needed;

          return `
          <div class="add-to-bundle-container mt-1">
            <div class="bundle-progress">
              <span class="bundle-progress-text">Need ${neededCount} more ${b.productType.toLowerCase()} to complete bundle</span>
              <div class="bundle-progress-bar">
                <div class="bundle-progress-fill" style="width: ${(b.currentQty / b.qty) * 100}%"></div>
              </div>
            </div>
            <div class="add-more-controls">
              <select class="form-control form-control-sm add-product-select" data-bundle-type="${b.type}">
                <option value="">Select a strain to add...</option>
                ${addableProducts
                  .map(
                    (p) => `
                  <option value="${p.id}">${p.name} (R${currency(p.price)} each)</option>
                `,
                  )
                  .join("")}
              </select>
              <button class="btn btn-primary btn-sm add-to-bundle-btn mt-1" 
                      data-product-id="${product.id}" 
                      data-bundle-type="${b.type}"
                      data-add-qty="1"
                      title="Add 1 more to get closer to the bundle">
                <i class="fas fa-plus"></i> Add 1
              </button>
            </div>
            ${
              b.needed > 1
                ? `
              <div class="text-muted small mt-1">
                <i class="fas fa-info-circle"></i> You can add ${b.needed} more items, one at a time, from any strain
              </div>
            `
                : ""
            }
          </div>
        `;
        }
        return "";
      })
      .join("")}
  </div>
`;
      }

      // ✅ Show bundle info if applied
      let bundleInfoHtml = "";
      if (item.bundleApplied) {
        bundleInfoHtml = `
        <div class="bundle-info mt-1">
          <span class="badge bg-success">${item.bundleApplied.name}</span>
        </div>
      `;
      }

      return `
    <div class="cart-item" data-product-id="${product.id}">
      <div class="item-info">
        <span class="item-name">${product.name}</span>
        <button class="item-remove" data-remove="${product.id}"><i class="fas fa-times"></i></button>
      </div>
      <div class="qty-controls">
        <button class="qty-btn" data-update="${product.id}" data-delta="-1">−</button>
        <span class="fw-semibold">${item.quantity}</span>
        <button class="qty-btn" data-update="${product.id}" data-delta="1">+</button>
      </div>
      ${bundleHtml}
      ${bundleInfoHtml}
      <div class="item-price-edit">
        <span class="text-muted small">R${currency(product.price)} each</span>
        <span class="currency-symbol ms-2">R</span>
        <input type="number" 
               class="price-edit-input" 
               data-product-id="${product.id}"
               step="0.01" 
               min="0"
               value="${currency(currentPrice)}"
               placeholder="0.00"
        />
        ${item.selectedBundle ? `<span class="bundle-price-indicator ms-1 text-success small">Bundle</span>` : ""}
        <button class="reset-price-btn" data-product-id="${product.id}" title="Reset price">
          <i class="fas fa-undo-alt"></i>
        </button>
      </div>
    </div>
  `;
    })
    .join("");

  if (
    isUberzol &&
    uberzolValue !== null &&
    !isNaN(uberzolValue) &&
    uberzolValue >= 0
  ) {
    subtotalEl.textContent = currency(uberzolValue);
    subtotalEl.className = "total-amount uberzol";
  } else {
    subtotalEl.textContent = currency(subtotal);
    subtotalEl.className = "total-amount";
  }

  countEl.textContent = `${cart.reduce((s, i) => s + i.quantity, 0)} items`;

  // ✅ Bundle selector change handler - ADD THIS INSIDE renderCart()
  list.querySelectorAll(".bundle-select").forEach((select) => {
    select.removeEventListener("change", handleBundleChange);
    select.addEventListener("change", handleBundleChange);
  });

  // ✅ ADD THIS - Add to Bundle button handler
  list.querySelectorAll(".add-to-bundle-btn").forEach((btn) => {
    btn.removeEventListener("click", handleAddToBundle);
    btn.addEventListener("click", handleAddToBundle);
  });

  // ✅ Add product select change - update button state
  list.querySelectorAll(".add-product-select").forEach((select) => {
    select.removeEventListener("change", function () {
      const container = this.closest(".add-to-bundle-container");
      const btn = container.querySelector(".add-to-bundle-btn");
      if (this.value) {
        btn.disabled = false;
      } else {
        btn.disabled = true;
      }
    });
    select.addEventListener("change", function () {
      const container = this.closest(".add-to-bundle-container");
      const btn = container.querySelector(".add-to-bundle-btn");
      if (this.value) {
        btn.disabled = false;
      } else {
        btn.disabled = true;
      }
    });
  });

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
        if (item.quantity <= 0) {
          cart = cart.filter((i) => String(i.productId) !== id);
        } else {
          const product = getProductById(id);
          if (product) {
            // ✅ Check if the selected bundle is still valid
            if (item.selectedBundle) {
              const availableBundles = getAvailableBundles(
                product,
                item.quantity,
              );
              const bundleStillValid = availableBundles.some(
                (b) => b.id === item.selectedBundle,
              );
              if (!bundleStillValid) {
                // Bundle no longer valid, remove it
                item.selectedBundle = null;
                item.bundleApplied = null;
                delete item.customPrice;
              } else if (
                item.customPrice !== undefined &&
                !item.isCustomBundlePrice
              ) {
                // Update bundle price if quantity changed but no custom override
                const bundle = availableBundles.find(
                  (b) => b.id === item.selectedBundle,
                );
                if (bundle) {
                  item.customPrice = bundle.price;
                }
              }
            } else if (item.customPrice !== undefined) {
              // Update custom price based on new quantity
              const oldQuantity = item.quantity - delta;
              const oldPrice = item.customPrice;
              if (oldQuantity > 0) {
                const perUnitPrice = oldPrice / oldQuantity;
                item.customPrice = perUnitPrice * item.quantity;
              }
            }
          }
          renderCart();
        }
      }
    });
  });

  list.querySelectorAll(".price-edit-input").forEach((input) => {
    input.addEventListener("input", function () {
      const productId = this.dataset.productId;
      const value = parseFloat(this.value);
      const item = cart.find((i) => String(i.productId) === productId);
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
      const productId = this.dataset.productId;
      const item = cart.find((i) => String(i.productId) === productId);
      if (item) {
        delete item.customPrice;
        renderCart();
      }
    });
  });

  const uberzolGroup = document.getElementById("uberzolSubtotalGroup");
  if (uberzolGroup && uberzolGroup.style.display !== "none") {
    updateUberzolSubtotal();
  }
}

function updateCartSubtotal() {
  const subtotal = CartCalculator.calculateSubtotal(cart);
  document.getElementById("cartSubtotal").textContent = currency(subtotal);
}

function renderInventoryTable() {
  const tbody = document.getElementById("inventoryTable");
  tbody.innerHTML = products
    .map((p) => {
      let status = '<span class="stock-good">In stock</span>';
      if (p.stock < STOCK_THRESHOLDS.LOW)
        status = '<span class="stock-low">Low stock</span>';
      else if (p.stock < STOCK_THRESHOLDS.WARNING)
        status = '<span class="stock-medium">Running low</span>';
      return `
      <tr>
        <td><strong>${p.name}</strong><div class="text-muted small"><span class="product-badge ${getCategoryClass(p.category)}">${p.category}</span> <span class="product-badge ${getTypeClass(p.type)}">${p.type}</span></div></td>
        <td>${currency(p.price)}</td>
        <td>${p.stock}</td>
        <td>${status}</td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-secondary btn-sm" data-edit="${p.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-delete="${p.id}">Delete</button>
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

  if (!transactions || transactions.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📦</div><h4>No transactions yet</h4><p>Start making sales to see your history here</p></div></td></tr>';
    return;
  }

  const filtered = transactions.filter((tx) => {
    const matchPayment = filter === "all" || tx.payment === filter;
    const matchSearch = tx.items.some((item) =>
      item.productName.toLowerCase().includes(search),
    );
    return matchPayment && matchSearch;
  });

  if (!filtered.length) {
    tbody.innerHTML =
      '<tr><td colspan="6"><div class="empty-state">No transactions match the filters.</div></td></tr>';
    return;
  }

  tbody.innerHTML = filtered
    .slice()
    .reverse()
    .map((tx) => {
      // In renderSalesHistory, where the item summary is built
      const itemsSummary = tx.items
        .map((item) => {
          let tags = "";
          let priceDisplay = "";

          const originalTotal = item.unitPrice * item.quantity;
          const paidPrice = item.lineTotal;
          const priceDiff = originalTotal - paidPrice;

          // ✅ Check if this item has a custom price
          if (item.customPrice) {
            tags += " ✏️";

            if (paidPrice !== originalTotal) {
              const isDiscount = priceDiff > 0;
              const diffAmount = Math.abs(priceDiff);

              if (isDiscount) {
                priceDisplay = `
            <span class="price-strikethrough">${currency(originalTotal)}</span>
            <span class="text-success fw-bold">${currency(paidPrice)}</span>
            <span class="text-success small">(-${currency(diffAmount)})</span>
          `;
              } else {
                priceDisplay = `
            <span class="price-strikethrough">${currency(originalTotal)}</span>
            <span class="text-warning fw-bold">${currency(paidPrice)}</span>
            <span class="text-warning small">(+${currency(diffAmount)})</span>
          `;
              }
            } else {
              // Price edited but same as original
              priceDisplay = `<span>${currency(paidPrice)}</span>`;
            }
          } else if (item.isBundle) {
            // Bundle pricing logic (keep as is)
            tags += " 🎯";
            if (paidPrice !== originalTotal) {
              const diffAmount = Math.abs(priceDiff);
              priceDisplay = `
          <span class="price-strikethrough">${currency(originalTotal)}</span>
          <span class="text-success fw-bold">${currency(paidPrice)}</span>
          <span class="text-success small">(-${currency(diffAmount)})</span>
        `;
            } else {
              priceDisplay = `<span>${currency(paidPrice)}</span>`;
            }
          } else {
            // Regular price
            priceDisplay = `<span>${currency(paidPrice)}</span>`;
          }

          return `${item.quantity}x ${item.productName}${tags} → ${priceDisplay}`;
        })
        .join(", ");

      const totalDiscount = tx.discount || 0;

      const badgeClass =
        tx.payment === "Cash"
          ? "badge-cash"
          : tx.payment === "Yoco"
            ? "badge-yoco"
            : tx.payment === "Uberzol"
              ? "badge-uberzol"
              : "badge-eft";

      const discountedItems = tx.items.filter((item) => {
        const originalTotal = item.unitPrice * item.quantity;
        return item.lineTotal < originalTotal;
      }).length;

      return `
      <tr>
        <td>
          ${new Date(tx.date).toLocaleString()}
          ${tx.note ? `<br><span class="text-muted small">${tx.note}</span>` : ""}
        </td>
        <td>
          <strong>${tx.items.length} items</strong>
          <br>
          <span class="text-muted small">${itemsSummary}</span>
          ${totalDiscount > 0 ? `<br><span class="text-success fw-bold small">💸 Discount: ${currency(totalDiscount)} (${discountedItems} item${discountedItems > 1 ? "s" : ""})</span>` : ""}
        </td>
        <td>
          <span class="badge bg-secondary">${tx.itemCount || tx.items.length}</span>
          <br>
          <span class="text-muted small">${tx.items.reduce((sum, i) => sum + i.quantity, 0)} units</span>
        </td>
        <td><span class="badge-payment ${badgeClass}">${tx.payment}</span></td>
        <td>
          <strong>${currency(tx.total)}</strong>
          ${totalDiscount > 0 ? `<br><span class="text-muted small"><del>${currency(tx.subtotal)}</del></span>` : ""}
        </td>
        <td>
          <button class="btn btn-outline-secondary btn-sm edit-transaction-btn" 
                  data-transaction-id="${tx.id}" 
                  title="Edit transaction">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-danger btn-sm delete-transaction-btn" 
                  data-transaction-id="${tx.id}" 
                  title="Delete transaction">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
    })
    .join("");

  document.querySelectorAll(".edit-transaction-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const transactionId = this.dataset.transactionId;
      editTransaction(transactionId);
    });
  });

  document.querySelectorAll(".delete-transaction-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const transactionId = this.dataset.transactionId;
      deleteTransaction(transactionId);
    });
  });
}

function renderDashboard() {
  if (!transactions) transactions = [];

  const totalRevenue = transactions.reduce(
    (sum, tx) => sum + (tx.total || 0),
    0,
  );
  const cash = transactions
    .filter((tx) => tx.payment === "Cash")
    .reduce((sum, tx) => sum + (tx.total || 0), 0);
  const yoco = transactions
    .filter((tx) => tx.payment === "Yoco")
    .reduce((sum, tx) => sum + (tx.total || 0), 0);
  const eft = transactions
    .filter((tx) => tx.payment === "EFT")
    .reduce((sum, tx) => sum + (tx.total || 0), 0);
  const uberzol = transactions
    .filter((tx) => tx.payment === "Uberzol")
    .reduce((sum, tx) => sum + (tx.total || 0), 0);

  const revenueEl = document.getElementById("dashboardRevenue");
  const cashEl = document.getElementById("dashboardCash");
  const yocoEl = document.getElementById("dashboardYoco");
  const eftEl = document.getElementById("dashboardEftSales");
  const uberzolEl = document.getElementById("dashboardUberzol");

  if (revenueEl) revenueEl.textContent = currency(totalRevenue);
  if (cashEl) cashEl.textContent = currency(cash);
  if (yocoEl) yocoEl.textContent = currency(yoco);
  if (eftEl) eftEl.textContent = currency(eft);
  if (uberzolEl) uberzolEl.textContent = currency(uberzol);

  const breakdown = [
    { label: "Cash", value: cash, total: totalRevenue, color: "#2563eb" },
    { label: "Yoco", value: yoco, total: totalRevenue, color: "#7c3aed" },
    { label: "EFT", value: eft, total: totalRevenue, color: "#f59e0b" },
    { label: "Uberzol", value: uberzol, total: totalRevenue, color: "#8b5cf6" },
  ];

  const breakdownContainer = document.getElementById("paymentBreakdown");
  if (breakdownContainer) {
    breakdownContainer.innerHTML = breakdown
      .map((entry) => {
        const pct =
          totalRevenue > 0
            ? ((entry.value / totalRevenue) * 100).toFixed(1)
            : 0;
        return `
        <div class="payment-bar">
          <div class="d-flex justify-content-between">
            <strong>${entry.label}</strong>
            <span>${currency(entry.value)} · ${pct}%</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;background:${entry.color};"></div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  const productSales = {};
  transactions.forEach((tx) => {
    if (tx.items && tx.items.length > 0) {
      tx.items.forEach((item) => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.productName,
            units: 0,
            revenue: 0,
          };
        }
        productSales[item.productId].units += item.quantity || 0;
        productSales[item.productId].revenue += item.lineTotal || 0;
      });
    }
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  const topProductsList = document.getElementById("topProductsList");
  if (topProductsList) {
    topProductsList.innerHTML =
      topProducts.length > 0
        ? topProducts
            .map(
              (p) =>
                `<div class="d-flex justify-content-between py-2 border-bottom">
                <span>${p.name}</span>
                <strong>${p.units} units · ${currency(p.revenue)}</strong>
              </div>`,
            )
            .join("")
        : '<div class="empty-state"><div class="empty-icon">⭐</div><p>No product sales recorded yet</p></div>';
  }

  const low = products
    .filter((p) => p.stock < STOCK_THRESHOLDS.WARNING)
    .sort((a, b) => a.stock - b.stock);

  const stockAlertsList = document.getElementById("stockAlertsList");
  if (stockAlertsList) {
    stockAlertsList.innerHTML = low.length
      ? low
          .map(
            (p) =>
              `<div class="d-flex justify-content-between py-2 border-bottom">
                <span>${p.name}</span>
                <strong class="${p.stock < STOCK_THRESHOLDS.LOW ? "text-danger" : "text-warning"}">${p.stock} left</strong>
              </div>`,
          )
          .join("")
      : '<div class="empty-state"><div class="empty-icon">✅</div><p>All items are comfortably stocked</p></div>';
  }

  renderDailyRevenueChart();
}

function renderDailyRevenueChart() {
  const container = document.getElementById("dailyRevenueChart");
  if (!container) return;

  const days = 7;
  const labels = [];
  const totals = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);

    const total = transactions
      .filter((tx) => tx.date && tx.date.startsWith(key))
      .reduce((sum, tx) => sum + (tx.total || 0), 0);

    labels.push(
      d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    );
    totals.push(total);
  }

  const max = Math.max(...totals, 1);

  if (totals.every((t) => t === 0)) {
    container.innerHTML =
      '<div class="empty-state"><div class="empty-icon">📊</div><p>No sales data for the last 7 days</p></div>';
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
              <span class="chart-value">${currency(v)}</span>
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
function addToCart(productId, qty = 1) {
  const product = getProductById(productId);
  if (!product) return;
  if (product.stock < qty) {
    showToast(
      "Stock Alert",
      `Only ${product.stock} unit(s) of ${product.name} remain.`,
      "warning",
    );
    return;
  }
  const existing = cart.find((i) => String(i.productId) === String(productId));
  if (existing) existing.quantity += qty;
  else cart.push({ productId: String(productId), quantity: qty });

  // Animation feedback
  const card = document.querySelector(`.product-card[data-id="${productId}"]`);
  if (card) {
    card.classList.add("adding");
    setTimeout(() => card.classList.remove("adding"), 400);
  }

  renderCart();
  showToast("Added", `${qty}x ${product.name} added to cart`, "success");
}

// ============================================
// CHECKOUT FUNCTION (FIXED)
// ============================================
async function checkout() {
  if (!cart.length) {
    showToast(
      "Cart Empty",
      "Add at least one item to the cart first.",
      "warning",
    );
    return;
  }

  const payment = document.getElementById("paymentMethod").value;

  let uberzolTotal = null;
  if (payment === "Uberzol") {
    const input = document.getElementById("uberzolSubtotalInput");
    if (input) {
      const value = parseFloat(input.value);
      if (!isNaN(value) && value > 0) {
        uberzolTotal = value;
      } else {
        showToast(
          "Error",
          "Please enter a valid Uberzol amount greater than 0.",
          "error",
        );
        return;
      }
    }
  }

  // ✅ Apply cart bundles - this preserves customPrice from cart
  const bundleResult = applyCartBundles(cart);
  let { items, subtotal, total, discount, bundleInfo } = bundleResult;

  // ✅ Log what came back from bundle calculation
  console.log(
    "🔍 Items from bundleResult:",
    items.map((i) => ({
      name: i.productName,
      customPrice: i.customPrice,
      lineTotal: i.lineTotal,
      originalTotal: i.originalTotal,
    })),
  );

  let finalTotal = total;
  let finalItems = items;

  // --- UBERZOL HANDLING ---
  if (payment === "Uberzol" && uberzolTotal !== null) {
    const proportionFactor = uberzolTotal / subtotal;
    finalItems = items.map((item) => ({
      ...item,
      lineTotal: item.lineTotal * proportionFactor,
      isBundle: item.isBundle,
      bundleDiscount: 0,
      bundleType: item.bundleType,
      customPrice: true,
    }));
    finalTotal = uberzolTotal;
  }

  // ✅ IMPORTANT: For non-Uberzol transactions, check if ANY item has customPrice
  // and make sure the lineTotal reflects the custom price
  const hasCustomPrice =
    finalItems.some((item) => item.customPrice === true) ||
    cart.some((cartItem) => cartItem.customPrice !== undefined);

  if (hasCustomPrice && payment !== "Uberzol") {
    console.log("🔄 Applying custom price logic...");

    // ✅ Recalculate lineTotal based on cart custom prices
    finalItems = finalItems.map((item) => {
      // Find the original cart item to get its custom price
      const cartItem = cart.find(
        (ci) => String(ci.productId) === String(item.productId),
      );

      // If this item has a custom price in the cart, use it
      if (cartItem && cartItem.customPrice !== undefined) {
        const customLineTotal = cartItem.customPrice;
        console.log(
          `✏️ Custom price for ${item.productName}: ${customLineTotal}`,
        );
        return {
          ...item,
          lineTotal: customLineTotal,
          customPrice: true,
        };
      }

      // If this item already has customPrice flag from bundle, keep it
      if (item.customPrice === true) {
        return item;
      }

      // Regular item - keep as is
      return item;
    });

    // ✅ Recalculate totals
    finalTotal = finalItems.reduce((sum, item) => sum + item.lineTotal, 0);
    console.log("💰 Custom total:", finalTotal);
  }

  // --- BUILD TRANSACTION ITEMS ---
  const transactionItems = [];
  let actualTotal = 0;

  for (const item of finalItems) {
    const product = getProductById(item.productId);
    if (!product) continue;

    if (product.stock < item.quantity) {
      showToast(
        "Stock Alert",
        `Only ${product.stock} unit(s) of ${product.name} remain.`,
        "error",
      );
      return;
    }

    product.stock -= item.quantity;

    // ✅ Determine if this item has a custom price
    const isCustomPrice =
      item.customPrice === true ||
      payment === "Uberzol" ||
      cart.find((ci) => String(ci.productId) === String(item.productId))
        ?.customPrice !== undefined;

    // ✅ Build transaction item with ALL fields
    transactionItems.push({
      productId: String(product.id),
      productName: product.name,
      quantity: item.quantity,
      unitPrice: product.price,
      lineTotal: item.lineTotal, // ✅ Use the lineTotal from finalItems (which has custom price)
      isBundle: item.isBundle || false,
      bundleDiscount: item.bundleDiscount || 0,
      customPrice: isCustomPrice, // ✅ This will be saved to database
    });

    actualTotal += item.lineTotal;
  }

  console.log(
    "📝 Transaction items with customPrice:",
    transactionItems.map((i) => ({
      name: i.productName,
      customPrice: i.customPrice,
      lineTotal: i.lineTotal,
    })),
  );

  const totalDiscount = subtotal - total + (payment === "Uberzol" ? 0 : 0);

  // ✅ Build the note properly
  let noteText = null;

  if (payment === "Uberzol") {
    noteText = `Uberzol total: ${currency(uberzolTotal)}`;
  } else if (hasCustomPrice) {
    noteText = `✏️ Custom prices applied`;
  } else {
    // Build note from bundle names
    const bundleNames = [];
    if (bundleInfo.bundleNames && bundleInfo.bundleNames.greenhousePreroll) {
      bundleNames.push(bundleInfo.bundleNames.greenhousePreroll);
    }
    if (bundleInfo.bundleNames && bundleInfo.bundleNames.greenhouseFlower) {
      bundleNames.push(bundleInfo.bundleNames.greenhouseFlower);
    }
    if (bundleInfo.bundleNames && bundleInfo.bundleNames.indoorPreroll) {
      bundleNames.push(bundleInfo.bundleNames.indoorPreroll);
    }
    if (bundleInfo.bundleNames && bundleInfo.bundleNames.indoorFlower) {
      bundleNames.push(bundleInfo.bundleNames.indoorFlower);
    }
    if (bundleInfo.processedItemBundles > 0) {
      bundleNames.push(
        `🎯 ${bundleInfo.processedItemBundles}× Product bundle(s)`,
      );
    }
    noteText = bundleNames.length > 0 ? bundleNames.join(" · ") : null;
  }

  const transaction = {
    payment: payment,
    subtotal: payment === "Uberzol" ? actualTotal : subtotal,
    discount: payment === "Uberzol" ? 0 : totalDiscount,
    total: actualTotal,
    items: transactionItems,
    date: new Date().toISOString(),
    note: noteText,
  };

  const validation = Validators.validateTransaction(transaction);
  if (!validation.valid) {
    showToast("Validation Error", validation.errors.join("\n"), "error");
    return;
  }

  try {
    await withRetry(() => database.saveTransaction(transaction));
    await saveProducts();

    cart = [];
    renderAll();
    setSyncStatus("Transaction recorded!", "success");

    showTransactionSummary(transaction);
  } catch (error) {
    ErrorHandler.handle(error, "checkout");
  }
}

function showTransactionSummary(transaction) {
  const itemsList = transaction.items
    .map((item) => {
      let tags = "";
      let priceDisplay = "";

      const originalPrice = item.unitPrice * item.quantity;
      const paidPrice = item.lineTotal;
      const diff = originalPrice - paidPrice;

      const isDiscount = diff > 0;
      const isMarkup = diff < 0;
      const diffAmount = Math.abs(diff);

      if (item.isBundle) {
        if (item.bundleType === "Greenhouse (3-for-150)") {
          tags += " 🌿 (3-for-150)";
        } else if (item.bundleType === "Indoor (3-for-300)") {
          tags += " 🏠 (3-for-300)";
        } else {
          tags += " 🎯";
        }
      }
      if (item.customPrice) tags += " ✏️";

      if (paidPrice !== originalPrice) {
        if (isDiscount) {
          priceDisplay = `~~${currency(originalPrice)}~~ → ${currency(paidPrice)} (Saved ${currency(diffAmount)})`;
        } else if (isMarkup) {
          priceDisplay = `~~${currency(originalPrice)}~~ → ${currency(paidPrice)} (+${currency(diffAmount)})`;
        }
      } else {
        priceDisplay = `${currency(paidPrice)}`;
      }

      return `${item.quantity}x ${item.productName}${tags} → ${priceDisplay}`;
    })
    .join("\n");

  const subtotal = transaction.items.reduce((sum, item) => {
    return sum + item.unitPrice * item.quantity;
  }, 0);

  const total = transaction.items.reduce((sum, item) => {
    return sum + item.lineTotal;
  }, 0);

  const discount = subtotal - total;

  let discountMessage = "";
  if (discount > 0) {
    const discountPercent =
      subtotal > 0 ? ((discount / subtotal) * 100).toFixed(1) : 0;
    discountMessage = `\n💸 Discount: ${currency(discount)} (${discountPercent}% off)`;
  }

  showToast(
    "✅ Transaction Complete!",
    `Payment: ${transaction.payment} | Items: ${transaction.items.length} | Total: ${currency(total)}${discountMessage}`,
    "success",
  );

  console.log(`
📋 Transaction Summary
${"=".repeat(50)}
Payment: ${transaction.payment}
Items: ${transaction.items.length}
${"-".repeat(50)}
${itemsList}
${"-".repeat(50)}
Subtotal: ${currency(subtotal)}
Discount: ${currency(discount)}
Total: ${currency(total)}
${"=".repeat(50)}
`);
}

// ----- UBERZOL SUBTOTAL EDITING -----
function updateUberzolSubtotal() {
  const uberzolGroup = document.getElementById("uberzolSubtotalGroup");
  if (!uberzolGroup || uberzolGroup.style.display === "none") return;

  const subtotal = CartCalculator.calculateSubtotal(cart);

  const input = document.getElementById("uberzolSubtotalInput");
  if (!input) return;

  if (!input.dataset.userEdited || input.dataset.userEdited === "false") {
    input.value = subtotal.toFixed(2);
  }

  const subtotalEl = document.getElementById("cartSubtotal");
  if (subtotalEl && input.value) {
    const uberzolAmount = parseFloat(input.value) || 0;
    subtotalEl.textContent = currency(uberzolAmount);
    subtotalEl.className = "total-amount uberzol";
  }
}

function resetUberzolSubtotal() {
  const input = document.getElementById("uberzolSubtotalInput");
  if (!input) return;

  const subtotal = CartCalculator.calculateSubtotal(cart);

  input.value = subtotal.toFixed(2);
  input.dataset.userEdited = "false";

  const subtotalEl = document.getElementById("cartSubtotal");
  if (subtotalEl) {
    subtotalEl.textContent = currency(subtotal);
    subtotalEl.className = "total-amount";
  }

  setSyncStatus("Uberzol subtotal reset", "info");
}

function setupUberzolSubtotalListener() {
  const input = document.getElementById("uberzolSubtotalInput");
  if (!input) return;

  input.addEventListener("input", function () {
    this.dataset.userEdited = "true";
    const value = parseFloat(this.value);

    const subtotalEl = document.getElementById("cartSubtotal");
    if (subtotalEl && !isNaN(value) && value >= 0) {
      subtotalEl.textContent = currency(value);
      subtotalEl.className = "total-amount uberzol";
    } else if (subtotalEl) {
      const calculatedSubtotal = CartCalculator.calculateSubtotal(cart);
      subtotalEl.textContent = currency(calculatedSubtotal);
      subtotalEl.className = "total-amount";
    }
  });

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
  showToast("Deleted", `${p.name} removed from inventory`, "success");
}

function resetProductForm() {
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
  document.getElementById("productName").focus();
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
  document.getElementById("productId").value = p.id;
  document.getElementById("productName").value = p.name;
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
  const id = document.getElementById("productId").value;
  const name = document.getElementById("productName").value.trim();
  const category = document.getElementById("productCategory").value.trim();
  const type = document.getElementById("productType").value.trim();
  const price = Number(document.getElementById("productPrice").value);
  const stock = Number(document.getElementById("productStock").value);
  const bundles = getBundlesFromForm();

  if (!name || !category || !type || isNaN(price) || isNaN(stock)) {
    showToast("Error", "Please complete all item fields.", "error");
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
  showToast("Success", "Product saved successfully!", "success");
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
  link.download = `sales-export-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Exported", "CSV file downloaded successfully!", "success");
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

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener("keydown", (e) => {
  // Ctrl+1 -> POS view
  if (e.ctrlKey && e.key === "1") {
    e.preventDefault();
    switchView("pos");
  }
  // Ctrl+2 -> Inventory
  if (e.ctrlKey && e.key === "2") {
    e.preventDefault();
    switchView("inventory");
  }
  // Ctrl+3 -> Sales History
  if (e.ctrlKey && e.key === "3") {
    e.preventDefault();
    switchView("sales");
  }
  // Ctrl+4 -> Dashboard
  if (e.ctrlKey && e.key === "4") {
    e.preventDefault();
    switchView("dashboard");
  }
  // Ctrl+Enter -> Checkout
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault();
    checkout();
  }
  // Escape -> Close modals
  if (e.key === "Escape") {
    document
      .querySelectorAll(".modal-overlay, .confirmation-modal-overlay")
      .forEach((modal) => {
        if (
          modal.style.display !== "none" ||
          modal.classList.contains("active")
        ) {
          modal.style.display = "none";
          modal.classList.remove("active");
        }
      });
  }
});

// ============================================
// THEME TOGGLE
// ============================================
function setupThemeToggle() {
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  // Check saved theme
  const savedTheme = localStorage.getItem("bb_theme");
  if (savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    toggle.innerHTML = '<i class="fas fa-sun"></i>';
  }

  toggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    if (currentTheme === "dark") {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("bb_theme", "light");
      toggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("bb_theme", "dark");
      toggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
  });
}

// ============================================
// FILTER CHIPS
// ============================================
function setupFilterChips() {
  const chips = document.querySelectorAll(".chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", function () {
      chips.forEach((c) => c.classList.remove("active"));
      this.classList.add("active");

      const filter = this.dataset.filter;
      const searchInput = document.getElementById("productSearch");

      if (filter === "all") {
        searchInput.value = "";
      } else {
        searchInput.value = filter;
      }
      renderProducts();
    });
  });
}

// ----- EDIT TRANSACTION -----
async function editTransaction(transactionId) {
  const transaction = transactions.find((tx) => tx.id === transactionId);
  if (!transaction) {
    showToast("Error", "Transaction not found.", "error");
    return;
  }

  const modal = document.getElementById("editTransactionModal");
  const content = document.getElementById("editTransactionContent");

  let itemsHtml = transaction.items
    .map((item, index) => {
      const originalPrice = item.unitPrice * item.quantity;
      return `
      <div class="edit-item-row mb-2" data-index="${index}">
        <div class="edit-item-controls">
          <span class="fw-bold" style="min-width:120px;">${item.productName}</span>
          <input type="hidden" class="edit-product-id" value="${item.productId}">
          <input type="hidden" class="edit-product-name" value="${item.productName}">
          <span class="text-muted small">Qty:</span>
          <input type="number" class="form-control qty-input edit-qty" 
                 value="${item.quantity}" min="1" data-index="${index}">
          <span class="text-muted small">Price:</span>
          <input type="number" class="form-control price-input edit-price" 
                 value="${item.lineTotal}" step="0.01" min="0" data-index="${index}">
          <button class="edit-item-remove remove-edit-item" data-index="${index}">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="edit-item-original">
          Original: ${currency(originalPrice)} | Unit: ${currency(item.unitPrice)} × ${item.quantity}
        </div>
      </div>
    `;
    })
    .join("");

  content.innerHTML = `
    <form id="editTransactionForm">
      <div class="mb-3">
        <label class="form-label fw-bold">Payment Method</label>
        <select id="editPaymentMethod" class="form-control">
          <option value="Cash" ${transaction.payment === "Cash" ? "selected" : ""}>Cash</option>
          <option value="Yoco" ${transaction.payment === "Yoco" ? "selected" : ""}>Yoco</option>
          <option value="EFT" ${transaction.payment === "EFT" ? "selected" : ""}>EFT</option>
          <option value="Uberzol" ${transaction.payment === "Uberzol" ? "selected" : ""}>Uberzol</option>
        </select>
      </div>
      
      <div class="mb-3">
        <label class="form-label fw-bold">Items</label>
        <div id="editItemsContainer">
          ${itemsHtml}
        </div>
        <button type="button" id="addEditItemBtn" class="btn btn-outline-secondary btn-sm mt-2">
          <i class="fas fa-plus me-1"></i> Add Item
        </button>
      </div>
      
      <div class="mb-3">
        <label class="form-label fw-bold">Note</label>
        <input type="text" id="editNote" class="form-control" value="${transaction.note || ""}" placeholder="Optional note...">
      </div>
      
      <div class="d-flex justify-content-between align-items-center border-top pt-3">
        <div>
          <strong>Subtotal: </strong><span id="editSubtotal">${currency(transaction.subtotal)}</span>
          <br>
          <strong>Discount: </strong><span id="editDiscount">${currency(transaction.discount)}</span>
          <br>
          <strong>Total: </strong><span id="editTotal" class="text-success fw-bold">${currency(transaction.total)}</span>
        </div>
        <div class="d-flex gap-2">
          <button type="button" id="cancelEditBtn" class="btn btn-outline-secondary">Cancel</button>
          <button type="submit" class="btn btn-success">
            <i class="fas fa-save me-2"></i>Save Changes
          </button>
        </div>
      </div>
    </form>
  `;

  modal.classList.add("active");
  setupEditFormListeners(transactionId);
}

function setupEditFormListeners(transactionId) {
  const form = document.getElementById("editTransactionForm");
  const cancelBtn = document.getElementById("cancelEditBtn");
  const addItemBtn = document.getElementById("addEditItemBtn");
  const modal = document.getElementById("editTransactionModal");

  cancelBtn.addEventListener("click", () => {
    modal.classList.remove("active");
  });

  modal.addEventListener("click", function (e) {
    if (e.target === this) {
      this.classList.remove("active");
    }
  });

  addItemBtn.addEventListener("click", function () {
    addEditItemRow();
  });

  document.querySelectorAll(".remove-edit-item").forEach((btn) => {
    btn.addEventListener("click", function () {
      const rows = document.querySelectorAll(".edit-item-row");
      if (rows.length > 1) {
        this.closest(".edit-item-row").remove();
        updateEditTotals();
      } else {
        showToast(
          "Warning",
          "Transaction must have at least one item.",
          "warning",
        );
      }
    });
  });

  document.querySelectorAll(".edit-qty, .edit-price").forEach((input) => {
    input.addEventListener("input", updateEditTotals);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    saveEditedTransaction(transactionId);
  });
}

function addEditItemRow() {
  const container = document.getElementById("editItemsContainer");
  const index = document.querySelectorAll(".edit-item-row").length;

  const row = document.createElement("div");
  row.className = "edit-item-row mb-2";
  row.dataset.index = index;

  row.innerHTML = `
    <div class="edit-item-controls">
      <select class="form-control edit-product-select" style="min-width:150px;">
        <option value="">Select Product</option>
        ${products.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}
      </select>
      <input type="hidden" class="edit-product-id" value="">
      <input type="hidden" class="edit-product-name" value="">
      <span class="text-muted small">Qty:</span>
      <input type="number" class="form-control qty-input edit-qty" 
             value="1" min="1" data-index="${index}">
      <span class="text-muted small">Price:</span>
      <input type="number" class="form-control price-input edit-price" 
             value="0.00" step="0.01" min="0" data-index="${index}">
      <button class="edit-item-remove remove-edit-item" data-index="${index}">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="edit-item-original">New item added</div>
  `;

  const select = row.querySelector(".edit-product-select");
  const hiddenId = row.querySelector(".edit-product-id");
  const hiddenName = row.querySelector(".edit-product-name");

  select.addEventListener("change", () => {
    hiddenId.value = select.value;
    const product = getProductById(select.value);
    hiddenName.value = product ? product.name : "";
    if (product) {
      const priceInput = row.querySelector(".edit-price");
      priceInput.value = product.price;
      updateEditTotals();
    }
  });

  container.appendChild(row);

  row.querySelectorAll(".edit-qty, .edit-price").forEach((input) => {
    input.addEventListener("input", updateEditTotals);
  });

  row.querySelector(".remove-edit-item").addEventListener("click", function () {
    const rows = document.querySelectorAll(".edit-item-row");
    if (rows.length > 1) {
      this.closest(".edit-item-row").remove();
      updateEditTotals();
    } else {
      showToast(
        "Warning",
        "Transaction must have at least one item.",
        "warning",
      );
    }
  });

  updateEditTotals();
}

function updateEditTotals() {
  let subtotal = 0;
  const rows = document.querySelectorAll(".edit-item-row");

  rows.forEach((row) => {
    const price = parseFloat(row.querySelector(".edit-price").value) || 0;
    subtotal += price;
  });

  const discount = 0;
  const total = subtotal - discount;

  document.getElementById("editSubtotal").textContent = currency(subtotal);
  document.getElementById("editDiscount").textContent = currency(discount);
  document.getElementById("editTotal").textContent = currency(total);
}

// ============================================
// SAVE EDITED TRANSACTION (FIXED)
// ============================================
async function saveEditedTransaction(transactionId) {
  try {
    const originalTx = transactions.find((tx) => tx.id === transactionId);
    if (!originalTx) {
      showToast("Error", "Transaction not found.", "error");
      return;
    }

    const payment = document.getElementById("editPaymentMethod").value;
    const note = document.getElementById("editNote").value;
    const rows = document.querySelectorAll(".edit-item-row");

    if (rows.length === 0) {
      showToast("Error", "Transaction must have at least one item.", "error");
      return;
    }

    // FIRST: Restore original stock
    for (const item of originalTx.items) {
      const product = getProductById(item.productId);
      if (product) {
        product.stock += item.quantity;
      }
    }
    await saveProducts();

    // Process edited items
    const items = [];
    let subtotal = 0;
    let total = 0;

    for (const row of rows) {
      const productId = row.querySelector(".edit-product-id")?.value || "";
      const productName =
        row.querySelector(".edit-product-name")?.value ||
        row.querySelector(".edit-product-select")?.value
          ? row.querySelector(".edit-product-select")?.options?.[
              row.querySelector(".edit-product-select")?.selectedIndex
            ]?.text || "Unknown Item"
          : "Unknown Item";
      const qty = parseInt(row.querySelector(".edit-qty").value) || 0;
      const lineTotal = parseFloat(row.querySelector(".edit-price").value) || 0;
      const unitPrice = qty > 0 ? lineTotal / qty : 0;

      if (qty <= 0) {
        showToast("Error", "Quantity must be greater than 0.", "error");
        return;
      }
      if (lineTotal < 0) {
        showToast("Error", "Price cannot be negative.", "error");
        return;
      }

      const product = getProductById(productId);
      const originalTotal = product ? product.price * qty : lineTotal;

      items.push({
        productId: productId || originalTx.items[0]?.productId || "unknown",
        productName: productName || "Unknown Item",
        quantity: qty,
        unitPrice: unitPrice,
        lineTotal: lineTotal,
        isBundle: false,
        bundleDiscount: 0,
        bundleType: null,
        customPrice: true,
      });

      subtotal += originalTotal;
      total += lineTotal;
    }

    // Delete old transaction and items
    await database.client
      .from("transaction_items")
      .delete()
      .eq("transaction_id", transactionId);

    await database.client.from("transactions").delete().eq("id", transactionId);

    // Create new transaction with updated data
    const totalDiscount = subtotal - total;

    const newTransaction = {
      payment: payment,
      subtotal: subtotal,
      discount: totalDiscount > 0 ? totalDiscount : 0,
      total: total,
      items: items,
      date: originalTx.date,
      note: note || null,
    };

    const validation = Validators.validateTransaction(newTransaction);
    if (!validation.valid) {
      showToast("Validation Error", validation.errors.join("\n"), "error");
      return;
    }

    await withRetry(() => database.saveTransaction(newTransaction));

    // FINALLY: Deduct new stock
    for (const item of items) {
      const product = getProductById(item.productId);
      if (product) {
        product.stock -= item.quantity;
      }
    }
    await saveProducts();

    // Reload data
    await loadData();
    renderAll();

    document.getElementById("editTransactionModal").classList.remove("active");
    showToast("Success", "Transaction updated successfully!", "success");
  } catch (error) {
    console.error("Error saving edited transaction:", error);
    ErrorHandler.handle(error, "saveEditedTransaction");
  }
}

// ----- DELETE TRANSACTION (FIXED) -----
async function deleteTransaction(transactionId) {
  if (
    !confirm(
      "Are you sure you want to delete this transaction? This cannot be undone.",
    )
  ) {
    return;
  }

  try {
    const transaction = transactions.find((tx) => tx.id === transactionId);

    // Restore stock
    if (transaction && transaction.items) {
      for (const item of transaction.items) {
        const product = getProductById(item.productId);
        if (product) {
          product.stock += item.quantity;
        }
      }
      await saveProducts();
    }

    await withRetry(() => database.deleteTransaction(transactionId));

    await loadData();
    renderAll();

    showToast("Success", "Transaction deleted successfully!", "success");
  } catch (error) {
    console.error("Error deleting transaction:", error);
    ErrorHandler.handle(error, "deleteTransaction");
  }
}

// ============================================
// CLEAR DAY FUNCTION
// ============================================
function showClearDayModal() {
  const modal = document.getElementById("clearDayModal");
  if (modal) modal.classList.add("active");
}

function hideClearDayModal() {
  const modal = document.getElementById("clearDayModal");
  if (modal) modal.classList.remove("active");
}

async function confirmClearDay() {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const todayTransactions = transactions.filter((tx) =>
      tx.date?.startsWith(today),
    );

    if (todayTransactions.length === 0) {
      showToast("No sales found", "No sales records for today to clear.");
      hideClearDayModal();
      return;
    }

    console.log(
      `Clearing ${todayTransactions.length} transactions for ${today}...`,
    );

    showToast(
      "Processing...",
      `Deleting ${todayTransactions.length} transactions...`,
      "info",
    );

    const transactionIds = todayTransactions.map((tx) => tx.id);

    let deletedCount = 0;
    let errorCount = 0;

    for (const txId of transactionIds) {
      try {
        await withRetry(() => database.deleteTransaction(txId));
        deletedCount++;

        if (deletedCount % 10 === 0) {
          showToast(
            "Processing...",
            `Deleted ${deletedCount}/${todayTransactions.length} transactions...`,
            "info",
          );
        }
      } catch (err) {
        console.error(`Failed to delete transaction ${txId}:`, err);
        errorCount++;
      }
    }

    transactions = transactions.filter((tx) => !tx.date?.startsWith(today));

    sales = [];
    transactions.forEach((tx) => {
      tx.items.forEach((item) => {
        sales.push({
          id: tx.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.unitPrice,
          payment: tx.payment,
          total: item.lineTotal,
          date: tx.date,
          note: tx.note,
          isBundle: item.isBundle,
          bundleDiscount: item.bundleDiscount,
        });
      });
    });

    renderAll();

    if (errorCount === 0) {
      showToast(
        "Day Cleared! 🧹",
        `Successfully cleared ${deletedCount} transactions for ${new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}`,
        "success",
      );
    } else {
      showToast(
        "Partial Clear ⚠️",
        `Cleared ${deletedCount} transactions, but ${errorCount} failed.`,
        "warning",
      );
    }

    hideClearDayModal();
    setSyncStatus(`Cleared ${deletedCount} transactions for today`, "success");
  } catch (error) {
    console.error("Error clearing day:", error);
    ErrorHandler.handle(error, "clearDay");
  }
}

// ----- TOAST NOTIFICATION -----
function showToast(title, message, type = "success") {
  let toast = document.getElementById("toastNotification");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toastNotification";
    toast.className = "toast-notification";
    toast.innerHTML = `
      <div class="toast-icon">
        <i class="fas fa-check-circle"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title"></div>
        <div class="toast-message"></div>
      </div>
      <button class="toast-close">&times;</button>
    `;
    document.body.appendChild(toast);

    toast.querySelector(".toast-close").addEventListener("click", () => {
      toast.classList.remove("show");
    });
  }

  const icon = toast.querySelector(".toast-icon i");
  const titleEl = toast.querySelector(".toast-title");
  const messageEl = toast.querySelector(".toast-message");

  toast.className = "toast-notification";

  if (type === "error") {
    toast.classList.add("error");
    icon.className = "fas fa-exclamation-circle";
  } else if (type === "warning") {
    toast.classList.add("warning");
    icon.className = "fas fa-exclamation-triangle";
  } else if (type === "info") {
    toast.classList.add("info");
    icon.className = "fas fa-spinner fa-pulse";
  } else {
    toast.classList.add("success");
    icon.className = "fas fa-check-circle";
  }

  titleEl.textContent = title;
  messageEl.textContent = message;

  toast.classList.add("show");

  const duration = type === "info" ? 8000 : 4000;
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove("show");
  }, duration);

  toast.onclick = function (e) {
    if (e.target.closest(".toast-close")) return;
    this.classList.remove("show");
    clearTimeout(this._timeout);
  };
}

// ----- DEBOUNCE HELPER -----
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============================================
// INITIALIZE APP
// ============================================
async function initializeApp() {
  setSyncStatus("Initializing database...", "info");

  const dbInitialized = await initDatabase();
  if (!dbInitialized) {
    setSyncStatus("Failed to connect to database. Please refresh.", "danger");
    showToast(
      "Connection Error",
      "Failed to connect to database. Please check your internet connection.",
      "error",
    );
    return;
  }

  await loadData();
  renderAll();
  setupThemeToggle();
  setupFilterChips();
  setupUberzolSubtotalListener();
  setSyncStatus("Connected", "success");
  showToast("Welcome", "🌿 Bud & Brush POS is ready!", "success");
}

// ----- INIT -----
async function init() {
  // Check if supabase is already loaded
  if (window.supabase) {
    window.supabaseJs = window.supabase;
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
  const debouncedSearch = debounce(() => renderProducts(), 300);
  document
    .getElementById("productSearch")
    .addEventListener("input", debouncedSearch);
  document.getElementById("checkoutBtn").addEventListener("click", checkout);

  // Payment method handler
  document
    .getElementById("paymentMethod")
    .addEventListener("change", function () {
      const uberzolGroup = document.getElementById("uberzolSubtotalGroup");
      const uberzolInput = document.getElementById("uberzolSubtotalInput");
      const subtotalEl = document.getElementById("cartSubtotal");

      if (this.value === "Uberzol") {
        uberzolGroup.classList.add("show");
        if (uberzolInput) {
          const subtotal = CartCalculator.calculateSubtotal(cart);
          uberzolInput.value = subtotal.toFixed(2);
          uberzolInput.dataset.userEdited = "false";
        }
        if (subtotalEl) {
          subtotalEl.className = "total-amount uberzol";
        }
      } else {
        uberzolGroup.classList.remove("show");
        if (subtotalEl) {
          const subtotal = CartCalculator.calculateSubtotal(cart);
          subtotalEl.textContent = currency(subtotal);
          subtotalEl.className = "total-amount";
        }
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

  // Clear day button
  document
    .getElementById("clearDayBtn")
    .addEventListener("click", showClearDayModal);

  document
    .getElementById("cancelClearDay")
    .addEventListener("click", hideClearDayModal);
  document
    .getElementById("confirmClearDay")
    .addEventListener("click", confirmClearDay);
}

// Start the app when DOM is ready
document.addEventListener("DOMContentLoaded", init);

console.log("🌿 Bud & Brush POS loaded");
console.log("📦 Data stored in Supabase");
