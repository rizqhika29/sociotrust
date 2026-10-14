"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { type Address, formatEther } from "viem";
import { STUDIONET_CHAIN_ID, STUDIONET_RPC } from "./config";
import { useGenlayerClient } from "./genlayer";
import { discoverWallets, type DiscoveredWallet } from "./wallets";

const STORAGE_KEY = "sociotrust-wallet-uuid";

interface Session {
  address: Address | null;
  connected: boolean;
  connecting: boolean;
  balance: string;
  chainOk: boolean | null;
  walletName: string | null;
  wallets: DiscoveredWallet[];
  discovering: boolean;
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  refreshWallets: () => Promise<void>;
  connectWith: (uuid: string) => Promise<void>;
  switchNetwork: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const client = useGenlayerClient();
  const [address, setAddress] = useState<Address | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [balance, setBalance] = useState("0");
  const [chainOk, setChainOk] = useState<boolean | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const providerRef = useRef<DiscoveredWallet["provider"] | null>(null);

  const activeProvider = useCallback(() => {
    if (providerRef.current) return providerRef.current;
    if (typeof window === "undefined") return null;
    return (window as unknown as { ethereum?: DiscoveredWallet["provider"] }).ethereum ?? null;
  }, []);

  const readChain = useCallback(async () => {
    const p = activeProvider();
    if (!p) {
      setChainOk(null);
      return;
    }
    try {
      const idHex = (await p.request({ method: "eth_chainId" })) as string;
      setChainOk(parseInt(idHex, 16) === STUDIONET_CHAIN_ID);
    } catch {
      setChainOk(null);
    }
  }, [activeProvider]);

  const refreshBalance = useCallback(async () => {
    const p = activeProvider();
    if (!p || !address) return;
    try {
      const bal = (await p.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      })) as string;
      setBalance(formatEther(BigInt(bal)));
    } catch {
      /* keep last known */
    }
  }, [address, activeProvider]);

  const refreshWallets = useCallback(async () => {
    setDiscovering(true);
    try {
      setWallets(await discoverWallets());
    } finally {
      setDiscovering(false);
    }
  }, []);

  const attachListeners = useCallback(
    (p: DiscoveredWallet["provider"]) => {
      const onAccounts = (accs: unknown) => {
        const list = accs as string[];
        setAddress((list?.[0] as Address) ?? null);
        if (!list?.[0]) {
          setBalance("0");
          setWalletName(null);
          providerRef.current = null;
        }
      };
      const onChain = () => readChain();
      try {
        p.on?.("accountsChanged", onAccounts as (...a: unknown[]) => void);
        p.on?.("chainChanged", onChain as (...a: unknown[]) => void);
      } catch {
        /* provider without events support */
      }
    },
    [readChain]
  );

  const connectWith = useCallback(
    async (uuid: string) => {
      const found = wallets.find((w) => w.info.uuid === uuid);
      // Fall back to a fresh discovery in case the modal list is stale.
      const list = found ? wallets : await discoverWallets(300);
      const target = found ?? list.find((w) => w.info.uuid === uuid) ?? list[0];
      if (!target) throw new Error("No Ethereum wallet found. Install MetaMask or Rabby first.");
      setConnecting(true);
      try {
        const accounts = (await target.provider.request({
          method: "eth_requestAccounts",
        })) as string[];
        if (!accounts?.[0]) throw new Error("No accounts returned by wallet.");
        providerRef.current = target.provider;
        setWalletName(target.info.name);
        setAddress(accounts[0] as Address);
        try {
          localStorage.setItem(STORAGE_KEY, target.info.uuid);
        } catch {
          /* private mode */
        }
        attachListeners(target.provider);
        await readChain();
        setModalOpen(false);
      } finally {
        setConnecting(false);
      }
    },
    [wallets, attachListeners, readChain]
  );

  const switchNetwork = useCallback(async () => {
    const p = activeProvider();
    if (!p) throw new Error("No Ethereum wallet found (no active provider).");
    try {
      await p.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${STUDIONET_CHAIN_ID.toString(16)}` }],
      });
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      if (code === 4902) {
        await p.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${STUDIONET_CHAIN_ID.toString(16)}`,
              chainName: "GenLayer Studio",
              rpcUrls: [STUDIONET_RPC],
              nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
            },
          ],
        });
      } else {
        throw e;
      }
    }
    await readChain();
  }, [activeProvider, readChain]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance("0");
    setChainOk(null);
    setWalletName(null);
    providerRef.current = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // Silent reconnect with the previously chosen wallet (no modal popup).
  useEffect(() => {
    let alive = true;
    (async () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      if (!saved) return;
      const list = await discoverWallets();
      if (!alive) return;
      setWallets(list);
      const target = list.find((w) => w.info.uuid === saved);
      if (!target) return;
      try {
        const accounts = (await target.provider.request({
          method: "eth_accounts",
        })) as string[];
        if (accounts?.[0]) {
          providerRef.current = target.provider;
          setWalletName(target.info.name);
          setAddress(accounts[0] as Address);
          attachListeners(target.provider);
          await readChain();
        }
      } catch {
        /* wallet locked — user can reconnect via modal */
      }
    })();
    return () => {
      alive = false;
    };
  }, [attachListeners, readChain]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance, client]);

  const value = useMemo(
    () => ({
      address,
      connected: !!address,
      connecting,
      balance,
      chainOk,
      walletName,
      wallets,
      discovering,
      modalOpen,
      setModalOpen,
      refreshWallets,
      connectWith,
      switchNetwork,
      disconnect,
      refreshBalance,
    }),
    [
      address,
      connecting,
      balance,
      chainOk,
      walletName,
      wallets,
      discovering,
      modalOpen,
      refreshWallets,
      connectWith,
      switchNetwork,
      disconnect,
      refreshBalance,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
