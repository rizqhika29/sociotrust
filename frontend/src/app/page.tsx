"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  AtSign,
  FileCheck2,
  Landmark,
  Link2,
  ScanSearch,
  ShieldCheck,
  Stamp,
  TriangleAlert,
  Vote,
  Wallet,
} from "lucide-react";
import { useSession } from "@/lib/session";
import { useGenlayerClient, readVerifiedList, readIdentity } from "@/lib/genlayer";
import { SUPPORTED_PLATFORMS, type IdentityRecord } from "@/lib/config";
import { mapReadError, type FriendlyError } from "@/lib/errors";
import { SectionHeading } from "@/components/SectionHeading";
import { IdentityCard } from "@/components/IdentityCard";
import { Faq } from "@/components/Faq";
import { Seal } from "@/components/Seal";

const STEPS = [
  {
    n: "01",
    icon: Wallet,
    title: "Connect your wallet",
    body: "Link any Ethereum-compatible wallet on the GenLayer Studio network. Gasless — no tokens needed to start.",
  },
  {
    n: "02",
    icon: Stamp,
    title: "Claim your challenge",
    body: "The registry issues a unique challenge phrase bound to your address and a one-time nonce.",
  },
  {
    n: "03",
    icon: AtSign,
    title: "Publish your proof",
    body: "Create a public gist under your own GitHub account containing the challenge — only the account holder can do that.",
  },
  {
    n: "04",
    icon: Vote,
    title: "Validators adjudicate",
    body: "Five independent AI validators check GitHub's API ownership record and must agree before the seal is stamped — one identity, one wallet.",
  },
];

