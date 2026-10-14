/** EIP-6963 multi-wallet discovery — no extra dependencies.
 *
 * MetaMask and Rabby (and others) fight over `window.ethereum` when both are
 * installed. EIP-6963 solves this: each wallet announces itself with metadata,
 * and the user picks exactly one. No silent takeover, no connection races.
 */

export interface EIP1193Provider {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

export interface WalletInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface DiscoveredWallet {
  info: WalletInfo;
  provider: EIP1193Provider;
  /** false for the legacy window.ethereum fallback entry */
  announced: boolean;
}

const KNOWN_INSTALLS: { match: RegExp; url: string; name: string }[] = [
  { match: /metamask/i, url: "https://metamask.io/download/", name: "MetaMask" },
  { match: /rabby/i, url: "https://rabby.io/", name: "Rabby" },
  { match: /coinbase/i, url: "https://www.coinbase.com/wallet", name: "Coinbase Wallet" },
  { match: /phantom/i, url: "https://phantom.com/download", name: "Phantom" },
  { match: /okx/i, url: "https://www.okx.com/web3", name: "OKX Wallet" },
];

export function installLinkFor(name: string): string | null {
  return KNOWN_INSTALLS.find((k) => k.match.test(name))?.url ?? null;
}

export function isWalletMissingError(): { name: string; url: string }[] {
  return [
    { name: "MetaMask", url: "https://metamask.io/download/" },
    { name: "Rabby", url: "https://rabby.io/" },
  ];
}

/** Collect announced (EIP-6963) providers plus the legacy fallback, deduped. */
export function discoverWallets(timeoutMs = 600): Promise<DiscoveredWallet[]> {
  if (typeof window === "undefined") return Promise.resolve([]);
  return new Promise((resolve) => {
    const found = new Map<string, DiscoveredWallet>();
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { info?: WalletInfo; provider?: EIP1193Provider }
        | undefined;
      if (detail?.info?.uuid && detail.provider && !found.has(detail.info.uuid)) {
        found.set(detail.info.uuid, {
          info: detail.info,
          provider: detail.provider,
          announced: true,
        });
      }
    };
    window.addEventListener("mipd:announceProvider", onAnnounce as EventListener);
    window.dispatchEvent(new Event("mipd:requestProvider"));
    setTimeout(() => {
      window.removeEventListener("mipd:announceProvider", onAnnounce as EventListener);
      const out = [...found.values()];
      // Legacy fallback: some setups only inject window.ethereum.
      const legacy = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
      if (legacy && !out.some((w) => w.provider === legacy)) {
        const multi = (legacy as unknown as { providers?: EIP1193Provider[] }).providers;
        if (Array.isArray(multi)) {
          multi.forEach((p, i) => {
            const name =
              (p as unknown as { isMetaMask?: boolean; isRabby?: boolean }).isRabby
                ? `Rabby (${i + 1})`
                : (p as unknown as { isMetaMask?: boolean }).isMetaMask
                  ? `MetaMask (${i + 1})`
                  : `Wallet ${i + 1}`;
            out.push({
              info: { uuid: `legacy-${i}`, name, icon: "", rdns: "" },
              provider: p,
              announced: false,
            });
          });
        } else {
          out.push({
            info: { uuid: "legacy", name: guessLegacyName(legacy), icon: "", rdns: "" },
            provider: legacy,
            announced: false,
          });
        }
      }
      resolve(out);
    }, timeoutMs);
  });
}

function guessLegacyName(p: EIP1193Provider): string {
  const anyP = p as unknown as Record<string, unknown>;
  if (anyP.isRabby) return "Rabby";
  if (anyP.isMetaMask) return "MetaMask";
  return "Browser wallet";
}
