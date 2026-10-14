"use client";

import { useMemo } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { Address } from "viem";
import { CONTRACT_ADDRESS, type IdentityRecord } from "./config";
import { resilientRead } from "./rpc";

export type TxStage = "submitted" | "pending" | "accepted" | "finalized";
export type TxHash = `0x${string}`;

export interface ExecutionOutcome {
  success: boolean;
  message: string;
}

/** Shared GenLayer client (Studio network). */
export function useGenlayerClient() {
  return useMemo(() => createClient({ chain: studionet }), []);
}

export type GenlayerClient = ReturnType<typeof createClient>;

// ---------- reads ----------

export async function readChallenge(client: GenlayerClient, user: string): Promise<string> {
  const res = await resilientRead("get_challenge", () =>
    client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_challenge",
      args: [user],
    })
  );
  return String(res ?? "");
}

export async function readIsVerified(client: GenlayerClient, user: string): Promise<boolean> {
  const res = await resilientRead("is_verified", () =>
    client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "is_verified",
      args: [user],
    })
  );
  return res === true;
}

export async function readIdentity(
  client: GenlayerClient,
  user: string
): Promise<IdentityRecord | null> {
  const res = (await resilientRead("get_identity", () =>
    client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_identity",
      args: [user],
    })
  )) as unknown as Record<string, unknown>;
  if (!res || typeof res !== "object" || res.verified !== true) return null;
  return {
    verified: true,
    platform: String(res.platform ?? ""),
    username: String(res.username ?? ""),
    proof_url: String(res.proof_url ?? ""),
    verified_at: String(res.verified_at ?? ""),
    note: String(res.note ?? ""),
  };
}

export async function readVerifiedList(client: GenlayerClient): Promise<string[]> {
  const res = (await resilientRead("list_verified", () =>
    client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "list_verified",
      args: [],
    })
  )) as unknown;
  if (!Array.isArray(res)) throw new Error("Unexpected RPC response shape: list_verified did not return an array.");
  return res.map(String);
}

// ---------- writes ----------

export async function writeRequestChallenge(client: GenlayerClient): Promise<TxHash> {
  const hash = (await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "request_challenge",
    args: [],
    value: BigInt(0),
  })) as unknown as TxHash;
  return hash;
}

export async function writeVerifyIdentity(
  client: GenlayerClient,
  platform: string,
  username: string,
  proofUrl: string
): Promise<TxHash> {
  const hash = (await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "verify_identity",
    args: [platform.trim().toLowerCase(), username.trim(), proofUrl.trim()],
    value: BigInt(0),
  })) as unknown as TxHash;
  return hash;
}

export async function writeRevoke(client: GenlayerClient): Promise<TxHash> {
  const hash = (await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "revoke",
    args: [],
    value: BigInt(0),
  })) as unknown as TxHash;
  return hash;
}

// ---------- lifecycle ----------

/**
 * Walk a transaction through PENDING -> ACCEPTED -> FINALIZED using only the
 * confirmed genlayer-js API, then inspect the receipt for execution success.
 * Lifecycle status alone is NOT execution success: a tx can finalize with an
 * execution error (no state change).
 */
export async function trackToFinalized(
  client: GenlayerClient,
  hash: TxHash,
  onStage: (stage: TxStage) => void
): Promise<{ receipt: any; outcome: ExecutionOutcome; summary: ConsensusSummary }> {
  onStage("submitted");
  await client.waitForTransactionReceipt({ hash: hash as never, status: "PENDING" as never });
  onStage("pending");
  await client.waitForTransactionReceipt({ hash: hash as never, status: "ACCEPTED" as never });
  onStage("accepted");
  const receipt = (await client.waitForTransactionReceipt({
    hash: hash as never,
    status: "FINALIZED" as never,
  })) as any;
  onStage("finalized");
  return { receipt, outcome: inspectReceipt(receipt), summary: summarizeConsensus(receipt) };
}

export interface ConsensusSummary {
  status: string;
  execution: "SUCCESS" | "FAILED" | "UNKNOWN";
  agree: number;
  idle: number;
  disagree: number;
  totalValidators: number;
  round: number | null;
  rotationsLeft: string | null;
  leader: string | null;
}

/** Best-effort parse of consensus detail from a GenLayer receipt. Never throws. */
export function summarizeConsensus(receipt: any): ConsensusSummary {
  const empty: ConsensusSummary = {
    status: "UNKNOWN",
    execution: "UNKNOWN",
    agree: 0,
    idle: 0,
    disagree: 0,
    totalValidators: 0,
    round: null,
    rotationsLeft: null,
    leader: null,
  };
  try {
    if (!receipt || typeof receipt !== "object") return empty;
    const cd = receipt.consensus_data ?? receipt.consensusData ?? {};
    const leader = cd.leader_receipt?.[0] ?? cd.leaderReceipt?.[0];
    const execution =
      leader?.execution_result === "SUCCESS"
        ? "SUCCESS"
        : leader?.execution_result
          ? "FAILED"
          : "UNKNOWN";
    const names: string[] =
      cd.validator_votes_name ?? cd.validatorVotesName ?? cd.validator_votes ?? [];
    let agree = 0,
      idle = 0,
      disagree = 0;
    for (const v of names) {
      const s = String(v).toUpperCase();
      if (s === "AGREE" || s === "1" || s === "TRUE") agree++;
      else if (s === "IDLE" || s === "5") idle++;
      else disagree++;
    }
    // Numeric-only fallback (1 = agree, 5 = idle observed on Studio).
    if (names.length === 0 && Array.isArray(cd.validator_votes)) {
      for (const v of cd.validator_votes) {
        if (Number(v) === 1) agree++;
        else if (Number(v) === 5) idle++;
        else disagree++;
      }
    }
    const validators: string[] = cd.round_validators ?? cd.roundValidators ?? [];
    return {
      status: String(receipt.status_name ?? receipt.statusName ?? receipt.status ?? "UNKNOWN"),
      execution: execution as ConsensusSummary["execution"],
      agree,
      idle,
      disagree,
      totalValidators: names.length || validators.length,
      round: cd.round != null ? Number(cd.round) : null,
      rotationsLeft: cd.rotations_left != null ? String(cd.rotations_left) : null,
      leader: (cd.leader ?? cd.leader_address ?? null) as string | null,
    };
  } catch {
    return empty;
  }
}
export function inspectReceipt(receipt: any): ExecutionOutcome {
  try {
    const leader = receipt?.consensus_data?.leader_receipt?.[0];
    const result = leader?.execution_result;
    if (result === "SUCCESS") return { success: true, message: "Execution succeeded." };
    const genvm = leader?.genvm_result ?? {};
    const text = [genvm.stdout, genvm.stderr, leader?.error, receipt?.error]
      .filter(Boolean)
      .join("\n");
    return { success: false, message: text || `Execution result: ${result ?? "unknown"}` };
  } catch {
    return { success: false, message: "Could not parse the transaction receipt." };
  }
}

export function shortAddr(a: Address | string): string {
  const s = String(a);
  return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}
