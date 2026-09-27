import React, { useState } from "react";
import {
  Store,
  Calendar,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Users,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  CloudCheck,
  CloudUpload,
} from "lucide-react";
import { Bill } from "../types";
import { formatCurrency, formatUsdt, truncateAddress } from "../utils/formatters";

interface BillSummaryProps {
  bill: Bill;
  onOpenAssignModal: () => void;
  onShareProof: () => void;
  onUpdateExchangeRate: (newRate: number) => void;
  isSavedInFirestore?: boolean;
  isSaving?: boolean;
  onSaveToFirestore?: () => void;
}

export const BillSummary: React.FC<BillSummaryProps> = ({
  bill,
  onOpenAssignModal,
  onShareProof,
  onUpdateExchangeRate,
  isSavedInFirestore = false,
  isSaving = false,
  onSaveToFirestore,
}) => {
  const [showItemDetails, setShowItemDetails] = useState<boolean>(true);
  const [copiedHostAddress, setCopiedHostAddress] = useState<boolean>(false);
  const [editingRate, setEditingRate] = useState<boolean>(false);
  const [tempRate, setTempRate] = useState<string>(bill.exchangeRate.toString());

  const paidCount = bill.participants.filter((p) => p.isPaid).length;
  const totalCount = bill.participants.length;
  const progressPercent = Math.round((paidCount / (totalCount || 1)) * 100);
  const collectedUsdt = bill.participants
    .filter((p) => p.isPaid)
    .reduce((acc, p) => acc + p.totalUsdt, 0);

  const handleCopyHost = () => {
    navigator.clipboard.writeText(bill.payerAddress);
    setCopiedHostAddress(true);
    setTimeout(() => setCopiedHostAddress(false), 2000);
  };

  const handleSaveRate = () => {
    const val = parseFloat(tempRate);
    if (!isNaN(val) && val > 0) {
      onUpdateExchangeRate(val);
      setEditingRate(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur-sm">
      {/* Top Banner with Merchant & Host */}
      <div className="border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
                <Store className="h-3 w-3" />
                Restoran / Struk
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {bill.date}
              </span>

              {/* Firestore sync badge */}
              {isSavedInFirestore ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  <CloudCheck className="h-3 w-3" />
                  Firestore Sync
                </span>
              ) : onSaveToFirestore ? (
                <button
                  onClick={onSaveToFirestore}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 hover:bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-400 border border-sky-500/20 transition cursor-pointer"
                >
                  <CloudUpload className="h-3 w-3" />
                  <span>{isSaving ? "Menyimpan..." : "Simpan ke Firestore"}</span>
                </button>
              ) : null}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {bill.merchantName}
            </h1>
            <p className="text-xs text-slate-400">
              Kasir/QRIS ditalangi oleh:{" "}
              <strong className="text-slate-200">{bill.payerName}</strong> (
              <button
                onClick={handleCopyHost}
                className="font-mono text-amber-400 hover:underline inline-flex items-center gap-1"
                title="Salin alamat dompet host BNB Chain"
              >
                {truncateAddress(bill.payerAddress)}
                {copiedHostAddress ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
              )
            </p>
          </div>

          {/* Settlement Progress & Proof Badge Button */}
          <div className="flex flex-col sm:items-end gap-2">
            <div className="flex items-center gap-2">
              {onSaveToFirestore && (
                <button
                  id="btn-save-firestore"
                  onClick={onSaveToFirestore}
                  disabled={isSaving}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    isSavedInFirestore
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-750"
                  }`}
                >
                  {isSaving ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-400" />
                  ) : isSavedInFirestore ? (
                    <CloudCheck className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <CloudUpload className="h-3.5 w-3.5 text-amber-400" />
                  )}
                  <span>{isSaving ? "Menyimpan..." : isSavedInFirestore ? "Tersimpan di Cloud" : "Simpan Cloud"}</span>
                </button>
              )}

              <button
                id="btn-proof-of-settlement"
                onClick={onShareProof}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Lihat Proof</span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>On-Chain Settlement: <strong>BNB Chain (BSC)</strong></span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-slate-300">
              Status Patungan On-Chain:{" "}
              <strong className="text-emerald-400">{paidCount} dari {totalCount} Lunas</strong> ({progressPercent}%)
            </span>
            <span className="font-mono text-slate-400">
              {collectedUsdt.toFixed(2)} / {(bill.grandTotal / bill.exchangeRate).toFixed(2)} USDT
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Financial Numbers & Exchange Rate Bar */}
      <div className="grid grid-cols-2 gap-3 border-b border-slate-800 bg-slate-950/60 p-4 sm:grid-cols-4 sm:p-5">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
          <span className="text-[11px] font-medium text-slate-400 block">Subtotal Menu</span>
          <span className="text-sm sm:text-base font-bold text-slate-200">
            {formatCurrency(bill.subtotal, bill.currency)}
          </span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
          <span className="text-[11px] font-medium text-slate-400 block">PB1 Tax & Service</span>
          <span className="text-sm sm:text-base font-bold text-slate-200">
            {formatCurrency((bill.tax || 0) + (bill.serviceCharge || 0), bill.currency)}
          </span>
          <span className="text-[10px] text-slate-500 block">Dibagi proporsional</span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
          <span className="text-[11px] font-medium text-slate-400 block">Kurs USDT / IDR</span>
          {editingRate ? (
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                value={tempRate}
                onChange={(e) => setTempRate(e.target.value)}
                className="w-20 rounded bg-slate-950 px-1.5 py-0.5 text-xs text-amber-400 border border-slate-700"
              />
              <button
                onClick={handleSaveRate}
                className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-slate-950"
              >
                OK
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-bold text-amber-400">
                1 USDT = {Number(bill.exchangeRate).toLocaleString()}
              </span>
              <button
                onClick={() => setEditingRate(true)}
                className="text-[10px] text-slate-400 hover:text-amber-300"
                title="Sesuaikan Kurs"
              >
                ✏️
              </button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <span className="text-[11px] font-semibold text-amber-300 block">Grand Total Bill</span>
          <span className="text-base sm:text-lg font-extrabold text-amber-400 block">
            {formatCurrency(bill.grandTotal, bill.currency)}
          </span>
          <span className="font-mono text-xs font-semibold text-slate-300">
            ≈ {formatUsdt(bill.grandTotal / bill.exchangeRate)}
          </span>
        </div>
      </div>

      {/* Itemized Menu Accordion */}
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Rincian Item ({bill.items.length} Menu)
            </span>
            <button
              onClick={() => setShowItemDetails(!showItemDetails)}
              className="text-xs text-amber-400 hover:underline flex items-center gap-1"
            >
              {showItemDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showItemDetails ? "Sembunyikan" : "Tampilkan"}
            </button>
          </div>

          <button
            id="btn-reassign-items"
            onClick={onOpenAssignModal}
            className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Atur Ulang / AI Re-Assign</span>
          </button>
        </div>

        {showItemDetails && (
          <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden">
            {bill.items.map((item, idx) => (
              <div key={item.id || idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 hover:bg-slate-900/50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}.</span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-200">{item.name}</span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-400 font-mono">
                      x{item.quantity}
                    </span>
                  </div>
                  {/* Assigned tags */}
                  <div className="flex flex-wrap items-center gap-1 pl-7">
                    <span className="text-[10px] text-slate-400">Dimakan oleh:</span>
                    {item.assignedTo && item.assignedTo.length > 0 ? (
                      item.assignedTo.map((person, pIdx) => (
                        <span
                          key={pIdx}
                          className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-amber-300 border border-slate-700"
                        >
                          {person}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">Bagi rata semua</span>
                    )}
                  </div>
                </div>

                <div className="text-right pl-7 sm:pl-0">
                  <span className="text-xs sm:text-sm font-bold text-slate-200 block font-mono">
                    {formatCurrency(item.totalPrice, bill.currency)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ≈ {formatUsdt(item.totalPrice / bill.exchangeRate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
