"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Download, Loader2, Wallet, X } from "lucide-react";
import { useSession } from "@/lib/session";
import { isWalletMissingError } from "@/lib/wallets";
import { mapError } from "@/lib/errors";

/** Wallet picker — the user chooses exactly one provider. No silent races. */
export function WalletModal() {
  const {
    modalOpen,
    setModalOpen,
    wallets,
    discovering,
    refreshWallets,
    connectWith,
    connecting,
  } = useSession();

  useEffect(() => {
    if (modalOpen) refreshWallets();
  }, [modalOpen, refreshWallets]);

  if (!modalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Choose wallet"
      onClick={() => setModalOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-paper-card p-6 shadow-seal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <Wallet size={20} className="text-pine-bright" /> Choose wallet
          </h2>
          <button
            onClick={() => setModalOpen(false)}
            className="rounded-lg p-1.5 text-ink-mute hover:bg-ink/5"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-xs text-ink-mute">
          MetaMask and Rabby both work. Pick one — they won&apos;t fight over the connection.
        </p>

        <div className="mt-4 space-y-2">
          {discovering && wallets.length === 0 && (
            <p className="flex items-center gap-2 rounded-xl bg-paper-deep px-4 py-3 text-sm font-semibold text-ink-mute">
              <Loader2 size={15} className="animate-spin" /> Detecting wallets…
            </p>
          )}
          {wallets.map((w) => (
            <button
              key={w.info.uuid}
              disabled={connecting}
              onClick={() =>
                connectWith(w.info.uuid).catch((e) => {
                  const f = mapError(e);
                  toast.error(f.title, { description: f.detail });
                })
              }
              className="flex w-full items-center gap-3 rounded-xl border border-ink/12 bg-paper px-4 py-3 text-left transition hover:border-pine-bright disabled:opacity-60"
            >
              {w.info.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.info.icon} alt="" width={28} height={28} className="rounded-lg" />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pine font-display text-sm font-bold text-brass-bright">
                  {w.info.name.slice(0, 1)}
                </span>
              )}
              <span className="flex-1">
                <span className="block text-sm font-bold text-ink">{w.info.name}</span>
                <span className="block text-[11px] text-ink-mute">
                  {w.announced ? "Detected via EIP-6963" : "Browser-injected provider"}
                </span>
              </span>
              {connecting && <Loader2 size={15} className="animate-spin text-pine-bright" />}
            </button>
          ))}
        </div>

        {wallets.length === 0 && !discovering && (
          <div className="mt-4 rounded-xl border border-dashed border-ink/20 p-4">
            <p className="text-sm font-bold text-ink">No wallet detected</p>
            <p className="mt-0.5 text-xs text-ink-mute">Install one to continue:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {isWalletMissingError().map((w) => (
                <a
                  key={w.name}
                  href={w.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-pine px-3 py-1.5 text-xs font-bold text-paper hover:bg-pine-bright"
                >
                  <Download size={13} /> {w.name}
                </a>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={refreshWallets}
          className="mt-3 w-full text-center text-xs font-bold text-ink-mute hover:text-ink"
        >
          Re-scan for wallets
        </button>
      </div>
    </div>
  );
}
