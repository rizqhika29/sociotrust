"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ExternalLink, MinusCircle, XCircle } from "lucide-react";
import { txUrl, shortHash } from "@/lib/config";
import type { ConsensusSummary } from "@/lib/genlayer";
import { CopyButton } from "./CopyButton";

/** AI-consensus detail panel: votes, rounds, execution, raw receipt. */
export function ConsensusPanel({
  hash,
  summary,
  receipt,
}: {
  hash: string;
  summary: ConsensusSummary | null;
  receipt: unknown;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const total = summary?.totalValidators ?? 0;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div className="rounded-2xl border border-ink/10 bg-paper-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base font-bold text-ink">Validator consensus</h3>
        <a
          href={txUrl(hash)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-pine-bright hover:underline"
        >
          {shortHash(hash)} <ExternalLink size={13} />
        </a>
      </div>

      {!summary || total === 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-ink-mute">
          Vote breakdown unavailable from this receipt — open the explorer link for full
          consensus data.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          <VoteBar label="Agree" count={summary.agree} pct={pct(summary.agree)} tone="bg-pine-bright" icon={<CheckCircle2 size={14} />} />
          <VoteBar label="Idle" count={summary.idle} pct={pct(summary.idle)} tone="bg-brass" icon={<MinusCircle size={14} />} />
          {summary.disagree > 0 && (
            <VoteBar label="Disagree" count={summary.disagree} pct={pct(summary.disagree)} tone="bg-oxblood" icon={<XCircle size={14} />} />
          )}
          <dl className="grid grid-cols-2 gap-2 pt-1 text-xs sm:grid-cols-4">
            <Stat label="Execution" value={summary.execution} strong={summary.execution === "SUCCESS"} />
            <Stat label="Lifecycle" value={summary.status} />
            <Stat label="Validators" value={String(total)} />
            <Stat
              label="Rotations left"
              value={summary.rotationsLeft ?? (summary.round != null ? `round ${summary.round}` : "—")}
            />
          </dl>
          <p className="text-[11px] leading-relaxed text-ink-mute">
            Leader proposes, validators independently re-fetch your proof and re-derive the
            verdict. Majority wins; disputes escalate the jury 5 → 11 → 23…
          </p>
        </div>
      )}

      <button
        onClick={() => setShowRaw((v) => !v)}
        aria-expanded={showRaw}
        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-ink-mute hover:text-ink"
      >
        <ChevronDown size={14} className={showRaw ? "rotate-180" : ""} />
        Raw receipt {showRaw ? "(hide)" : "(inspect)"}
      </button>
      {showRaw && (
        <div className="mt-2">
          <pre className="max-h-64 overflow-auto rounded-xl bg-ink p-3 font-mono text-[11px] leading-relaxed text-mint">
            {safeStringify(receipt)}
          </pre>
          <div className="mt-2">
            <CopyButton
              text={safeStringify(receipt)}
              label="Copy receipt JSON"
              className="border-ink/15 text-ink-mute"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function VoteBar({
  label,
  count,
  pct,
  tone,
  icon,
}: {
  label: string;
  count: number;
  pct: number;
  tone: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="flex w-20 items-center gap-1 font-bold text-ink-soft">
        {icon} {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 text-right font-mono font-semibold text-ink">
        {count} · {pct}%
      </span>
    </div>
  );
}

function Stat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-paper-deep px-2.5 py-2">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">{label}</dt>
      <dd className={`mt-0.5 font-mono text-xs font-bold ${strong ? "text-pine-bright" : "text-ink"}`}>
        {value}
      </dd>
    </div>
  );
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(
      v,
      (_k, val) => (typeof val === "bigint" ? `${val.toString()}n` : val),
      2
    ).slice(0, 20000);
  } catch {
    return String(v).slice(0, 2000);
  }
}
