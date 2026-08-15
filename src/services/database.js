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
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseClient;
  } catch (error) {
    return null;
  }
}

// ===== LOCAL STORAGE HELPERS =====
function readLocalStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function writeLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
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
    memberId: transaction.member_id || transaction.memberId || null,
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

function normalizeMember(member) {
  return {
    id: String(member.id || ""),
    membershipNumber: String(
      member.membership_number || member.membershipNumber || "",
    ),
    firstName: member.first_name || member.firstName || "",
    lastName: member.last_name || member.lastName || "",
    phone: member.phone || "",
    email: member.email || "",
    idNumber: member.id_number || member.idNumber || "",
    dateOfBirth: member.date_of_birth || member.dateOfBirth || "",
    status: member.status || "active",
    consentVersion: member.consent_version || member.consentVersion || "",
    consentSignedAt:
      member.consent_signed_at ||
      member.consentSignedAt ||
      member.signed_at ||
      "",
    createdBy: member.created_by || member.createdBy || "",
    updatedBy: member.updated_by || member.updatedBy || "",
    createdAt: member.created_at || member.createdAt || "",
    updatedAt: member.updated_at || member.updatedAt || "",
  };
}

function buildMemberPayload(member, includeAuditFields = true) {
  const payload = {
    id: member.id || undefined,
    membership_number: String(member.membershipNumber || "").trim(),
    first_name: String(member.firstName || "").trim(),
    last_name: String(member.lastName || "").trim(),
    phone: String(member.phone || "").trim(),
    email: String(member.email || "").trim() || null,
    id_number: String(member.idNumber || "").trim() || null,
    date_of_birth: member.dateOfBirth || null,
    status: String(member.status || "active").trim() || "active",
    consent_version: String(member.consentVersion || "").trim() || null,
    consent_signed_at: member.consentSignedAt || null,
  };

  if (includeAuditFields) {
    payload.created_by = String(member.createdBy || "").trim() || null;
    payload.updated_by = String(member.updatedBy || "").trim() || null;
  }

  return payload;
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
    } catch (error) {}
  }

  return readLocalStorage(PRODUCTS_KEY);
}

export async function saveProducts(products) {
  const supabase = getSupabaseClient();
  const normalizedProducts = (products || []).map(normalizeProduct);

  // Always save to localStorage as backup
  writeLocalStorage(PRODUCTS_KEY, normalizedProducts);

  if (supabase) {
    try {
      // Keep Supabase aligned with the current client list:
      // upsert current products, remove products no longer present.
      const { data: existingRows, error: existingError } = await supabase
        .from("products")
        .select("id");

      if (existingError) {
        throw existingError;
      }

      const incomingIds = new Set(
        normalizedProducts.map((product) => product.id),
      );
      const staleIds = (existingRows || [])
        .map((row) => String(row.id))
        .filter((id) => !incomingIds.has(id));

      if (normalizedProducts.length > 0) {
        const { error } = await supabase
          .from("products")
          .upsert(normalizedProducts, { onConflict: "id" });

        if (error) {
          throw error;
        }
      }

      if (staleIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("products")
          .delete()
          .in("id", staleIds);

        if (deleteError) {
          throw deleteError;
        }
      }
      return true;
    } catch (error) {
      return true;
    }
  }

  return true;
}

// ============================================
// TRANSACTION FUNCTIONS
// ============================================

export async function loadTransactions() {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data: transactionRows, error: transactionError } = await supabase
        .from("transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (transactionError) {
        throw transactionError;
      }

      if (!transactionRows || transactionRows.length === 0) {
        return [];
      }

      const transactionIds = transactionRows.map((item) => item.id);
      const { data: itemRows, error: itemsError } = await supabase
        .from("transaction_items")
        .select("*")
        .in("transaction_id", transactionIds);

      if (itemsError) {
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
      return transactions;
    } catch (error) {}
  }

  const localData = readLocalStorage(TRANSACTIONS_KEY);
  return localData;
}

export async function saveTransactions(transactions) {
  const supabase = getSupabaseClient();
  const normalizedTransactions = (transactions || []).map(normalizeTransaction);

  // Always save to localStorage as backup
  writeLocalStorage(TRANSACTIONS_KEY, normalizedTransactions);

  if (supabase) {
    try {
      // If there are no transactions, delete everything
      if (normalizedTransactions.length === 0) {
        // Get all transaction IDs first
        const { data: allTransactions, error: fetchError } = await supabase
          .from("transactions")
          .select("id");

        if (fetchError) {
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
            throw itemsError;
          }

          // Delete all transactions
          const { error: txError } = await supabase
            .from("transactions")
            .delete()
            .in("id", ids);

          if (txError) {
            throw txError;
          }
        }
        return true;
      }

      // Process each transaction individually
      for (const tx of normalizedTransactions) {
        const transactionData = {
          id: tx.id,
          member_id: tx.memberId || null,
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
          throw deleteError;
        }

        // Insert new items
        if (itemData.length > 0) {
          const { error: insertError } = await supabase
            .from("transaction_items")
            .insert(itemData);

          if (insertError) {
            throw insertError;
          }
        }
      }

      return true;
    } catch (error) {
      return true;
    }
  }

  return true;
}

