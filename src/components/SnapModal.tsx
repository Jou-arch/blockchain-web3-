import React, { useState, useRef, useEffect } from "react";
import { Camera, Upload, Sparkles, X, AlertCircle, FileText, Check, Coffee, Utensils, Flame } from "lucide-react";
import { Bill } from "../types";

interface SnapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReceiptParsed: (billData: any) => void;
}

const PRESET_RECEIPTS = [
  {
    id: "kopi-kenangan",
    title: "Kopi Kenangan Senopati",
    category: "Coffee & Pastry",
    icon: Coffee,
    amount: "Rp 196.600 (~12.06 USDT)",
    itemsCount: 5,
    sampleChat: "Budi: Kopi Kenangan Mantan, Taufik: Kopi Kenangan Mantan, Siti: Matcha Espresso & Roll, Rian: Americano. Toast dimakan berempat!",
  },
  {
    id: "sushi-tei",
    title: "Sushi Tei Grand Indonesia",
    category: "Japanese Dining",
    icon: Utensils,
    amount: "Rp 483.000 (~29.63 USDT)",
    itemsCount: 5,
    sampleChat: "Kevin & Adit: Salmon Sashimi berdua. Tuna roll bertiga Kevin Adit Nadia. Nadia: Bento. Adit: Ramen. Ocha bagi bertiga.",
  },
  {
    id: "bebek-tepi-sawah",
    title: "Bebek Bengil / Tepi Sawah",
    category: "Indonesian Feast",
    icon: Flame,
    amount: "Rp 374.000 (~22.94 USDT)",
    itemsCount: 4,
    sampleChat: "Dimas & Rama: Bebek Goreng Crispy masing-masing 1. Sambal Mbe & Plecing Kangkung sharing berempat. Es Kelapa Muda Rama & Dimas.",
  },
];

