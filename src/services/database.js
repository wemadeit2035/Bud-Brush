import { createClient } from "@supabase/supabase-js";

const PRODUCTS_KEY = "budbrush_products";
const TRANSACTIONS_KEY = "budbrush_transactions";
const ARCHIVES_KEY = "budbrush_archives";

let supabaseClient = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials missing, using localStorage fallback");
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseClient;
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    return null;
  }
}

// ===== LOCAL STORAGE HELPERS =====
function readLocalStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error(`Failed to read ${key} from local storage:`, error);
    return [];
  }
}

function writeLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to write ${key} to local storage:`, error);
    return false;
  }
}

// ===== DATA NORMALIZATION =====
function normalizeProduct(product) {
  return {
    id: String(product.id || product.product_id || ""),
    name: product.name || "",
    category: product.category || "",
    type: product.type || "",
    price: Number(product.price) || 0,
    stock: Number(product.stock) || 0,
    bundles: Array.isArray(product.bundles) ? product.bundles : [],
  };
}

function normalizeTransaction(transaction) {
  const items = Array.isArray(transaction.items)
    ? transaction.items
    : Array.isArray(transaction.transaction_items)
      ? transaction.transaction_items.map((item) => ({
          productId: item.product_id || item.productId || "",
          productName: item.product_name || item.productName || "",
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unit_price || item.unitPrice) || 0,
          lineTotal: Number(item.line_total || item.lineTotal) || 0,
          isBundle: Boolean(item.is_bundle || item.isBundle),
          bundleDiscount:
            Number(item.bundle_discount || item.bundleDiscount) || 0,
          customPrice:
            item.custom_price !== undefined &&
            item.custom_price !== null &&
            item.custom_price !== false
              ? Number(item.custom_price)
              : undefined,
        }))
      : [];

  return {
    id: String(transaction.id || transaction.transaction_id || ""),
    payment: transaction.payment || "Cash",
    total: Number(transaction.total || transaction.subtotal || 0),
    items: items,
    date:
      transaction.transaction_date ||
      transaction.date ||
      new Date().toISOString(),
    note: transaction.note || "",
    itemCount: Number(
      transaction.item_count || transaction.itemCount || items.length,
    ),
    subtotal: Number(transaction.subtotal || transaction.total || 0),
    discount: Number(transaction.discount || 0),
  };
}

function normalizeArchive(archive) {
  return {
    archive_date: archive.archive_date || new Date().toISOString().slice(0, 10),
    total_revenue: Number(archive.total_revenue || archive.totalRevenue || 0),
    cash_total: Number(archive.cash_total || archive.cashTotal || 0),
    yoco_total: Number(archive.yoco_total || archive.yocoTotal || 0),
    eft_total: Number(archive.eft_total || archive.eftTotal || 0),
    uberzol_total: Number(archive.uberzol_total || archive.uberzolTotal || 0),
    transaction_count: Number(
      archive.transaction_count || archive.transactionCount || 0,
    ),
    item_count: Number(archive.item_count || archive.itemCount || 0),
    data: archive.data || {},
  };
}

function normalizeArchiveForDb(archive) {
  return {
    archive_date: archive.archive_date || new Date().toISOString().slice(0, 10),
    total_revenue: Number(archive.total_revenue || 0),
    cash_total: Number(archive.cash_total || 0),
    yoco_total: Number(archive.yoco_total || 0),
    eft_total: Number(archive.eft_total || 0),
    uberzol_total: Number(archive.uberzol_total || 0),
    transaction_count: Number(archive.transaction_count || 0),
    item_count: Number(archive.item_count || 0),
    data: archive.data || {},
  };
}

// ===== GENERATE UNIQUE ID =====
function generateId() {
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================
// PRODUCT FUNCTIONS
// ============================================

export async function loadProducts() {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        return data.map(normalizeProduct);
      }
    } catch (error) {
      console.error("Failed to load products from Supabase:", error);
    }
  }

  return readLocalStorage(PRODUCTS_KEY);
}

export async function saveProducts(products) {
  const supabase = getSupabaseClient();
  const normalizedProducts = (products || []).map(normalizeProduct);

  // Always save to localStorage as backup
  writeLocalStorage(PRODUCTS_KEY, normalizedProducts);

  if (supabase && normalizedProducts.length > 0) {
    try {
      const { error } = await supabase
        .from("products")
        .upsert(normalizedProducts, { onConflict: "id" });

      if (error) {
        console.error("Supabase upsert error:", error);
        throw error;
      }
      console.log(`✅ Saved ${normalizedProducts.length} products to Supabase`);
      return true;
    } catch (error) {
      console.error("Failed to save products to Supabase:", error);
      return true;
    }
  }

  console.log(
    `💾 Saved ${normalizedProducts.length} products to localStorage only`,
  );
  return true;
}

// ============================================
// TRANSACTION FUNCTIONS
// ============================================

export async function loadTransactions() {
  console.log("🔍 Loading transactions...");
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data: transactionRows, error: transactionError } = await supabase
        .from("transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (transactionError) {
        console.error("❌ Transaction load error:", transactionError);
        throw transactionError;
      }

      console.log(
        `✅ Loaded ${transactionRows?.length || 0} transactions from Supabase`,
      );

      if (!transactionRows || transactionRows.length === 0) {
        return [];
      }

      const transactionIds = transactionRows.map((item) => item.id);
      const { data: itemRows, error: itemsError } = await supabase
        .from("transaction_items")
        .select("*")
        .in("transaction_id", transactionIds);

      if (itemsError) {
        console.error("❌ Transaction items load error:", itemsError);
        throw itemsError;
      }

      const itemsByTransaction = {};
      (itemRows || []).forEach((item) => {
        if (!itemsByTransaction[item.transaction_id]) {
          itemsByTransaction[item.transaction_id] = [];
        }
        itemsByTransaction[item.transaction_id].push(item);
      });

      const transactions = transactionRows.map((transaction) =>
        normalizeTransaction({
          ...transaction,
          transaction_items: itemsByTransaction[transaction.id] || [],
        }),
      );

      console.log(
        `✅ Processed ${transactions.length} transactions with items`,
      );
      return transactions;
    } catch (error) {
      console.error("❌ Failed to load transactions from Supabase:", error);
    }
  }

  console.log("📦 Loading transactions from localStorage fallback");
  const localData = readLocalStorage(TRANSACTIONS_KEY);
  console.log(`📦 Loaded ${localData.length} transactions from localStorage`);
  return localData;
}

export async function saveTransactions(transactions) {
  console.log(`💾 Saving ${transactions?.length || 0} transactions...`);

  const supabase = getSupabaseClient();
  const normalizedTransactions = (transactions || []).map(normalizeTransaction);

  // Always save to localStorage as backup
  writeLocalStorage(TRANSACTIONS_KEY, normalizedTransactions);

  if (supabase) {
    try {
      // If there are no transactions, delete everything
      if (normalizedTransactions.length === 0) {
        console.log("🗑️ No transactions, clearing all...");

        // Get all transaction IDs first
        const { data: allTransactions, error: fetchError } = await supabase
          .from("transactions")
          .select("id");

        if (fetchError) {
          console.error(
            "❌ Error fetching transactions to delete:",
            fetchError,
          );
          throw fetchError;
        }

        if (allTransactions && allTransactions.length > 0) {
          const ids = allTransactions.map((t) => t.id);

          // Delete items for all transactions
          const { error: itemsError } = await supabase
            .from("transaction_items")
            .delete()
            .in("transaction_id", ids);

          if (itemsError) {
            console.error("❌ Error clearing items:", itemsError);
            throw itemsError;
          }

          // Delete all transactions
          const { error: txError } = await supabase
            .from("transactions")
            .delete()
            .in("id", ids);

          if (txError) {
            console.error("❌ Error clearing transactions:", txError);
            throw txError;
          }
        }

        console.log("✅ All transactions cleared from Supabase");
        return true;
      }

      // Process each transaction individually
      for (const tx of normalizedTransactions) {
        console.log(`💾 Saving transaction ${tx.id}...`);

        const transactionData = {
          id: tx.id,
          transaction_date: tx.date,
          payment: tx.payment,
          subtotal: tx.subtotal || tx.total || 0,
          discount: tx.discount || 0,
          total: tx.total || 0,
          note: tx.note || null,
          item_count: tx.items.length,
        };

        const { error: txError } = await supabase
          .from("transactions")
          .upsert(transactionData, { onConflict: "id" });

        if (txError) {
          console.error(`❌ Error saving transaction ${tx.id}:`, txError);
          throw txError;
        }

        const itemData = tx.items.map((item) => ({
          transaction_id: tx.id,
          product_id: String(item.productId || ""),
          product_name: item.productName || "",
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unitPrice) || 0,
          line_total: Number(item.lineTotal) || 0,
          is_bundle: Boolean(item.isBundle),
          bundle_discount: Number(item.bundleDiscount) || 0,
          custom_price: Boolean(
            item.customPrice === true ||
            item.customPrice === "true" ||
            (typeof item.customPrice === "boolean" &&
              item.customPrice === true),
          ),
        }));

        // Delete existing items for this transaction
        const { error: deleteError } = await supabase
          .from("transaction_items")
          .delete()
          .eq("transaction_id", tx.id);

        if (deleteError) {
          console.error(`❌ Error deleting items for ${tx.id}:`, deleteError);
          throw deleteError;
        }

        // Insert new items
        if (itemData.length > 0) {
          const { error: insertError } = await supabase
            .from("transaction_items")
            .insert(itemData);

          if (insertError) {
            console.error(
              `❌ Error inserting items for ${tx.id}:`,
              insertError,
            );
            throw insertError;
          }
        }

        console.log(`✅ Transaction ${tx.id} saved successfully`);
      }

      console.log("✅ All transactions saved to Supabase");
      return true;
    } catch (error) {
      console.error("❌ Failed to save transactions to Supabase:", error);
      return true;
    }
  }

  console.log(
    `💾 Saved ${normalizedTransactions.length} transactions to localStorage only`,
  );
  return true;
}

export async function saveTransaction(transaction) {
  console.log("💾 Saving single transaction...");
  const transactions = await loadTransactions();
  const normalizedTx = normalizeTransaction(transaction);

  // Generate ID if not provided
  if (!normalizedTx.id) {
    normalizedTx.id = generateId();
    console.log(`📝 Generated new ID: ${normalizedTx.id}`);
  }

  console.log(`📝 Transaction ID: ${normalizedTx.id}`);
  console.log(`📝 Items: ${normalizedTx.items.length}`);

  // Check if transaction already exists
  const existingIndex = transactions.findIndex(
    (tx) => tx.id === normalizedTx.id,
  );
  if (existingIndex >= 0) {
    console.log(`🔄 Updating existing transaction ${normalizedTx.id}`);
    transactions[existingIndex] = normalizedTx;
  } else {
    console.log(`➕ Adding new transaction ${normalizedTx.id}`);
    transactions.push(normalizedTx);
  }

  const result = await saveTransactions(transactions);
  console.log(`✅ Transaction save ${result ? "successful" : "failed"}`);
  return result;
}

export async function deleteTransaction(transactionId) {
  console.log(`🗑️ DELETING transaction ${transactionId}...`);

  if (!transactionId) {
    console.error("❌ No transaction ID provided");
    return false;
  }

  const supabase = getSupabaseClient();

  // ALWAYS delete from localStorage first
  console.log("📦 Removing from localStorage...");
  const transactions = await loadTransactions();
  const updatedTransactions = transactions.filter(
    (tx) => tx.id !== transactionId,
  );
  writeLocalStorage(TRANSACTIONS_KEY, updatedTransactions);
  console.log(`📦 localStorage updated`);

  // Then delete from Supabase
  if (supabase) {
    try {
      console.log(`🗑️ Deleting from Supabase...`);

      // Step 1: Delete transaction items (child records)
      console.log(`🗑️ Deleting items for transaction ${transactionId}...`);
      const { error: itemsError } = await supabase
        .from("transaction_items")
        .delete()
        .eq("transaction_id", transactionId);

      if (itemsError) {
        console.error("❌ Error deleting items:", itemsError);
        // Continue anyway to try deleting the transaction
      } else {
        console.log(`✅ Deleted items from transaction_items`);
      }

      // Step 2: Delete the transaction (parent record)
      console.log(`🗑️ Deleting transaction ${transactionId}...`);
      const { error: txError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId);

      if (txError) {
        console.error("❌ Error deleting transaction:", txError);
        throw txError;
      }

      console.log(`✅ Transaction ${transactionId} deleted from Supabase`);
      return true;
    } catch (error) {
      console.error("❌ Failed to delete from Supabase:", error);
      return true;
    }
  }

  console.log(`✅ Transaction ${transactionId} deleted from localStorage only`);
  return true;
}

// ============================================
// ARCHIVE FUNCTIONS
// ============================================

export async function loadArchives() {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("daily_sales_archive")
        .select("*")
        .order("archive_date", { ascending: false });

      if (error) throw error;
      return (data || []).map(normalizeArchive);
    } catch (error) {
      console.error("Failed to load archives from Supabase:", error);
    }
  }

  return readLocalStorage(ARCHIVES_KEY);
}

export async function saveArchives(archives) {
  const supabase = getSupabaseClient();
  const normalizedArchives = (archives || []).map(normalizeArchiveForDb);

  // Always save to localStorage as backup
  writeLocalStorage(ARCHIVES_KEY, normalizedArchives);

  if (supabase && normalizedArchives.length > 0) {
    try {
      const { error } = await supabase
        .from("daily_sales_archive")
        .upsert(normalizedArchives, { onConflict: "archive_date" });

      if (error) throw error;
      console.log(`✅ Saved ${normalizedArchives.length} archives to Supabase`);
      return true;
    } catch (error) {
      console.error("Failed to save archives to Supabase:", error);
      return true;
    }
  }

  console.log(
    `💾 Saved ${normalizedArchives.length} archives to localStorage only`,
  );
  return true;
}

export async function saveArchive(archive) {
  const archives = await loadArchives();
  const normalized = normalizeArchive(archive);
  const existingIndex = archives.findIndex(
    (item) => item.archive_date === normalized.archive_date,
  );

  if (existingIndex >= 0) {
    archives[existingIndex] = normalized;
  } else {
    archives.unshift(normalized);
  }

  return saveArchives(archives);
}
