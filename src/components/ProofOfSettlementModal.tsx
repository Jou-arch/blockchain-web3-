import React, { useState } from "react";
import { Award, Sparkles, Copy, Check, X, Share2, ShieldCheck, ExternalLink, Calendar, Store, CheckCircle2 } from "lucide-react";
import { Bill } from "../types";
import { formatCurrency, formatUsdt, truncateAddress, generateTelegramShareMessage } from "../utils/formatters";

interface ProofOfSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill;
}

export const ProofOfSettlementModal: React.FC<ProofOfSettlementModalProps> = ({
  isOpen,
  onClose,
  bill,
}) => {
  const [copiedTelegram, setCopiedTelegram] = useState<boolean>(false);

  if (!isOpen) return null;

  const paidParticipants = bill.participants.filter((p) => p.isPaid);
  const totalPaidUsdt = paidParticipants.reduce((acc, p) => acc + p.totalUsdt, 0);

  const handleCopyTelegram = () => {
    const text = generateTelegramShareMessage(bill);
    navigator.clipboard.writeText(text);
    setCopiedTelegram(true);
    setTimeout(() => setCopiedTelegram(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-950/70">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Proof of Settlement (On-Chain)</h3>
              <p className="text-xs text-slate-400">Bukti patungan & reputasi badge di BNB Chain</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Printable / Shareable Digital Crypto Receipt */}
          <div className="relative rounded-2xl border-2 border-dashed border-amber-500/30 bg-slate-950 p-5 shadow-inner space-y-4">
            {/* Top receipt punch holes effect */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-800">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                BNB SMART CHAIN VERIFIED
              </span>
              <h2 className="text-xl font-black tracking-tight text-white">{bill.merchantName}</h2>
              <p className="text-xs text-slate-400">
                Settle ID: <span className="font-mono text-amber-400">{bill.id}</span> • {bill.date}
              </p>
            </div>

            {/* Financial summary */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Grand Total Kasir:</span>
                <span className="font-semibold">{formatCurrency(bill.grandTotal, bill.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Total Crypto (USDT):</span>
                <span className="font-mono font-bold text-amber-400">
                  {formatUsdt(bill.grandTotal / bill.exchangeRate)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Terkumpul On-Chain:</span>
                <span className="font-mono font-bold text-emerald-400">{formatUsdt(totalPaidUsdt)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Host QRIS/Kasir:</span>
                <span className="font-mono text-slate-400">{truncateAddress(bill.payerAddress, 6)}</span>
              </div>
            </div>

            {/* Participants Status Table */}
            <div className="space-y-2 pt-2 border-t border-dashed border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Status Patungan Peserta
              </span>
              <div className="space-y-2">
                {bill.participants.map((p) => (
                  <div
                    key={p.id}
                    className={`rounded-xl p-2.5 flex items-center justify-between text-xs border ${
                      p.isPaid
                        ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                        : "bg-slate-900 border-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          p.isPaid ? "bg-emerald-400 shadow-sm shadow-emerald-400" : "bg-amber-400"
                        }`}
                      />
                      <div>
                        <span className="font-bold block text-slate-100">{p.name}</span>
                        {p.badge && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
                            <Award className="h-3 w-3" />
                            {p.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold block text-amber-300">{formatUsdt(p.totalUsdt)}</span>
                      <span className="text-[10px]">
                        {p.isPaid ? "✅ LUNAS ON-CHAIN" : "⏳ BELUM SELESAI"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reputational Badges Showcase */}
            <div className="pt-2 border-t border-dashed border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 block mb-2">
                Reputasi Anti-Ghosting & On-Chain Achievements
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                    ⚡
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">Paling Gercep</span>
                    <span className="text-[10px] text-slate-400">Bayar &lt; 5 menit</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    🛡️
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">Zero-Gas Pioneer</span>
                    <span className="text-[10px] text-slate-400">ERC-4337 Sponsored</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 bg-slate-950/80 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white"
          >
            Tutup
          </button>

          <button
            id="btn-copy-telegram-summary"
            onClick={handleCopyTelegram}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-400 active:scale-95 transition"
          >
            {copiedTelegram ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copiedTelegram ? "Format Chat Disalin!" : "Salin Format Chat Grup (Telegram/WA)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