export const SnapModal: React.FC<SnapModalProps> = ({ isOpen, onClose, onReceiptParsed }) => {
  const [activeTab, setActiveTab] = useState<"camera" | "upload" | "presets">("presets");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [groupNotes, setGroupNotes] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera when closing or switching tabs
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen || activeTab !== "camera") {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setCameraError("Kamera tidak dapat diakses di iFrame / izin ditolak. Silakan gunakan fitur Upload Gambar atau Preset Struk.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setImagePreview(dataUrl);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset: typeof PRESET_RECEIPTS[0]) => {
    setGroupNotes(preset.sampleChat);
    // Draw synthetic realistic receipt onto imagePreview
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 600, 800);
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 28px monospace";
      ctx.fillText(preset.title.toUpperCase(), 40, 80);
      ctx.font = "18px monospace";
      ctx.fillText(`TANGGAL: ${new Date().toLocaleDateString("id-ID")}`, 40, 120);
      ctx.fillText("---------------------------------------", 40, 150);
      ctx.font = "bold 20px monospace";
      ctx.fillText("ITEMIZED BILL / STRUK KASIR", 40, 180);
      ctx.font = "18px monospace";
      ctx.fillText("---------------------------------------", 40, 210);
      ctx.fillText("1. Special Menu Set A           Rp 95.000", 40, 250);
      ctx.fillText("2. Side Dishes & Beverage       Rp 75.000", 40, 290);
      ctx.fillText("3. Sharing Platters             Rp 88.000", 40, 330);
      ctx.fillText("---------------------------------------", 40, 380);
      ctx.fillText("SUBTOTAL                        Rp 258.000", 40, 420);
      ctx.fillText("PB1 / TAX (10%)                 Rp  25.800", 40, 460);
      ctx.fillText("SERVICE CHARGE (5%)             Rp  12.900", 40, 500);
      ctx.fillText("=======================================", 40, 540);
      ctx.font = "bold 22px monospace";
      ctx.fillText(`TOTAL AKHIR: ${preset.amount}`, 40, 580);
      ctx.font = "14px monospace";
      ctx.fillText("PAYMENT METHOD: QRIS / CASH (HOST SETTLED)", 40, 630);
      ctx.fillText("TERIMA KASIH ATAS KUNJUNGAN ANDA", 40, 680);
      setImagePreview(canvas.toDataURL("image/jpeg"));
    }
  };

  const handleProcessReceipt = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/receipts/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imagePreview,
          groupNotes,
          currency: "IDR",
        }),
      });
      const resData = await response.json();
      if (resData.success && resData.data) {
        onReceiptParsed({
          ...resData.data,
          source: resData.source,
        });
        onClose();
      } else {
        alert("Gagal memproses struk: " + (resData.warning || "Periksa gambar atau catatan"));
      }
    } catch (err: any) {
      console.error("Error parsing receipt:", err);
      alert("Terjadi kesalahan saat memproses dengan Gemini AI. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Snap & Parse Struk (AI)</h3>
              <p className="text-xs text-slate-400">Gemini 3.8 Flash membaca struk & chat grup otomatis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Tabs */}
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Tab selector */}
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => {
                setActiveTab("presets");
                stopCamera();
              }}
              className={`rounded-lg py-2 text-xs font-medium transition ${
                activeTab === "presets" ? "bg-amber-500 text-slate-950 font-semibold shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Preset Populer
            </button>
            <button
              onClick={() => {
                setActiveTab("upload");
                stopCamera();
              }}
              className={`rounded-lg py-2 text-xs font-medium transition ${
                activeTab === "upload" ? "bg-amber-500 text-slate-950 font-semibold shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Upload Foto
            </button>
            <button
              onClick={() => {
                setActiveTab("camera");
                startCamera();
              }}
              className={`rounded-lg py-2 text-xs font-medium transition ${
                activeTab === "camera" ? "bg-amber-500 text-slate-950 font-semibold shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Kamera Langsung
            </button>
          </div>

          {/* Presets Tab */}
          {activeTab === "presets" && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400">Pilih contoh struk restoran nyata untuk pengujian cepat:</p>
              <div className="grid gap-2">
                {PRESET_RECEIPTS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 transition hover:border-amber-500/50 hover:bg-slate-850"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-amber-400 group-hover:bg-amber-500/20">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-200 text-sm group-hover:text-amber-300">
                              {preset.title}
                            </div>
                            <div className="text-xs text-slate-400">
                              {preset.category} • {preset.itemsCount} menu
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-amber-400">{preset.amount}</span>
                          <span className="block text-[11px] text-slate-400">Klik untuk pakai</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === "upload" && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/50 p-6 text-center hover:border-amber-500/50 transition cursor-pointer"
              >
                <Upload className="h-8 w-8 text-amber-400 mb-2" />
                <span className="text-sm font-medium text-slate-200">Klik untuk unggah foto struk</span>
                <span className="text-xs text-slate-400 mt-1">Mendukung format JPG, PNG, atau WEBP</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Camera Tab */}
          {activeTab === "camera" && (
            <div className="space-y-3">
              {cameraError ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{cameraError}</p>
                    <p className="mt-1 text-slate-300">
                      Anda tetap bisa menggunakan tab "Preset Populer" atau "Upload Foto" di atas.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border border-slate-800">
                  <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
                  <div className="absolute bottom-3 flex items-center justify-center w-full">
                    <button
                      onClick={capturePhoto}
                      className="flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 shadow-lg hover:bg-amber-400 active:scale-95 transition"
                    >
                      <Camera className="h-4 w-4" />
                      Ambil Foto Struk
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Image Preview if selected */}
          {imagePreview && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={imagePreview} alt="Struk Preview" className="h-14 w-12 object-cover rounded border border-slate-700" />
                <div>
                  <span className="text-xs font-medium text-slate-200 block">Foto Struk Siap Dianalisis</span>
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Berhasil dimuat
                  </span>
                </div>
              </div>
              <button
                onClick={() => setImagePreview(null)}
                className="text-xs text-slate-400 hover:text-red-400"
              >
                Ganti Foto
              </button>
            </div>
          )}

          {/* Natural Language Group Chat Notes / Prompt */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              Catatan Chat Grup / Siapa Makan Apa (Opsional)
            </label>
            <p className="text-[11px] text-slate-400">
              Bisa paste chat WhatsApp / Telegram, AI akan otomatis memecah item ke masing-masing orang:
            </p>
            <textarea
              id="input-group-notes"
              rows={3}
              value={groupNotes}
              onChange={(e) => setGroupNotes(e.target.value)}
              placeholder="Contoh: Budi makan nasi goreng, Siti es teh + dimsum berdua sama Budi, sisanya biaya servis dan tax dibagi rata..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 bg-slate-950/80 px-5 py-3.5 flex items-center justify-between">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
          >
            Batal
          </button>

          <button
            id="btn-process-receipt"
            onClick={handleProcessReceipt}
            disabled={isLoading || (!imagePreview && !groupNotes)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-400 active:scale-95 transition disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                <span>Gemini AI Sedang Parsing...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Parse dengan Gemini AI</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
