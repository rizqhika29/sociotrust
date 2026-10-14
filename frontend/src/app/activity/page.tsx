"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import { useGenlayerClient, readVerifiedList, readIdentity } from "@/lib/genlayer";
import type { IdentityRecord } from "@/lib/config";
import { mapReadError, type FriendlyError } from "@/lib/errors";
import { SectionHeading } from "@/components/SectionHeading";
import { IdentityCard } from "@/components/IdentityCard";

const PAGE_SIZE = 9;

export default function ActivityPage() {
  const client = useGenlayerClient();
  const [loading, setLoading] = useState(true);
  const [limited, setLimited] = useState(false);
  const [rows, setRows] = useState<{ address: string; identity: IdentityRecord }[]>([]);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<FriendlyError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await readVerifiedList(client);
      setTotal(list.length);
      // Read newest-first, capped to protect Studio rate limits (60 req/min).
      const slice = list.slice(-PAGE_SIZE).reverse();
      setLimited(list.length > PAGE_SIZE);
      const out = [];
      for (const addr of slice) {
        try {
          const ident = await readIdentity(client, addr);
          if (ident) out.push({ address: addr, identity: ident });
        } catch {
          /* skip entries that fail to read */
        }
      }
      setRows(out);
    } catch (e) {
      setRows([]);
      setLoadError(mapReadError(e));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-mute hover:text-ink">
          <ArrowLeft size={15} /> Home
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="The registry"
            title={`Sealed identities${total ? ` (${total})` : ""}`}
            lede="Every entry below was adjudicated by validator consensus — click through to its dossier."
          />
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-ink/15 bg-paper-card px-4 py-2.5 text-sm font-bold text-ink hover:bg-paper-deep disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            {loading ? "Reading…" : "Refresh"}
          </button>
        </div>

        {loading ? (
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-ink/5" />
            ))}
          </div>
        ) : loadError ? (
          <div className="mt-8 rounded-2xl border border-clay/30 bg-clay-pale p-8" role="alert">
            <p className="font-display text-xl font-bold text-oxblood">{loadError.title}</p>
            <p className="mt-1 font-mono text-xs text-ink-soft">{loadError.detail}</p>
            <p className="mt-2 text-sm text-ink-soft">{loadError.hint}</p>
            {loadError.retryable && (
              <button
                onClick={load}
                className="mt-4 rounded-xl bg-ink px-4 py-2 text-xs font-bold text-paper"
              >
                Retry
              </button>
            )}
          </div>
        ) : rows.length > 0 ? (
          <>
            {limited && (
              <p className="mt-6 rounded-xl border border-brass/40 bg-brass-pale px-4 py-2.5 text-xs font-semibold text-ink-soft">
                Showing the {PAGE_SIZE} newest seals to respect Studio rate limits.
              </p>
            )}
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {rows.map((r) => (
                <IdentityCard key={r.address} address={r.address} identity={r.identity} />
              ))}
            </div>
          </>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-ink/20 bg-paper-card p-12 text-center">
            <p className="font-display text-xl font-bold text-ink">
              {total === 0 ? "No seals yet — the ledger awaits its first entry." : "Could not read the registry."}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-mute">
              {total === 0
                ? "Be the first to stamp an identity on-chain."
                : "The network may be rate-limiting reads. Wait a moment and refresh."}
            </p>
            <Link
              href="/verify"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-pine px-5 py-2.5 text-sm font-bold text-paper hover:bg-pine-bright"
            >
              Get verified <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
