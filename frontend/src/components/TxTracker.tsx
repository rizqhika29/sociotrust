"use client";

import { CheckCircle2, CircleDashed, ExternalLink, Loader2, XCircle } from "lucide-react";
import { txUrl, shortHash } from "@/lib/config";
import type { TxStage } from "@/lib/genlayer";

const STAGES: { id: Exclude<TxStage, "submitted">; label: string; hint: string }[] = [
  { id: "pending", label: "Pending", hint: "Validators assigned, evaluating your proof" },
  { id: "accepted", label: "Accepted", hint: "Majority agreed — optimistic acceptance" },
  { id: "finalized", label: "Finalized", hint: "Locked on-chain after appeal window" },
];

const order: Record<TxStage, number> = { submitted: 0, pending: 1, accepted: 2, finalized: 3 };

export function TxTracker({
  hash,
  stage,
  error,
  success,
}: {
  hash: string | null;
  stage: TxStage;
  error: string | null;
  success: boolean | null;
}) {
  if (!hash) return null;
  return (
    <div className="rounded-2xl border border-ink/10 bg-ink text-paper shadow-seal" role="status" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper/10 px-5 py-3">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-mint">Transaction</span>
        <a
          href={txUrl(hash)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-brass-bright hover:underline"
        >
          {shortHash(hash)}
          <ExternalLink size={13} />
        </a>
      </div>
      <ol className="space-y-1 px-5 py-4">
        {STAGES.map((s) => {
          const reached = order[stage] >= order[s.id];
          const current = stage === s.id;
          const failedHere = !!error && current;
          return (
            <li key={s.id} className="flex items-start gap-3 py-1">
              {failedHere ? (
                <XCircle size={18} className="mt-0.5 shrink-0 text-clay" />
              ) : reached ? (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-mint" />
              ) : current ? (
                <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin text-brass-bright" />
              ) : (
                <CircleDashed size={18} className="mt-0.5 shrink-0 text-paper/30" />
              )}
              <div>
                <p className={`text-sm font-bold ${reached || current ? "text-paper" : "text-paper/40"}`}>
                  {s.label}
                </p>
                <p className="text-xs text-paper/55">{s.hint}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {error && (
        <p className="border-t border-paper/10 px-5 py-3 text-xs leading-relaxed text-clay">
          {error}
        </p>
      )}
      {success && stage === "finalized" && (
        <p className="border-t border-paper/10 px-5 py-3 text-xs font-semibold text-mint">
          Execution succeeded — state updated on-chain.
        </p>
      )}
    </div>
  );
}
