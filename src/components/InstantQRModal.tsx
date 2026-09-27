import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { QrCode, X, Copy, Check, ExternalLink, Zap, ShieldCheck } from "lucide-react";
import { BillParticipant, SettlementResult } from "../types";
import { formatCurrency, formatUsdt, truncateAddress } from "../utils/formatters";

interface InstantQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: BillParticipant | null;
  hostAddress: string;
  currency: string;
  billId: string;
  onPaymentSuccess: (participantId: string, settlement: SettlementResult) => void;
}

export const InstantQRModal: React.FC<InstantQRModalProps> = ({
  isOpen,
  onClose,
  participant,
  hostAddress,
  currency,
  billId,
  onPaymentSuccess,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  useEffect(() => {
    if (!participant || !isOpen) return;

    // EIP-681 / BEP-20 standard transfer URI or direct address payment URI on BNB Chain
    const usdtContract = "0x55d398326f99059fF775485246999027B3197955"; // BSC Mainnet USDT
    const amountInWei = Math.round(participant.totalUsdt * 1e18).toString();
    const paymentPayload = `ethereum:${usdtContract}@56/transfer?address=${hostAddress}&uint256=${amountInWei}`;

    QRCode.toDataURL(paymentPayload, {
      width: 280,
      margin: 2,
      color: {
        dark: "#030712",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR generation error:", err));
  }, [participant, isOpen, hostAddress]);

  if (!isOpen || !participant) return null;

  const handleCopyHost = () => {
    navigator.clipboard.writeText(hostAddress);
    setCopiedHostAddress();
  };

  const setCopiedHostAddress = () => {
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleSimulateScanPaid = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch("/api/aa/sponsor-userop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId,
          participantId: participant.id,
          participantName: participant.name,
          recipientAddress: hostAddress,
          amountUsdt: participant.totalUsdt,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onPaymentSuccess(participant.id, data.settlement);
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white">QR Bayar Instan (BNB Chain)</h3>
              <p className="text-xs text-slate-400">Scan via Trust Wallet, Binance, atau MetaMask</p>
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
        <div className="p-5 text-center space-y-4">
          {/* Target Amount */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <span className="text-xs text-slate-400 block">
              Tagihan untuk <strong className="text-amber-300">{participant.name}</strong>
            </span>
            <span className="font-mono text-2xl font-bold text-amber-400 block mt-0.5">
              {formatUsdt(participant.totalUsdt)}
            </span>
            <span className="text-xs text-slate-400">≈ {formatCurrency(participant.totalFiat, currency)}</span>
          </div>

          {/* QR Code Canvas */}
          <div className="mx-auto flex flex-col items-center justify-center rounded-2xl bg-white p-4 shadow-xl border-4 border-amber-500/30 w-fit">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="BNB Chain USDT QR Code" className="h-56 w-56 object-contain" />
            ) : (
              <div className="h-56 w-56 flex items-center justify-center text-slate-500 text-xs">
                Membuat QR Code...
              </div>
            )}
            <span className="text-[11px] font-bold text-slate-900 mt-1">BNB Smart Chain • USDT BEP-20</span>
          </div>

          {/* Recipient Address */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-left">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Alamat Dompet Penerima (Host):</span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-slate-200">{truncateAddress(hostAddress, 8)}</span>
              <button
                onClick={handleCopyHost}
                className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition"
              >
                {copiedAddress ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedAddress ? "Tersalin" : "Salin"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 bg-slate-950/80 px-5 py-3.5 flex items-center justify-between">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
          >
            Tutup
          </button>

          <button
            id="btn-simulate-qr-paid"
            onClick={handleSimulateScanPaid}
            disabled={isSimulating}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition active:scale-95 disabled:opacity-50"
          >
            <Zap className="h-3.5 w-3.5 fill-slate-950" />
            <span>{isSimulating ? "Memverifikasi..." : "Simulasikan Scan Sukses"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
