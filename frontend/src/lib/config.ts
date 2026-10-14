import type { Address } from "viem";

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "0x9aE81BD3083A8D8CE24b256c02652B84fB8f5121") as Address;

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
  {
    id: "github",
    label: "GitHub Gist",
    hint: "A public gist under YOUR GitHub account — ownership is checked against the GitHub API",
  },
] as const;

export type PlatformId = (typeof SUPPORTED_PLATFORMS)[number]["id"];

export interface IdentityRecord {
  verified: boolean;
  platform: string;
  username: string;
  proof_url: string;
  gist_id: string;
  verified_at: string;
  note: string;
}
