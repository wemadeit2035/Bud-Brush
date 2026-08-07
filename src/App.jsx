import { useEffect, useState } from "react";
import TopBar from "./components/TopBar";
import TabNav from "./components/TabNav";
import LoginOverlay from "./components/LoginOverlay";
import POSView from "./components/POSView";
import InventoryView from "./components/InventoryView";
import SalesView from "./components/SalesView";
import DashboardView from "./components/DashboardView";
import ArchiveView from "./components/ArchiveView";
import ToastNotification from "./components/ToastNotification";
import {
  loadProducts,
  loadTransactions,
  saveTransactions,
  loadArchives,
  saveArchive,
  deleteTransaction,
} from "./services/database";

function App() {
  const [activeView, setActiveView] = useState("pos");
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [cart, setCart] = useState([]);
  const [archives, setArchives] = useState([]);
  const [dailyAdjustments, setDailyAdjustments] = useState(() => {
    try {
      const raw = localStorage.getItem("budbrush_daily_adjustments");
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      const today = new Date().toISOString().slice(0, 10);
      return parsed?.date === today && Array.isArray(parsed.adjustments)
        ? parsed.adjustments
        : [];
    } catch (error) {
      console.error("Failed to load daily adjustments:", error);
      return [];
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Connecting...");
  const [toast, setToast] = useState(null);

  const showToast = (title, message, type = "success") => {
    setToast({ title, message, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const currency = (value) => {
    return `R${Number(value || 0).toFixed(2)}`;
  };

  useEffect(() => {
    try {
      localStorage.setItem(
        "budbrush_daily_adjustments",
        JSON.stringify({
          date: new Date().toISOString().slice(0, 10),
          adjustments: dailyAdjustments,
        }),
      );
    } catch (error) {
      console.error("Failed to save daily adjustments:", error);
    }
  }, [dailyAdjustments]);

  const loadArchiveData = async () => {
    const loadedArchives = await loadArchives();
    setArchives(loadedArchives);
    return loadedArchives;
  };

  const archiveSalesForDate = async (archiveDate) => {
    const targetStart = new Date(archiveDate);
    targetStart.setHours(0, 0, 0, 0);
    const targetEnd = new Date(archiveDate);
    targetEnd.setHours(23, 59, 59, 999);

    const dayTransactions = transactions.filter((tx) => {
      if (!tx.date) return false;
      const txDate = new Date(tx.date);
      return txDate >= targetStart && txDate <= targetEnd;
    });

    if (dayTransactions.length === 0) {
      return { archived: false, reason: "No sales for that day" };
    }

    const totalRevenue = dayTransactions.reduce(
      (sum, tx) => sum + (tx.total || 0),
      0,
    );
    const cashTotal = dayTransactions
      .filter((tx) => tx.payment === "Cash")
      .reduce((sum, tx) => sum + (tx.total || 0), 0);
    const yocoTotal = dayTransactions
      .filter((tx) => tx.payment === "Yoco")
      .reduce((sum, tx) => sum + (tx.total || 0), 0);
    const eftTotal = dayTransactions
      .filter((tx) => tx.payment === "EFT")
      .reduce((sum, tx) => sum + (tx.total || 0), 0);
    const uberzolTotal = dayTransactions
      .filter((tx) => tx.payment === "Uberzol")
      .reduce((sum, tx) => sum + (tx.total || 0), 0);
    const itemCount = dayTransactions.reduce(
      (sum, tx) => sum + (tx.itemCount || tx.items?.length || 0),
      0,
    );
    const adjustmentTotal = dailyAdjustments.reduce(
      (sum, adjustment) => sum + (Number(adjustment.amount) || 0),
      0,
    );

    const archiveData = {
      transactions: dayTransactions,
      summary: {
        totalRevenue,
        cashTotal,
        yocoTotal,
        eftTotal,
        uberzolTotal,
        transactionCount: dayTransactions.length,
        itemCount,
        adjustmentTotal,
        adjustments: dailyAdjustments,
      },
    };

    const archiveRecord = {
      archive_date: archiveDate,
      total_revenue: totalRevenue,
      cash_total: cashTotal,
      yoco_total: yocoTotal,
      eft_total: eftTotal,
      uberzol_total: uberzolTotal,
      transaction_count: dayTransactions.length,
      item_count: itemCount,
      data: archiveData,
    };

    await saveArchive(archiveRecord);
    await loadArchiveData();

    return {
      archived: true,
      count: dayTransactions.length,
      total: totalRevenue,
    };
  };

  const archiveTodaySales = async () => {
    const today = new Date();
    const dateKey = today.toISOString().slice(0, 10);
    return archiveSalesForDate(dateKey);
  };

  const clearTodaySalesWithArchive = async () => {
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayTransactions = transactions.filter((tx) => {
      if (!tx.date) return false;
      const txDate = new Date(tx.date);
      return txDate >= todayStart && txDate <= todayEnd;
    });

    if (todayTransactions.length === 0) {
      showToast("No Sales", "No sales to clear today.", "info");
      return;
    }

    const confirmMsg = `This will archive ${todayTransactions.length} transactions and clear today's sales.\n\nProceed?`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    showToast(
      "Archiving...",
      `Archiving ${todayTransactions.length} transactions...`,
      "info",
    );

    try {
      const result = await archiveTodaySales();
      if (!result.archived) {
        showToast(
          "Archive Failed",
          result.reason || "Failed to archive sales.",
          "error",
        );
        return;
      }

      const transactionIds = todayTransactions.map((tx) => tx.id);
      let deletedCount = 0;
      const updatedTransactions = transactions.filter(
        (tx) => !transactionIds.includes(tx.id),
      );

      for (const txId of transactionIds) {
        try {
          await deleteTransaction(txId);
          deletedCount++;
        } catch (err) {
          console.error(`Failed to delete transaction ${txId}:`, err);
        }
      }

      setTransactions(updatedTransactions);
      await saveTransactions(updatedTransactions);
      setDailyAdjustments([]);

      showToast(
        "✅ Day Archived & Cleared!",
        `Archived ${result.count} transactions (Total: ${currency(result.total)}). ${deletedCount} transactions cleared from today.`,
        "success",
      );
      setSyncStatus(
        `Archived ${result.count} transactions for ${today.toLocaleDateString()}`,
      );
    } catch (error) {
      console.error("Error clearing day with archive:", error);
      showToast("Error", "Failed to archive and clear today's sales.", "error");
    }
  };

  const getArchivedDays = async () => {
    return await loadArchiveData();
  };

  const initializeApp = async () => {
    const loadedProducts = await loadProducts();
    const loadedTransactions = await loadTransactions();
    setProducts(loadedProducts);
    setTransactions(loadedTransactions);
    setSyncStatus(
      `Loaded ${loadedProducts.length} items and ${loadedTransactions.length} transactions`,
    );

    const today = new Date().toISOString().slice(0, 10);
    const lastRun = localStorage.getItem("bb_last_run_date");
    if (lastRun && lastRun !== today) {
      console.log(`📅 New day detected! Archiving ${lastRun} sales...`);
      const result = await archiveSalesForDate(lastRun);
      if (result.archived) {
        showToast(
          "📅 New Day",
          `Archived ${result.count} transactions from ${lastRun}. Starting fresh!`,
          "info",
        );
      }
    }
    localStorage.setItem("bb_last_run_date", today);
    await loadArchiveData();
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    initializeApp();
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <LoginOverlay
        visible={!isAuthenticated}
        onAuthenticate={() => setIsAuthenticated(true)}
      />
      {isAuthenticated && (
        <div className="space-y-6 p-4 lg:p-8">
          <TopBar
            syncStatus={syncStatus}
            onNewDay={clearTodaySalesWithArchive}
            onViewArchives={() => setActiveView("archive")}
          />
          <TabNav
            activeView={activeView}
            onChangeView={setActiveView}
            onClearDay={clearTodaySalesWithArchive}
          />
          <div>
            {activeView === "pos" && (
              <POSView
                products={products}
                cart={cart}
                setCart={setCart}
                setProducts={setProducts}
                transactions={transactions}
                setTransactions={setTransactions}
                setSyncStatus={setSyncStatus}
                showToast={showToast}
              />
            )}
            {activeView === "inventory" && (
              <InventoryView
                products={products}
                setProducts={setProducts}
                showToast={showToast}
              />
            )}
            {activeView === "sales" && (
              <SalesView
                products={products}
                transactions={transactions}
                setTransactions={setTransactions}
                dailyAdjustments={dailyAdjustments}
                setDailyAdjustments={setDailyAdjustments}
                showToast={showToast}
              />
            )}
            {activeView === "dashboard" && (
              <DashboardView products={products} transactions={transactions} />
            )}
            {activeView === "archive" && (
              <ArchiveView
                archives={archives}
                currency={currency}
                refreshArchives={loadArchiveData}
              />
            )}
          </div>
        </div>
      )}
      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default App;
