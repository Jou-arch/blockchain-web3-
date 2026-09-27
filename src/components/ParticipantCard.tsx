import React from "react";
import { CheckCircle2, Clock, Sparkles, QrCode, Copy, Check, ExternalLink, Zap, Shield, Award } from "lucide-react";
import { BillParticipant } from "../types";
import { formatCurrency, formatUsdt, truncateAddress } from "../utils/formatters";

interface ParticipantCardProps {
  participant: BillParticipant;
  currency: string;
  exchangeRate: number;
  hostAddress: string;
  onPayGasless: (participant: BillParticipant) => void;
  onShowQR: (participant: BillParticipant) => void;
}

export const ParticipantCard: React.FC<ParticipantCardProps> = ({
  participant,
  currency,
  exchangeRate,
  hostAddress,
  onPayGasless,
  onShowQR,
}) => {
  const [copiedLink, setCopiedLink] = React.useState<boolean>(false);

  const handleCopyReminder = () => {
    const text = `Halo ${participant.name}! Patungan makan di ReceiptSplit totalnya ${formatCurrency(
      participant.totalFiat,
      currency
    )} atau setara ${formatUsdt(participant.totalUsdt)}.\nBisa bayar crypto bebas gas fee (0 BNB) di BNB Chain ke alamat host: ${hostAddress}`;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all ${
        participant.isPaid
          ? "border-emerald-500/30 bg-emerald-950/10 shadow-lg shadow-emerald-950/20"
          : "border-slate-800 bg-slate-900/80 hover:border-slate-700 shadow-md"
      }`}
    >
      {/* Glow highlight for paid */}
      {participant.isPaid && (
        <div className="absolute top-0 right-0 h-28 w-28 bg-emerald-500/10 blur-2xl pointer-events-none rounded-full" />
      )}

      <div className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-4">
        {/* Header: Name, Avatar, Status Pill */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold text-sm shadow-sm ${
                participant.isPaid
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-800 text-amber-400 border border-slate-700"
              }`}
            >
              {getInitials(participant.name)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">{participant.name}</h3>
                {participant.badge && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                    <Award className="h-3 w-3" />
                    {participant.badge}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">
                Porsi Menu: {formatCurrency(participant.itemsShare, currency)} + Tax/Serv:{" "}
                {formatCurrency(participant.taxAndServiceShare, currency)}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          {participant.isPaid ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
              LUNAS ON-CHAIN
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
              <Clock className="h-3.5 w-3.5" />
              BELUM BAYAR
            </span>
          )}
        </div>

        {/* Pricing Breakdown Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block">Total Tagihan</span>
            <span className="text-base sm:text-lg font-extrabold text-slate-100">
              {formatCurrency(participant.totalFiat, currency)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-400 block">Bayar Crypto (USDT)</span>
            <span className="font-mono text-base sm:text-lg font-extrabold text-amber-400">
              {formatUsdt(participant.totalUsdt)}
            </span>
          </div>
        </div>

        {/* Paid Details or Action Buttons */}
        {participant.isPaid ? (
          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Waktu Settle:</span>
              <span className="text-slate-200">
                {participant.paidAt ? new Date(participant.paidAt).toLocaleTimeString("id-ID") : "Baru saja"}
              </span>
            </div>
            {participant.txHash && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Tx Hash (BSC):</span>
                <a
                  href={`https://bscscan.com/tx/${participant.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
                >
                  {truncateAddress(participant.txHash, 5)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            <div className="rounded-lg bg-emerald-950/30 p-2 text-center text-xs font-medium text-emerald-300 border border-emerald-500/20 flex items-center justify-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span>Disponsori Paymaster ERC-4337 (0 Gas Fee Dibayar Teman)</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {/* Primary Gasless AA Pay Button */}
            <button
              id={`btn-pay-share-${participant.id}`}
              onClick={() => onPayGasless(participant)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-400 active:scale-95 transition"
            >
              <Zap className="h-4 w-4 fill-slate-950" />
              <span>Pay my share with USDT</span>
              <span className="rounded bg-slate-950/20 px-1.5 py-0.5 text-[10px] font-mono">0 BNB Gas</span>
            </button>

            {/* Secondary actions: Instant QR Code & Copy WA reminder */}
            <div className="grid grid-cols-2 gap-2">
              <button
                id={`btn-qr-${participant.id}`}
                onClick={() => onShowQR(participant)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-750 transition"
              >
                <QrCode className="h-3.5 w-3.5 text-amber-400" />
                <span>QR Bayar Instan</span>
              </button>

              <button
                id={`btn-copy-reminder-${participant.id}`}
                onClick={handleCopyReminder}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-750 transition"
                title="Salin pesan pengingat tagihan ke WhatsApp/Telegram"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                <span>{copiedLink ? "Disalin!" : "Bagikan Tagihan"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
