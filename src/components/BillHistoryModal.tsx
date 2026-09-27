import React from "react";
import {
  X,
  History,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  Receipt,
  CloudCheck,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Bill } from "../types";
import { formatCurrency } from "../utils/formatters";

interface BillHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedBills: Bill[];
  currentBillId?: string;
  onSelectBill: (bill: Bill) => void;
  onDeleteBill: (billId: string) => void;
  isLoading: boolean;
}

export const BillHistoryModal: React.FC<BillHistoryModalProps> = ({
  isOpen,
  onClose,
  savedBills,
  currentBillId,
  onSelectBill,
  onDeleteBill,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <History className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Riwayat Struk & Tagihan</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  <CloudCheck className="h-3 w-3" />
                  Cloud Firestore
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tersimpan aman di backend Firebase Firestore Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <p className="text-xs text-slate-400">Memuat riwayat dari Cloud Firestore...</p>
            </div>
          ) : savedBills.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-500">
                <Receipt className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Belum Ada Struk Tersimpan</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Struk yang Anda foto atau simpan akan otomatis tersinkronisasi di Cloud Firestore dan muncul di sini.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {savedBills.map((b) => {
                const isCurrent = b.id === currentBillId;
                const paidCount = b.participants.filter((p) => p.isPaid).length;
                const totalParticipants = b.participants.length || 1;
                const settledPercent = Math.round((paidCount / totalParticipants) * 100);

                return (
                  <div
                    key={b.id}
                    className={`group relative rounded-xl border p-4 transition ${
                      isCurrent
                        ? "border-amber-500/50 bg-amber-500/5 shadow-md shadow-amber-500/5"
                        : "border-slate-800 bg-slate-850 hover:border-slate-700 hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white truncate">
                            {b.merchantName}
                          </h4>
                          {isCurrent && (
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                              Aktif Sekarang
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            {b.date || "Tanpa tanggal"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-300">
                          <span className="font-semibold text-white">
                            {formatCurrency(b.grandTotal, b.currency)}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-amber-400 font-mono">
                            ~{(b.grandTotal / (b.exchangeRate || 16300)).toFixed(2)} USDT
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-400">
                            {b.items.length} item • {b.participants.length} teman
                          </span>
                        </div>

                        {/* Settlement progress */}
                        <div className="pt-1 flex items-center gap-2 max-w-xs">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all"
                              style={{ width: `${settledPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">
                            {paidCount}/{totalParticipants} Lunas ({settledPercent}%)
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => {
                            onSelectBill(b);
                            onClose();
                          }}
                          disabled={isCurrent}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            isCurrent
                              ? "bg-slate-800 text-slate-500 cursor-default"
                              : "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm"
                          }`}
                        >
                          <span>{isCurrent ? "Sedang Dibuka" : "Buka Struk"}</span>
                          {!isCurrent && <ChevronRight className="h-3.5 w-3.5" />}
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Hapus struk "${b.merchantName}" dari Cloud Firestore?`)) {
                              onDeleteBill(b.id);
                            }
                          }}
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition"
                          title="Hapus dari Cloud Firestore"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-800 bg-slate-950/60 px-5 py-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Tersinkronisasi dengan Firebase Rules (ABAC Secured)</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {savedBills.length} Tersimpan
          </span>
        </div>
      </div>
    </div>
  );
};
