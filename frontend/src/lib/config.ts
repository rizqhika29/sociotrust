import type { Address } from "viem";

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "0x71612446a1f9834Af9c495D12FC495EbD10FAC92") as Address;

export const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_EXPLORER ?? "https://explorer-studio.genlayer.com";

export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_RPC = "https://studio.genlayer.com/api";

export const txUrl = (hash: string) => `${EXPLORER_BASE}/tx/${hash}`;

export const shortHash = (hash: string) =>
  hash.length > 16 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash;

export const shortAddress = (addr: string) =>
  addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

export const SUPPORTED_PLATFORMS = [
  { id: "github", label: "GitHub", hint: "Public gist or profile page containing your challenge" },
  { id: "gist", label: "Gist / Paste", hint: "Any public raw-text URL, e.g. gist, paste.rs" },
  { id: "x", label: "X (Twitter)", hint: "A public post containing your challenge" },
  { id: "twitter", label: "Twitter", hint: "Same as X — kept for compatibility" },
  { id: "blog", label: "Blog / Site", hint: "Any public page you control" },
] as const;

export type PlatformId = (typeof SUPPORTED_PLATFORMS)[number]["id"];

export interface IdentityRecord {
  verified: boolean;
  platform: string;
  username: string;
  proof_url: string;
  verified_at: string;
  note: string;
}
