import React, { useState } from "react";
import {
  Receipt,
  Sparkles,
  ShieldCheck,
  Smartphone,
  History,
  LogIn,
  LogOut,
  User as UserIcon,
  CloudCheck,
  ChevronDown,
} from "lucide-react";
import { SmartWalletInfo } from "../types";
import { truncateAddress } from "../utils/formatters";
import { useAuth } from "../firebase/authContext";

interface NavbarProps {
  smartWallet: SmartWalletInfo;
  isTelegramView: boolean;
  setIsTelegramView: (val: boolean) => void;
  onOpenWalletModal: () => void;
  onNewReceipt: () => void;
  onOpenHistoryModal: () => void;
  savedBillsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  smartWallet,
  isTelegramView,
  setIsTelegramView,
  onOpenWalletModal,
  onNewReceipt,
  onOpenHistoryModal,
  savedBillsCount,
}) => {
  const { currentUser, loading, signInWithGoogle, signOutUser } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 shadow-md shadow-amber-500/20 text-slate-950">
            <Receipt className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">ReceiptSplit</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/20">
                <Sparkles className="h-3 w-3" />
                BNB Chain
              </span>
            </div>
            <p className="hidden text-xs text-slate-400 sm:block">
              AI Bill Splitter • Firebase Backend • Zero-Gas Account Abstraction
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Riwayat Struk (Firestore) Button */}
          <button
            id="btn-nav-history"
            onClick={onOpenHistoryModal}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-700 hover:bg-slate-800 transition"
            title="Buka Riwayat Struk dari Cloud Firestore"
          >
            <History className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">Riwayat</span>
            {savedBillsCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/20 px-1 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                {savedBillsCount}
              </span>
            )}
          </button>

          {/* Telegram / Mobile View Toggle */}
          <button
            id="btn-toggle-telegram-view"
            onClick={() => setIsTelegramView(!isTelegramView)}
            className={`hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition md:flex ${
              isTelegramView
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
            title="Toggle Telegram Mini App Frame Preview"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>{isTelegramView ? "Telegram Frame: ON" : "Telegram Frame"}</span>
          </button>

          {/* New Receipt Action */}
          <button
            id="btn-nav-snap"
            onClick={onNewReceipt}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:from-amber-400 hover:to-yellow-400 active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Snap Struk</span>
          </button>

          {/* Smart Account / Wallet pill */}
          <button
            id="btn-nav-wallet"
            onClick={onOpenWalletModal}
            className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-700 hover:bg-slate-850"
          >
            <div className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="flex flex-col items-start text-left">
              <div className="flex items-center gap-1">
                <span className="font-mono text-[11px] text-amber-300">
                  {truncateAddress(smartWallet.address)}
                </span>
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
              </div>
              <span className="text-[10px] text-slate-400">
                {smartWallet.usdtBalance.toFixed(1)} USDT • 0 BNB Gas
              </span>
            </div>
          </button>

          {/* Firebase Authentication / Google Sign-In */}
          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-800" />
          ) : currentUser ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-slate-700 transition"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "User"}
                    className="h-6 w-6 rounded-full object-cover ring-1 ring-amber-500/50"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs">
                    {(currentUser.displayName || currentUser.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden md:inline max-w-[100px] truncate text-slate-200 text-xs">
                  {currentUser.displayName || currentUser.email?.split("@")[0]}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-xl z-50">
                  <div className="border-b border-slate-800 px-3 py-2">
                    <p className="text-xs font-semibold text-white truncate">
                      {currentUser.displayName || "Pengguna Firebase"}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400">
                      <CloudCheck className="h-3 w-3" />
                      <span>Cloud Firestore Aktif</span>
                    </div>
                  </div>
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenHistoryModal();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition"
                    >
                      <History className="h-3.5 w-3.5 text-amber-400" />
                      <span>Lihat Riwayat Struk ({savedBillsCount})</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        signOutUser();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 transition mt-1"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              id="btn-google-login"
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition active:scale-95 shadow-sm"
              title="Masuk dengan Google untuk menyimpan struk ke Cloud Firestore"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isSigningIn ? "Masuk..." : "Google Sign-In"}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
