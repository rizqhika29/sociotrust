"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, RotateCcw, ShieldAlert } from "lucide-react";
import { txUrl } from "@/lib/config";
import type { FriendlyError } from "@/lib/errors";
import { CopyButton } from "./CopyButton";

/** Structured error display: friendly guidance + raw detail + explorer + retry. */
export function ErrorPanel({
  error,
  hash,
  onRetry,
  retryLabel = "Dismiss & retry",
}: {
  error: FriendlyError;
  hash: string | null;
  onRetry: () => void;
  retryLabel?: string;
}) {
  const [showRaw, setShowRaw] = useState(false);
  return (
    <div className="rounded-2xl border border-clay/30 bg-clay-pale p-5" role="alert">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-oxblood">
        <ShieldAlert size={19} /> {error.title}
      </h3>
      <p className="mt-1.5 font-mono text-xs leading-relaxed text-ink-soft">{error.detail}</p>
      <p className="mt-2 text-sm text-ink-soft">{error.hint}</p>
      <button
        onClick={() => setShowRaw((v) => !v)}
        aria-expanded={showRaw}
        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-ink-mute hover:text-ink"
      >
        <ChevronDown size={14} className={showRaw ? "rotate-180" : ""} />
        Technical detail
      </button>
      {showRaw && (
        <div className="mt-2 rounded-xl bg-ink p-3 font-mono text-[11px] leading-relaxed text-mint">
          <p>title: {error.title}</p>
          <p>retryable: {String(error.retryable)}</p>
          {hash && <p>tx: {hash}</p>}
          <div className="mt-2">
            <CopyButton
              text={`[${error.title}] ${error.detail} ${hash ? `(tx ${hash})` : ""}`}
              label="Copy error"
              className="border-paper/20 text-paper/70"
            />
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {hash && (
          <a
            href={txUrl(hash)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 bg-paper-card px-3 py-1.5 text-xs font-bold text-ink hover:bg-paper"
          >
            Inspect in explorer <ExternalLink size={13} />
          </a>
        )}
        {error.retryable && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-paper"
          >
            <RotateCcw size={13} /> {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
