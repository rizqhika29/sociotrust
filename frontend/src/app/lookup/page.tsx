"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { isAddress } from "viem";
import { ArrowLeft, ScanSearch, ShieldX, Wallet, Radar } from "lucide-react";
import { useSession } from "@/lib/session";
import { useGenlayerClient, readIdentity, readIsVerified } from "@/lib/genlayer";
import type { IdentityRecord } from "@/lib/config";
import { mapReadError } from "@/lib/errors";
import { IdentityCard } from "@/components/IdentityCard";
import { Seal } from "@/components/Seal";
import { CopyButton } from "@/components/CopyButton";

function LookupBody() {
  const client = useGenlayerClient();
  const params = useSearchParams();
  const { address: mine, connected } = useSession();
  const [input, setInput] = useState(params.get("address") ?? "");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState<string | null>(null);
  const [result, setResult] = useState<IdentityRecord | null | undefined>(undefined);
  const [liveCheck, setLiveCheck] = useState<"idle" | "checking" | "alive" | "dead" | "blocked">("idle");
  const [liveSnippet, setLiveSnippet] = useState("");

  const lookup = useCallback(
    async (addr: string) => {
      const a = addr.trim();
      if (!a) {
        toast.error("Address required", { description: "Paste a wallet address to inspect." });
        return;
      }
      // Security: never send attacker-shaped input to the contract call.
      if (!isAddress(a)) {
        toast.error("Invalid address", {
          description: "Must be a 20-byte 0x address (40 hex characters).",
        });
        return;
      }
      setLoading(true);
      setSearched(a);
      setLiveCheck("idle");
      setLiveSnippet("");
      try {
        const ok = await readIsVerified(client, a);
        setResult(ok ? await readIdentity(client, a) : null);
      } catch (e) {
        const f = mapReadError(e);
        toast.error(f.title, { description: `${f.detail} ${f.hint}` });
        setResult(undefined);
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  /** Informational only: try fetching the proof URL from THIS browser.
   * Consensus already happened on-chain; this just shows liveness.
   * Many sites block cross-origin reads — that is expected, not a failure. */
  const recheckProof = useCallback(async (url: string, username: string) => {
    setLiveCheck("checking");
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) {
        setLiveCheck("dead");
        setLiveSnippet(`HTTP ${res.status} — page missing or private.`);
        return;
      }
      const text = (await res.text()).slice(0, 4000);
      const hit = text.toLowerCase().includes(username.toLowerCase());
      setLiveCheck(hit ? "alive" : "dead");
      setLiveSnippet(
        hit
          ? "Username still present in the live page (first 4k chars checked)."
          : "Live page fetched, but the username was not found in it."
      );
    } catch {
      setLiveCheck("blocked");
      setLiveSnippet(
        "Browser blocked the cross-origin read (CORS) — normal for most sites. Trust the on-chain validator evidence instead."
      );
    }
  }, []);

  useEffect(() => {
    const preset = params.get("address");
    if (preset) {
      setInput(preset);
      if (isAddress(preset.trim())) lookup(preset);
      else
        toast.error("Invalid address in link", {
          description: "The ?address= parameter is not a valid 0x address.",
        });
    }
    // run once on mount for shared links
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-mute hover:text-ink">
          <ArrowLeft size={15} /> Home
        </Link>
        <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-ink">Lookup identity</h1>
        <p className="mt-2 text-ink-mute">
          Inspect any wallet&apos;s seal. Reads come straight from the contract.
        </p>

        <form
          className="mt-6 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            lookup(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="0x…"
            spellCheck={false}
            className="flex-1 rounded-xl border border-ink/15 bg-paper-card px-4 py-3 font-mono text-sm text-ink placeholder:text-ink/30"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-pine px-5 py-3 text-sm font-bold text-paper hover:bg-pine-bright disabled:opacity-50 sm:flex-none"
            >
              <ScanSearch size={16} /> {loading ? "Reading…" : "Inspect"}
            </button>
            {connected && mine && (
              <button
                type="button"
                onClick={() => {
                  setInput(mine);
                  lookup(mine);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-ink/15 px-4 py-3 text-sm font-bold text-ink hover:bg-paper-deep"
                title="Look up your own wallet"
              >
                <Wallet size={15} /> Mine
              </button>
            )}
          </div>
        </form>

        <div className="mt-8">
          {searched === null ? (
            <div className="rounded-2xl border border-dashed border-ink/20 bg-paper-card p-10 text-center">
              <ScanSearch size={28} className="mx-auto text-ink-mute" />
              <p className="mt-3 font-display text-lg font-bold text-ink">No dossier open</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-mute">
                Paste an address above — or open one from the registry.
              </p>
            </div>
          ) : loading ? (
            <div className="rounded-2xl border border-ink/10 bg-paper-card p-10 text-center text-sm font-semibold text-ink-mute">
              Reading the ledger…
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-brass/40 bg-paper-card p-5">
                <Seal size={56} />
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold text-ink">Sealed identity</p>
                  <p className="flex flex-wrap items-center gap-2 font-mono text-xs text-ink-mute">
                    {searched} <CopyButton text={searched} label="" className="border-ink/15 text-ink-mute" />
                  </p>
                </div>
              </div>
              <IdentityCard address={searched} identity={result} />
              {result.note && (
                <div className="rounded-2xl border border-ink/10 bg-paper-card p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-mute">
                    Validator evidence (stored at seal time)
                  </p>
                  <p className="mt-1.5 font-mono text-xs leading-relaxed text-ink-soft">
                    “{result.note.slice(0, 400)}”
                  </p>
                </div>
              )}
              <div className="rounded-2xl border border-ink/10 bg-paper-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-mute">
                    Live proof check <span className="font-sans font-semibold normal-case tracking-normal">(informational — not consensus)</span>
                  </p>
                  <button
                    onClick={() => recheckProof(result.proof_url, result.username)}
                    disabled={liveCheck === "checking"}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-pine px-3 py-1.5 text-xs font-bold text-paper hover:bg-pine-bright disabled:opacity-50"
                  >
                    <Radar size={13} /> {liveCheck === "checking" ? "Fetching…" : "Re-check now"}
                  </button>
                </div>
                {liveCheck !== "idle" && (
                  <p
                    className={`mt-2 text-xs leading-relaxed ${
                      liveCheck === "alive"
                        ? "font-semibold text-pine-bright"
                        : liveCheck === "checking"
                          ? "text-ink-mute"
                          : "text-clay"
                    }`}
                  >
                    {liveCheck === "checking" ? "Fetching proof page…" : liveSnippet}
                  </p>
                )}
              </div>
            </div>
          ) : result === null ? (
            <div className="rounded-2xl border border-ink/10 bg-paper-card p-10 text-center">
              <ShieldX size={28} className="mx-auto text-clay" />
              <p className="mt-3 font-display text-lg font-bold text-ink">No seal on record</p>
              <p className="mx-auto mt-1 max-w-sm font-mono text-xs text-ink-mute">{searched}</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-ink-mute">
                This wallet has never sealed an identity — or it revoked its seal.
              </p>
              <Link
                href="/verify"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-pine px-5 py-2.5 text-sm font-bold text-paper hover:bg-pine-bright"
              >
                Verify this wallet
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-clay/30 bg-clay-pale p-6 text-sm text-ink-soft">
              Read failed — the network may be rate-limiting or unreachable. Wait a moment and retry.
              <div>
                <button
                  onClick={() => lookup(searched)}
                  className="mt-3 rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-paper"
                >
                  Retry read
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LookupPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-ink-mute">Loading…</div>}>
      <LookupBody />
    </Suspense>
  );
}
