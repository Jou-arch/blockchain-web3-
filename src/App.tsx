import React, { useState, useEffect } from "react";
import {
  Camera,
  Sparkles,
  Share2,
  Plus,
  RefreshCw,
  Smartphone,
  ShieldCheck,
  Zap,
  Award,
  ArrowUpRight,
  HelpCircle,
  History,
  CloudCheck,
  LogIn,
  CheckCircle,
} from "lucide-react";
import {
  Bill,
  BillItem,
  BillParticipant,
  SettlementResult,
  SmartWalletInfo,
} from "./types";
import { Navbar } from "./components/Navbar";
import { BillSummary } from "./components/BillSummary";
import { ParticipantCard } from "./components/ParticipantCard";
import { SnapModal } from "./components/SnapModal";
import { ItemAssignmentModal } from "./components/ItemAssignmentModal";
import { AAPaymasterModal } from "./components/AAPaymasterModal";
import { InstantQRModal } from "./components/InstantQRModal";
import { ProofOfSettlementModal } from "./components/ProofOfSettlementModal";
import { SmartWalletModal } from "./components/SmartWalletModal";
import { BillHistoryModal } from "./components/BillHistoryModal";
import { generateTelegramShareMessage } from "./utils/formatters";
import { useAuth } from "./firebase/authContext";
import {
  saveReceiptToFirestore,
  updateReceiptSettlementInFirestore,
  deleteReceiptFromFirestore,
  subscribeUserReceipts,
} from "./firebase/receiptsService";