export default function Home() {
  const client = useGenlayerClient();
  const { connected, quickConnect } = useSession();
  const [count, setCount] = useState<number | null>(null);
  const [latest, setLatest] = useState<{ address: string; identity: IdentityRecord }[]>([]);
  const [statsError, setStatsError] = useState<FriendlyError | null>(null);
  const [statsAttempt, setStatsAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await readVerifiedList(client);
        if (!alive) return;
        setCount(list.length);
        setStatsError(null);
        const tail = list.slice(-3).reverse();
        const rows = [];
        for (const addr of tail) {
          try {
            const ident = await readIdentity(client, addr);
            if (ident) rows.push({ address: addr, identity: ident });
          } catch {
            /* skip unreadable entries */
          }
        }
        if (alive) setLatest(rows);
      } catch (e) {
        if (alive) setStatsError(mapReadError(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [client, statsAttempt]);

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="dot-grid bg-pine-deep text-paper">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-brass-bright/40 bg-paper/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-brass-bright">
            <Landmark size={13} /> On-chain identity registry
          </p>
          <div className="mt-6 grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <h1 className="font-display text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
                Prove who you are.
                <span className="block text-brass-bright">On-chain.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-paper/70 sm:text-lg">
                SocioTrust links your GitHub identity to your wallet. Publish a challenge in a
                gist under your own account, let five independent AI validators confirm GitHub&apos;s
                own ownership record, and carry a tamper-evident seal across the ecosystem.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/verify"
                  className="inline-flex items-center gap-2 rounded-xl bg-brass-bright px-6 py-3.5 text-sm font-bold text-ink shadow-seal transition hover:brightness-110"
                >
                  Start verification <ArrowRight size={16} />
                </Link>
                {!connected ? (
                  <button
                    onClick={() => quickConnect().catch(() => {})}
                    className="inline-flex items-center gap-2 rounded-xl border border-paper/25 px-6 py-3.5 text-sm font-bold text-paper transition hover:bg-paper/10"
                  >
                    <Wallet size={16} /> Connect wallet
                  </button>
                ) : (
                  <Link
                    href="/lookup"
                    className="inline-flex items-center gap-2 rounded-xl border border-paper/25 px-6 py-3.5 text-sm font-bold text-paper transition hover:bg-paper/10"
                  >
                    <ScanSearch size={16} /> Check my status
                  </Link>
                )}
              </div>
              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-paper/15 pt-6">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-paper/50">Sealed</dt>
                  <dd className="mt-1 font-display text-3xl font-bold text-paper">
                    {count === null ? "—" : count}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-paper/50">Validators</dt>
                  <dd className="mt-1 font-display text-3xl font-bold text-paper">5</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-widest text-paper/50">Oracles</dt>
                  <dd className="mt-1 font-display text-3xl font-bold text-paper">0</dd>
                </div>
              </dl>
            </div>
            <div className="hidden justify-center lg:flex" aria-hidden>
              <div className="relative rounded-3xl border border-brass-bright/30 bg-pine p-8 shadow-seal">
                <Seal size={150} className="mx-auto" />
                <p className="mt-5 text-center font-display text-xl font-bold text-paper">
                  Seal of Trust
                </p>
                <p className="mt-1 text-center text-xs uppercase tracking-[0.25em] text-brass-bright">
                  Adjudicated · Appealable
                </p>
                <div className="mt-6 space-y-2 border-t border-dashed border-paper/20 pt-4 text-xs text-paper/60">
                  <p className="flex justify-between"><span>Leader proposes</span><span className="font-mono">1 of 5</span></p>
                  <p className="flex justify-between"><span>Consensus needed</span><span className="font-mono">&gt; 50%</span></p>
                  <p className="flex justify-between"><span>Appeals</span><span className="font-mono">5 → 11 → 23…</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- PLATFORM STRIP ---------- */}
      <section className="border-b border-ink/10 bg-paper-deep">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-5 sm:px-6">
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-ink-mute">
            Authoritative proof source
          </span>
          {SUPPORTED_PLATFORMS.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft">
              <Link2 size={14} className="text-pine-bright" /> {p.label}
            </span>
          ))}
        </div>
      </section>

      {/* ---------- HOW IT WORKS PREVIEW ---------- */}
      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeading
            eyebrow="Protocol in four stamps"
            title="From wallet to sealed identity"
            lede="No screenshots, no manual review, no trusted oracle. Just you, your GitHub account, and a jury of models."
          />
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="relative rounded-2xl border border-ink/10 bg-paper-card p-5 shadow-card">
                <span className="font-display text-4xl font-black text-brass/30">{s.n}</span>
                <s.icon size={22} className="mt-3 text-pine-bright" />
                <h3 className="mt-2 font-display text-lg font-bold text-ink">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-mute">{s.body}</p>
              </li>
            ))}
          </ol>
          <Link
            href="/how-it-works"
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-pine-bright hover:underline"
          >
            Read the full protocol <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* ---------- LIVE REGISTRY ---------- */}
      <section className="ledger-lines border-y border-ink/10 bg-paper-deep">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Fresh from the ledger"
              title="Latest sealed identities"
              lede="Read straight from the Intelligent Contract — no cache, no middleman."
            />
            <Link
              href="/activity"
              className="inline-flex items-center gap-2 rounded-xl border border-ink/15 bg-paper-card px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-paper"
            >
              Open registry <ArrowRight size={15} />
            </Link>
          </div>
          {statsError && (
            <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-brass-bright/30 bg-paper/5 px-5 py-3.5" role="alert">
              <TriangleAlert size={17} className="shrink-0 text-brass-bright" />
              <p className="flex-1 text-sm text-paper/80">
                <span className="font-bold text-paper">{statsError.title}.</span> {statsError.hint}
              </p>
              {statsError.retryable && (
                <button
                  onClick={() => setStatsAttempt((n) => n + 1)}
                  className="rounded-lg border border-paper/25 px-3 py-1.5 text-xs font-bold text-paper hover:bg-paper/10"
                >
                  Retry
                </button>
              )}
            </div>
          )}
          {latest.length > 0 ? (
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {latest.map((r) => (
                <IdentityCard key={r.address} address={r.address} identity={r.identity} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-ink/20 bg-paper-card p-8 text-center">
              <ShieldCheck size={28} className="mx-auto text-pine-bright" />
              <p className="mt-3 font-display text-lg font-bold text-ink">
                {count === 0 ? "The registry is empty — be the first seal." : "Registry preview unavailable right now."}
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink-mute">
                {count === 0
                  ? "No identities sealed yet. Your verification could headline this page."
                  : "The network may be rate-limiting reads. Try the full registry page."}
              </p>
              <Link
                href="/verify"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-pine px-5 py-2.5 text-sm font-bold text-paper hover:bg-pine-bright"
              >
                Get verified <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ---------- WHY GENLAYER ---------- */}
      <section className="bg-pine-deep text-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeading
            dark
            eyebrow="Why this needs GenLayer"
            title="Judgment, not just code"
            lede="A normal smart contract cannot open a web page, let alone decide whether a post really proves ownership. Intelligent Contracts can — under consensus."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: FileCheck2,
                t: "Checks the authoritative record",
                b: "Validators query GitHub's own API for the gist owner — a field only the account holder can publish under. Arbitrary pages can't impersonate handles.",
              },
              {
                icon: Vote,
                t: "Five models must agree",
                b: "Leader proposes, four validators re-derive the verdict. Majority wins; disputes escalate the jury.",
              },
              {
                icon: ShieldCheck,
                t: "Appealable by design",
                b: "Every decision carries an appeal path. Wrong seals get challenged, correct ones get stronger.",
              },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border border-paper/15 bg-pine p-6">
                <c.icon size={24} className="text-brass-bright" />
                <h3 className="mt-3 font-display text-xl font-bold">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper/65">{c.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="bg-paper">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <SectionHeading eyebrow="Fine print" title="Questions, answered" />
          <div className="mt-8">
            <Faq
              items={[
                {
                  q: "What does verification actually prove?",
                  a: "That whoever controls a wallet also controls a GitHub account — they published a unique challenge in a gist, and GitHub's own API confirms that account owns the gist. Each GitHub identity can seal exactly one wallet, so one person can't mint unlimited identities. It does not prove legal identity or immunity to account sales later.",
                },
                {
                  q: "How long does it take?",
                  a: "The happy path finalizes in roughly half a minute on Studio. Contested cases escalate through appeal rounds, each roughly doubling the validator set.",
                },
                {
                  q: "What if my proof post is deleted?",
                  a: "The seal records the proof URL and validator evidence at seal time. Anyone can re-check the live page via Lookup. Re-verification after major profile changes is recommended.",
                },
                {
                  q: "Does it cost anything?",
                  a: "GenLayer Studio is gasless — reads and writes need no tokens. On future mainnet-style networks, standard transaction fees apply.",
                },
                {
                  q: "Can a seal be revoked?",
                  a: "Yes — the wallet that owns an identity can revoke it at any time from the Verify page. There is no admin backdoor; only the owner can revoke.",
                },
              ]}
            />
          </div>
        </div>
      </section>
    </>
  );
}
