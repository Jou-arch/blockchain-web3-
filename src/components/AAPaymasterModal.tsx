import React, { useState } from "react";
import { Zap, ShieldCheck, CheckCircle2, ArrowRight, ExternalLink, Sparkles, X, Award, Flame, AlertCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { BillParticipant, SettlementResult, SmartWalletInfo } from "../types";
import { formatCurrency, formatUsdt, truncateAddress } from "../utils/formatters";

interface AAPaymasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: BillParticipant | null;
  billId: string;
  hostAddress: string;
  currency: string;
  smartWallet: SmartWalletInfo;
  onPaymentSuccess: (participantId: string, settlement: SettlementResult) => void;
}

export const AAPaymasterModal: React.FC<AAPaymasterModalProps> = ({
  isOpen,
  onClose,
  participant,
  billId,
  hostAddress,
  currency,
  smartWallet,
  onPaymentSuccess,
}) => {
  const [step, setStep] = useState<"review" | "processing" | "success">("review");
  const [processStage, setProcessStage] = useState<string>("Inisialisasi UserOperation...");
  const [settlementResult, setSettlementResult] = useState<SettlementResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !participant) return null;

  const handleExecuteSponsoredPay = async () => {
    setStep("processing");
    setErrorMsg(null);

    try {
      // Step 1: UserOp preparation
      setProcessStage("Membungkus UserOperation ERC-4337...");
      await new Promise((r) => setTimeout(r, 600));

      // Step 2: Paymaster sponsorship
      setProcessStage("Meminta sponsor gas ke ReceiptSplit Paymaster di BNB Chain...");
      await new Promise((r) => setTimeout(r, 800));

      // Step 3: Call server API
      const res = await fetch("/api/aa/sponsor-userop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId,
          participantId: participant.id,
          participantName: participant.name,
          recipientAddress: hostAddress,
          amountUsdt: participant.totalUsdt,
          userSmartAccountAddress: smartWallet.address,
          paymasterMode: "ZERO_GAS_SPONSORED",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal membundel transaksi UserOp");
      }

      setProcessStage("Mengonfirmasi settlement di Smart Contract BNB Chain...");
      await new Promise((r) => setTimeout(r, 700));

      const result: SettlementResult = data.settlement;
      setSettlementResult(result);
      setStep("success");

      // Trigger Confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#f59e0b", "#10b981", "#38bdf8", "#eab308"],
      });

      onPaymentSuccess(participant.id, result);
    } catch (err: any) {
      console.error("Execution error:", err);
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses Paymaster.");
      setStep("review");
    }
  };

  const handleDone = () => {
    setStep("review");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-950/70">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <Zap className="h-4 w-4 fill-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">ERC-4337 Account Abstraction</h3>
              <p className="text-xs text-slate-400">Zero-Gas Paymaster Settlement on BNB Chain</p>
            </div>
          </div>
          {step !== "processing" && (
            <button
              onClick={handleDone}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {step === "review" && (
            <>
              {/* Participant & Amount Hero Card */}
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-4 sm:p-5 text-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Bayar Bagian: <strong className="text-amber-300">{participant.name}</strong>
                </span>
                <div className="mt-1 flex items-baseline justify-center gap-2">
                  <span className="font-mono text-3xl sm:text-4xl font-extrabold text-amber-400">
                    {formatUsdt(participant.totalUsdt)}
                  </span>
                </div>
                <span className="text-xs text-slate-400 block mt-1">
                  ≈ {formatCurrency(participant.totalFiat, currency)} (Kurs: 1 USDT = 16.300 IDR)
                </span>
              </div>

              {/* Paymaster Zero-Gas Feature Card */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs sm:text-sm">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>Sponsor Gas Fee Aktif: 0 BNB Dibutuhkan</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Teman tidak perlu pusing beli BNB di exchange atau memahami gas fee.
                  Transaksi ini dibungkus <strong>ERC-4337 UserOperation</strong> dan gas fee sebesar{" "}
                  <span className="font-mono text-emerald-400">~0.00038 BNB ($0.23)</span> disubsidi langsung oleh{" "}
                  <strong>ReceiptSplit Paymaster</strong>.
                </p>
              </div>

              {/* Transaction Specs */}
              <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Smart Account Pengirim:</span>
                  <span className="font-mono text-slate-200">{truncateAddress(smartWallet.address, 6)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Penerima (Kasir / Host):</span>
                  <span className="font-mono text-slate-200">{truncateAddress(hostAddress, 6)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Token & Jaringan:</span>
                  <span className="font-semibold text-amber-300">USDT (BEP-20) • BNB Chain</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Saldo BNB Dibutuhkan:</span>
                  <span className="font-bold text-emerald-400">0.00 BNB (GRATIS)</span>
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          )}

          {step === "processing" && (
            <div className="py-8 text-center space-y-5">
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-amber-500/20" />
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-amber-500 border-t-transparent shadow-lg shadow-amber-500/30" />
                <Zap className="absolute h-7 w-7 text-amber-400 fill-amber-400" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-white">Memproses Settle On-Chain</h4>
                <p className="font-mono text-xs text-amber-400 animate-pulse">{processStage}</p>
                <p className="text-xs text-slate-400">Membungkus UserOp ERC-4337 • Bundler BNB Chain</p>
              </div>
            </div>
          )}

          {step === "success" && settlementResult && (
            <div className="py-4 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-bold text-white">Pembayaran Sukses & Lunas!</h4>
                <p className="text-xs text-slate-300">
                  Bagian {participant.name} sebesar{" "}
                  <strong className="text-amber-400">{formatUsdt(participant.totalUsdt)}</strong> telah tercatat di
                  Smart Contract BNB Chain.
                </p>
              </div>

              {/* Awarded Badge */}
              <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-yellow-500/15 to-amber-500/10 p-4 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 block mb-1">
                  Reputation Badge Earned 🎖️
                </span>
                <div className="flex items-center justify-center gap-2">
                  <Award className="h-5 w-5 text-amber-400" />
                  <span className="text-base font-extrabold text-white">{settlementResult.awardedBadge}</span>
                </div>
                <span className="text-[11px] text-slate-300 mt-1 block">
                  +25 Reputasi Anti-Ghosting on BNB Chain
                </span>
              </div>

              {/* BSCScan Tx link */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs space-y-1 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status Settlement:</span>
                  <span className="font-bold text-emerald-400">VERIFIED ON-CHAIN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Blok BNB Chain:</span>
                  <span className="font-mono text-slate-300">#{settlementResult.blockNumber}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Bukti TxHash:</span>
                  <a
                    href={settlementResult.bscScanUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    {truncateAddress(settlementResult.txHash, 6)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 bg-slate-950/80 px-5 py-4">
          {step === "review" && (
            <button
              id="btn-confirm-gasless-pay"
              onClick={handleExecuteSponsoredPay}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-yellow-400 active:scale-95 transition"
            >
              <Zap className="h-4 w-4 fill-slate-950" />
              <span>Konfirmasi Bayar {formatUsdt(participant.totalUsdt)} (0 BNB Gas)</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {step === "success" && (
            <button
              id="btn-done-paymaster"
              onClick={handleDone}
              className="w-full rounded-xl bg-slate-800 py-3 text-sm font-semibold text-white hover:bg-slate-700 active:scale-95 transition"
            >
              Selesai & Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