export default function App() {
  const { currentUser, signInWithGoogle } = useAuth();

  const [bill, setBill] = useState<Bill | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cloud Firestore saved receipts
  const [savedBills, setSavedBills] = useState<Bill[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isSavingBill, setIsSavingBill] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Telegram Mini App preview toggle
  const [isTelegramView, setIsTelegramView] = useState<boolean>(false);

  // Modals state
  const [isSnapModalOpen, setIsSnapModalOpen] = useState<boolean>(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [isProofModalOpen, setIsProofModalOpen] = useState<boolean>(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  // Selected participant for payment actions
  const [paymasterParticipant, setPaymasterParticipant] = useState<BillParticipant | null>(null);
  const [qrParticipant, setQrParticipant] = useState<BillParticipant | null>(null);

  // User Smart Wallet state
  const [smartWallet, setSmartWallet] = useState<SmartWalletInfo>({
    address: "0x98A192B4eBc78C2187a55D859B7322E7eBf0F5B9",
    type: "ERC-4337 Smart Account",
    bnbBalance: 0.0, // Zero BNB to showcase zero friction!
    usdtBalance: 125.5,
    isGaslessEnabled: true,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Fetch initial fallback bill from server
  const fetchDefaultBill = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/bills");
      const data = await res.json();
      if (data.bills && data.bills.length > 0) {
        setBill(data.bills[0]);
      }
    } catch (err) {
      console.error("Failed to load initial bill:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to Cloud Firestore receipts when user is logged in
  useEffect(() => {
    if (!currentUser) {
      setSavedBills([]);
      // Load fallback bill if no current bill
      if (!bill) {
        fetchDefaultBill();
      }
      return;
    }

    setIsLoadingHistory(true);
    const unsubscribe = subscribeUserReceipts(
      currentUser.uid,
      (bills) => {
        setSavedBills(bills);
        setIsLoadingHistory(false);
        // If no bill loaded yet and user has bills in Firestore, load the latest one
        setBill((prev) => {
          if (!prev && bills.length > 0) {
            return bills[0];
          }
          return prev;
        });
        if (isLoading) setIsLoading(false);
      },
      (error) => {
        console.error("Error subscribing to Firestore bills:", error);
        setIsLoadingHistory(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Initial load if not logged in
  useEffect(() => {
    if (!currentUser) {
      fetchDefaultBill();
    }
  }, []);

  // Update exchange rate
  const handleUpdateExchangeRate = (newRate: number) => {
    if (!bill) return;
    const updatedParticipants = bill.participants.map((p) => ({
      ...p,
      totalUsdt: Number((p.totalFiat / newRate).toFixed(2)),
    }));
    const updatedBill: Bill = {
      ...bill,
      exchangeRate: newRate,
      participants: updatedParticipants,
    };
    setBill(updatedBill);

    // If logged in and saved, sync update
    if (currentUser) {
      saveReceiptToFirestore(updatedBill, currentUser.uid).catch((e) =>
        console.error("Auto-sync error on rate update:", e)
      );
    }
  };

  // When a new receipt is parsed by Gemini AI
  const handleReceiptParsed = async (parsedData: any) => {
    const exchangeRate = parsedData.exchangeRate || 16300;
    const items: BillItem[] = parsedData.items || [];
    const subtotal =
      parsedData.subtotal ||
      items.reduce((acc, it) => acc + (it.totalPrice || it.pricePerUnit * it.quantity), 0);
    const tax = parsedData.tax || 0;
    const serviceCharge = parsedData.serviceCharge || 0;
    const discount = parsedData.discount || 0;
    const grandTotal =
      parsedData.grandTotal || subtotal + tax + serviceCharge - discount;

    const participantNames: string[] =
      parsedData.participants && parsedData.participants.length > 0
        ? parsedData.participants
        : ["Budi", "Siti", "Rian", "Host"];

    // Recalculate participant shares
    const map: Record<string, number> = {};
    participantNames.forEach((n) => (map[n] = 0));

    items.forEach((item) => {
      const assignees =
        item.assignedTo && item.assignedTo.length > 0 ? item.assignedTo : participantNames;
      const share = item.totalPrice / (assignees.length || 1);
      assignees.forEach((p) => {
        map[p] = (map[p] || 0) + share;
      });
    });

    const netExtras = tax + serviceCharge - discount;
    const calculatedParticipants: BillParticipant[] = Object.keys(map).map((name, idx) => {
      const itemsShare = Math.round(map[name] || 0);
      const proportion = subtotal > 0 ? itemsShare / subtotal : 1 / participantNames.length;
      const taxAndServiceShare = Math.round(netExtras * proportion);
      const totalFiat = itemsShare + taxAndServiceShare;
      const totalUsdt = Number((totalFiat / exchangeRate).toFixed(2));

      return {
        id: `p-${idx + 1}-${Date.now().toString(36)}`,
        name,
        itemsShare,
        taxAndServiceShare,
        totalFiat,
        totalUsdt,
        isPaid: idx === 0, // Assume host already paid at cashier
        paidAt: idx === 0 ? new Date().toISOString() : undefined,
        txHash:
          idx === 0
            ? "0x82f5b8a1c97f123d4567e9b1123456789abcdef0123456789abcdef012345678"
            : undefined,
        badge: idx === 0 ? "Receipt Host" : undefined,
      };
    });

    const newBillId = `bill-${Date.now()}`;
    const newBill: Bill = {
      id: newBillId,
      title: parsedData.title || parsedData.merchantName || "Struk Nongkrong",
      merchantName: parsedData.merchantName || "Restoran / Kafe",
      date: parsedData.date || new Date().toISOString().split("T")[0],
      currency: parsedData.currency || "IDR",
      exchangeRate,
      items,
      subtotal,
      tax,
      serviceCharge,
      discount,
      grandTotal,
      payerName: currentUser?.displayName || "Taufik (Host)",
      payerAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      network: "BNB Chain (BSC)",
      participants: calculatedParticipants,
      createdAt: new Date().toISOString(),
    };

    setBill(newBill);

    // Auto-save to Cloud Firestore if logged in
    if (currentUser) {
      try {
        setIsSavingBill(true);
        await saveReceiptToFirestore(newBill, currentUser.uid);
        showToast(`Struk "${newBill.merchantName}" berhasil disimpan ke Cloud Firestore!`);
      } catch (err) {
        console.error("Failed to auto-save bill:", err);
      } finally {
        setIsSavingBill(false);
      }
    }
  };

  // Save manual/AI reassignments
  const handleSaveAssignments = async (
    updatedItems: BillItem[],
    updatedParticipants: string[]
  ) => {
    if (!bill) return;

    const subtotal = updatedItems.reduce(
      (acc, it) => acc + (it.totalPrice || it.pricePerUnit * it.quantity),
      0
    );
    const tax = bill.tax;
    const serviceCharge = bill.serviceCharge;
    const discount = bill.discount;
    const grandTotal = subtotal + tax + serviceCharge - discount;

    const map: Record<
      string,
      { itemsShare: number; isPaid: boolean; badge?: string; txHash?: string }
    > = {};
    updatedParticipants.forEach((n) => {
      const existing = bill.participants.find((p) => p.name === n);
      map[n] = {
        itemsShare: 0,
        isPaid: existing ? existing.isPaid : false,
        badge: existing?.badge,
        txHash: existing?.txHash,
      };
    });

    updatedItems.forEach((item) => {
      const assignees =
        item.assignedTo && item.assignedTo.length > 0 ? item.assignedTo : updatedParticipants;
      const share = item.totalPrice / (assignees.length || 1);
      assignees.forEach((p) => {
        if (!map[p]) {
          map[p] = { itemsShare: 0, isPaid: false };
        }
        map[p].itemsShare += share;
      });
    });

    const netExtras = tax + serviceCharge - discount;
    const newCalculated: BillParticipant[] = Object.keys(map).map((name, idx) => {
      const data = map[name];
      const itemsShare = Math.round(data.itemsShare);
      const proportion = subtotal > 0 ? itemsShare / subtotal : 1 / updatedParticipants.length;
      const taxAndServiceShare = Math.round(netExtras * proportion);
      const totalFiat = itemsShare + taxAndServiceShare;
      const totalUsdt = Number((totalFiat / bill.exchangeRate).toFixed(2));

      return {
        id: `p-${idx + 1}-${Date.now().toString(36)}`,
        name,
        itemsShare,
        taxAndServiceShare,
        totalFiat,
        totalUsdt,
        isPaid: data.isPaid,
        badge: data.badge,
        txHash: data.txHash,
      };
    });

    const updatedBill: Bill = {
      ...bill,
      items: updatedItems,
      subtotal,
      grandTotal,
      participants: newCalculated,
    };

    setBill(updatedBill);

    // Save to Firestore if user is authenticated
    if (currentUser) {
      try {
        setIsSavingBill(true);
        await saveReceiptToFirestore(updatedBill, currentUser.uid);
        showToast("Perubahan pembagian item disimpan ke Cloud Firestore.");
      } catch (err) {
        console.error("Firestore sync error:", err);
      } finally {
        setIsSavingBill(false);
      }
    }
  };

  // When payment is marked settled (Account Abstraction or QR)
  const handlePaymentSuccess = async (participantId: string, settlement: SettlementResult) => {
    if (!bill) return;
    const updatedParticipants = bill.participants.map((p) => {
      if (p.id === participantId) {
        return {
          ...p,
          isPaid: true,
          paidAt: settlement.paidAt,
          txHash: settlement.txHash,
          badge: settlement.awardedBadge,
        };
      }
      return p;
    });

    const updatedBill: Bill = {
      ...bill,
      participants: updatedParticipants,
    };

    setBill(updatedBill);

    // Deduct USDT balance from smart wallet if user paid their own share
    const targetP = bill.participants.find((p) => p.id === participantId);
    if (targetP) {
      setSmartWallet((prev) => ({
        ...prev,
        usdtBalance: Math.max(0, Number((prev.usdtBalance - targetP.totalUsdt).toFixed(2))),
      }));
    }

    // Sync settlement status to Firestore
    if (currentUser) {
      try {
        await updateReceiptSettlementInFirestore(bill.id, updatedParticipants);
        showToast("Status lunas & bukti transaksi tercatat di Cloud Firestore!");
      } catch (err) {
        console.error("Error updating settlement in Firestore:", err);
      }
    }
  };

  // Explicit Save to Firestore action
  const handleSaveToFirestore = async () => {
    if (!bill) return;

    if (!currentUser) {
      try {
        await signInWithGoogle();
        // Effect will handle or user can click save again
      } catch (err) {
        console.error("Sign in failed:", err);
        return;
      }
    }

    if (currentUser) {
      try {
        setIsSavingBill(true);
        await saveReceiptToFirestore(bill, currentUser.uid);
        showToast(`Struk "${bill.merchantName}" berhasil disimpan ke Cloud Firestore!`);
      } catch (err) {
        console.error("Error saving bill to Firestore:", err);
        showToast("Gagal menyimpan ke Firestore. Silakan coba lagi.");
      } finally {
        setIsSavingBill(false);
      }
    }
  };

  // Delete bill from Firestore
  const handleDeleteBill = async (billId: string) => {
    try {
      await deleteReceiptFromFirestore(billId);
      showToast("Struk berhasil dihapus dari Cloud Firestore.");
      if (bill?.id === billId) {
        const remaining = savedBills.filter((b) => b.id !== billId);
        if (remaining.length > 0) {
          setBill(remaining[0]);
        } else {
          fetchDefaultBill();
        }
      }
    } catch (err) {
      console.error("Failed to delete bill:", err);
      showToast("Gagal menghapus struk dari Firestore.");
    }
  };

  const handleTopUpUsdt = (amount: number) => {
    setSmartWallet((prev) => ({
      ...prev,
      usdtBalance: Number((prev.usdtBalance + amount).toFixed(2)),
    }));
  };

  const handleSwitchWalletType = (type: "ERC-4337 Smart Account" | "EOA (MetaMask / Trust)") => {
    setSmartWallet((prev) => ({
      ...prev,
      type,
    }));
  };

  // Copy Telegram chat format
  const handleCopyTelegram = () => {
    if (!bill) return;
    const text = generateTelegramShareMessage(bill);
    navigator.clipboard.writeText(text);
    showToast("Format ringkasan tagihan untuk chat grup Telegram / WhatsApp berhasil disalin!");
  };

  // Check if current bill is already saved in user's Firestore list
  const isCurrentBillSaved = Boolean(
    currentUser && bill && savedBills.some((b) => b.id === bill.id)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-slate-900/95 px-4 py-3 text-xs font-semibold text-emerald-300 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-2">
          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navbar with Firebase Google Sign-In & Riwayat Struk */}
      <Navbar
        smartWallet={smartWallet}
        isTelegramView={isTelegramView}
        setIsTelegramView={setIsTelegramView}
        onOpenWalletModal={() => setIsWalletModalOpen(true)}
        onNewReceipt={() => setIsSnapModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        savedBillsCount={savedBills.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full pb-16">
        {/* Telegram Frame Container wrapper (if enabled) */}
        <div
          className={`mx-auto transition-all ${
            isTelegramView
              ? "max-w-md my-4 rounded-3xl border-4 border-slate-700 bg-slate-950 shadow-2xl overflow-hidden p-2 sm:p-4"
              : "max-w-6xl px-4 py-6 sm:px-6"
          }`}
        >
          {/* Telegram simulated header if in Telegram view */}
          {isTelegramView && (
            <div className="mb-4 rounded-2xl bg-sky-950/40 p-3 border border-sky-500/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-sky-400 font-semibold">
                <Smartphone className="h-4 w-4" />
                <span>Telegram Mini App Frame</span>
              </div>
              <button
                onClick={() => setIsTelegramView(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕ Full View
              </button>
            </div>
          )}

          {/* Hero Banner: Problem -> Relatable Flow */}
          <div className="mb-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-5 sm:p-6 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
                    <Zap className="h-3.5 w-3.5 fill-amber-400" />
                    <span>Solusi Patungan Nongkrong Bebas Ribet</span>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                    <CloudCheck className="h-3 w-3" />
                    <span>Firebase Backend & Firestore</span>
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                  Snap Struk, AI Bagi Item, Teman Bayar USDT Tanpa Gas Fee.
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Satu orang talangi kasir/QRIS restoran, AI (Gemini) memecah siapa pesan apa dari
                  struk & chat grup, lalu tersimpan aman di <strong>Cloud Firestore</strong> dengan
                  settlement <strong>Account Abstraction di BNB Chain</strong> (0 BNB saldo
                  dibutuhkan).
                </p>
              </div>

              {/* Quick Action CTA */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                <button
                  id="btn-hero-snap"
                  onClick={() => setIsSnapModalOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-400 active:scale-95 transition"
                >
                  <Camera className="h-4 w-4" />
                  <span>Foto Struk Baru (AI)</span>
                </button>

                <button
                  id="btn-hero-history"
                  onClick={() => setIsHistoryModalOpen(true)}
                  className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-750 transition"
                  title="Lihat riwayat struk tersimpan di Cloud Firestore"
                >
                  <History className="h-4 w-4 text-amber-400" />
                  <span>Riwayat ({savedBills.length})</span>
                </button>

                <button
                  id="btn-hero-share"
                  onClick={handleCopyTelegram}
                  className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-750 transition"
                  title="Bagikan rincian tagihan ke grup WhatsApp atau Telegram"
                >
                  <Share2 className="h-4 w-4 text-amber-400" />
                  <span className="hidden sm:inline">Bagikan ke Grup</span>
                </button>
              </div>
            </div>

            {/* Auth prompt if not logged in */}
            {!currentUser && (
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <CloudCheck className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>
                    Masuk dengan <strong>Google Sign-In</strong> agar struk otomatis tersimpan di
                    Cloud Firestore dan dapat dibuka kapan saja.
                  </span>
                </div>
                <button
                  onClick={() => signInWithGoogle()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1.5 font-semibold text-xs border border-amber-500/30 transition self-start sm:self-auto shrink-0"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Masuk dengan Google</span>
                </button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <p className="text-xs text-slate-400">Memuat rincian struk & status settlement...</p>
            </div>
          ) : bill ? (
            <div className="space-y-6">
              {/* Bill Details Summary Card */}
              <BillSummary
                bill={bill}
                onOpenAssignModal={() => setIsAssignModalOpen(true)}
                onShareProof={() => setIsProofModalOpen(true)}
                onUpdateExchangeRate={handleUpdateExchangeRate}
                isSavedInFirestore={isCurrentBillSaved}
                isSaving={isSavingBill}
                onSaveToFirestore={handleSaveToFirestore}
              />

              {/* Section Header: Participants */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>Rincian Pembagian per Orang</span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-amber-400">
                      {bill.participants.length} Teman
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Klik "Pay my share with USDT" untuk transaksi gasless langsung di BNB Chain
                  </p>
                </div>

                <button
                  id="btn-open-assignment-shortcut"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>AI Auto-Assign Chat</span>
                </button>
              </div>

              {/* Grid of Participant Share Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {bill.participants.map((p) => (
                  <ParticipantCard
                    key={p.id}
                    participant={p}
                    currency={bill.currency}
                    exchangeRate={bill.exchangeRate}
                    hostAddress={bill.payerAddress}
                    onPayGasless={(part) => setPaymasterParticipant(part)}
                    onShowQR={(part) => setQrParticipant(part)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
                <Camera className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Belum Ada Struk yang Dimuat</h3>
                <p className="text-xs text-slate-400">
                  Ambil foto struk restoran atau pilih contoh preset untuk melihat keajaiban
                  ReceiptSplit.
                </p>
              </div>
              <button
                onClick={() => setIsSnapModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Mulai dengan Struk Baru</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Floating Bottom Bar for Quick Actions on Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-800 bg-slate-950/90 backdrop-blur-md p-3 sm:hidden">
        <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
          <button
            onClick={() => setIsSnapModalOpen(true)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 py-2.5 text-xs font-bold text-slate-950 shadow-md"
          >
            <Camera className="h-4 w-4" />
            <span>Snap Struk</span>
          </button>

          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-200"
          >
            <History className="h-4 w-4 text-amber-400" />
            <span>Riwayat</span>
          </button>

          <button
            onClick={() => setIsProofModalOpen(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-200"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Proof</span>
          </button>

          <button
            onClick={() => setIsWalletModalOpen(true)}
            className="flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-slate-200"
            title="Buka Dompet"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Modals */}
      <SnapModal
        isOpen={isSnapModalOpen}
        onClose={() => setIsSnapModalOpen(false)}
        onReceiptParsed={handleReceiptParsed}
      />

      {bill && (
        <>
          <ItemAssignmentModal
            isOpen={isAssignModalOpen}
            onClose={() => setIsAssignModalOpen(false)}
            items={bill.items}
            currency={bill.currency}
            currentParticipants={bill.participants.map((p) => p.name)}
            onSaveAssignments={handleSaveAssignments}
          />

          <AAPaymasterModal
            isOpen={Boolean(paymasterParticipant)}
            onClose={() => setPaymasterParticipant(null)}
            participant={paymasterParticipant}
            billId={bill.id}
            hostAddress={bill.payerAddress}
            currency={bill.currency}
            smartWallet={smartWallet}
            onPaymentSuccess={handlePaymentSuccess}
          />

          <InstantQRModal
            isOpen={Boolean(qrParticipant)}
            onClose={() => setQrParticipant(null)}
            participant={qrParticipant}
            hostAddress={bill.payerAddress}
            currency={bill.currency}
            billId={bill.id}
            onPaymentSuccess={handlePaymentSuccess}
          />

          <ProofOfSettlementModal
            isOpen={isProofModalOpen}
            onClose={() => setIsProofModalOpen(false)}
            bill={bill}
          />
        </>
      )}

      <BillHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        savedBills={savedBills}
        currentBillId={bill?.id}
        onSelectBill={(selected) => setBill(selected)}
        onDeleteBill={handleDeleteBill}
        isLoading={isLoadingHistory}
      />

      <SmartWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        smartWallet={smartWallet}
        onTopUpUsdt={handleTopUpUsdt}
        onSwitchWalletType={handleSwitchWalletType}
      />
    </div>
  );
}