export async function saveTransaction(transaction) {
  const transactions = await loadTransactions();
  const normalizedTx = normalizeTransaction(transaction);

  // Generate ID if not provided
  if (!normalizedTx.id) {
    normalizedTx.id = generateId();
  }

  // Check if transaction already exists
  const existingIndex = transactions.findIndex(
    (tx) => tx.id === normalizedTx.id,
  );
  if (existingIndex >= 0) {
    transactions[existingIndex] = normalizedTx;
  } else {
    transactions.push(normalizedTx);
  }

  const result = await saveTransactions(transactions);
  return result;
}

export async function deleteTransaction(transactionId) {
  if (!transactionId) {
    return false;
  }

  const supabase = getSupabaseClient();

  // ALWAYS delete from localStorage first
  const transactions = await loadTransactions();
  const updatedTransactions = transactions.filter(
    (tx) => tx.id !== transactionId,
  );
  writeLocalStorage(TRANSACTIONS_KEY, updatedTransactions);

  // Then delete from Supabase
  if (supabase) {
    try {
      // Step 1: Delete transaction items (child records)
      const { error: itemsError } = await supabase
        .from("transaction_items")
        .delete()
        .eq("transaction_id", transactionId);

      if (itemsError) {
        // Continue anyway to try deleting the transaction
      }

      // Step 2: Delete the transaction (parent record)
      const { error: txError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId);

      if (txError) {
        throw txError;
      }
      return true;
    } catch (error) {
      return true;
    }
  }

  return true;
}

// ============================================
// MEMBER FUNCTIONS
// ============================================

export async function loadMembers() {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(normalizeMember);
    } catch (error) {
      return [];
    }
  }

  return [];
}

export async function findMemberByPhoneOrMembershipNumber(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return null;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .or(`phone.eq.${trimmed},membership_number.eq.${trimmed}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? normalizeMember(data) : null;
  } catch (error) {
    return null;
  }
}

export async function saveMember(member) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is required for member data.");
  }

  try {
    const payload = buildMemberPayload(member, true);

    let response = await supabase
      .from("members")
      .upsert(payload, { onConflict: "membership_number" })
      .select("*")
      .single();

    if (response.error) {
      const maybeAuditFieldIssue =
        response.error.message?.includes("created_by") ||
        response.error.message?.includes("updated_by") ||
        response.error.message?.includes("consent_version") ||
        response.error.message?.includes("consent_signed_at") ||
        response.error.message?.includes("id_number");

      if (!maybeAuditFieldIssue) {
        throw response.error;
      }

      const fallbackPayload = {
        id: member.id || undefined,
        membership_number: String(member.membershipNumber || "").trim(),
        first_name: String(member.firstName || "").trim(),
        last_name: String(member.lastName || "").trim(),
        phone: String(member.phone || "").trim(),
        email: String(member.email || "").trim() || null,
        date_of_birth: member.dateOfBirth || null,
        status: String(member.status || "active").trim() || "active",
      };

      response = await supabase
        .from("members")
        .upsert(fallbackPayload, { onConflict: "membership_number" })
        .select("*")
        .single();

      if (response.error) {
        throw response.error;
      }
    }

    return normalizeMember(response.data);
  } catch (error) {
    throw error;
  }
}

export async function saveMemberConsent(consent) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return true;
  }

  const payload = {
    member_id: consent.memberId,
    consent_version: String(consent.consentVersion || "").trim() || "v1",
    signed_at: consent.signedAt || new Date().toISOString(),
    signed_by_staff: String(consent.signedByStaff || "").trim() || null,
    form_snapshot: consent.formSnapshot || {},
  };

  const { error } = await supabase.from("member_consents").insert(payload);
  if (error) {
    throw error;
  }

  return true;
}

export async function deleteMember(memberId) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is required for member data.");
  }

  const { data, error } = await supabase
    .from("members")
    .delete()
    .eq("id", memberId)
    .select("id");

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(
      "Member was not deleted. Check Supabase RLS delete policies for the members table.",
    );
  }

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
    } catch (error) {}
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
      return true;
    } catch (error) {
      return true;
    }
  }

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

export async function deleteArchive(archiveDate) {
  if (!archiveDate) {
    return false;
  }

  const currentLocalArchives = readLocalStorage(ARCHIVES_KEY);
  const updatedLocalArchives = currentLocalArchives.filter(
    (archive) => archive.archive_date !== archiveDate,
  );
  writeLocalStorage(ARCHIVES_KEY, updatedLocalArchives);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase
        .from("daily_sales_archive")
        .delete()
        .eq("archive_date", archiveDate);

      if (error) throw error;
      return true;
    } catch (error) {
      return false;
    }
  }

  return true;
}
