"use client";

import { LogOut, PlugZap, TriangleAlert, Wallet } from "lucide-react";
import { useSession } from "@/lib/session";
import { shortAddr } from "@/lib/genlayer";

export function WalletButton({ compact = false }: { compact?: boolean }) {
  const {
    address,
    connected,
    connecting,
    balance,
    chainOk,
    walletName,
    switchNetwork,
    disconnect,
    setModalOpen,
  } = useSession();

  if (!connected) {
    return (
      <button
        onClick={() => setModalOpen(true)}
        disabled={connecting}
        className="inline-flex items-center gap-2 rounded-xl bg-pine px-4 py-2.5 text-sm font-bold text-paper shadow-seal transition hover:bg-pine-bright disabled:opacity-60"
      >
        <PlugZap size={16} />
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {chainOk === false && (
        <button
          onClick={() => switchNetwork().catch(() => {})}
          className="inline-flex items-center gap-1.5 rounded-xl bg-clay px-3 py-2 text-xs font-bold text-paper hover:brightness-110"
          title="Switch to GenLayer Studio network (chain 61999)"
        >
          <TriangleAlert size={14} />
          {!compact && "Switch network"}
        </button>
      )}
      <span
        className="inline-flex items-center gap-2 rounded-xl border border-ink/15 bg-paper-card px-3 py-2 text-sm"
        title={`${walletName ?? "wallet"} · ${address} · ${balance} GEN`}
      >
        <Wallet size={15} className="text-pine-bright" />
        <span className="font-mono font-semibold text-ink">{shortAddr(address!)}</span>
        {!compact && (
          <span className="text-xs font-semibold text-ink-mute">
            {Number(balance).toFixed(2)} GEN{walletName ? ` · ${walletName}` : ""}
          </span>
        )}
      </span>
      <button
        onClick={disconnect}
        className="rounded-xl border border-ink/15 p-2 text-ink-mute hover:bg-ink/5"
        title="Disconnect"
      >
        <LogOut size={15} />
      </button>
    </div>
  );
}
