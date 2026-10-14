"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  Eye,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { useSession } from "@/lib/session";
import {
  useGenlayerClient,
  trackToFinalized,
  writeRequestChallenge,
  writeVerifyIdentity,
  writeRevoke,
  readChallenge,
  readIsVerified,
  readIdentity,
  type TxStage,
  type TxHash,
  type ConsensusSummary,
} from "@/lib/genlayer";
import { SUPPORTED_PLATFORMS, txUrl, type IdentityRecord } from "@/lib/config";
import { mapError, mapReadError, type FriendlyError } from "@/lib/errors";
import { useTxGuard } from "@/lib/txguard";
import { TxTracker } from "@/components/TxTracker";
import { ConsensusPanel } from "@/components/ConsensusPanel";
import { ErrorPanel } from "@/components/ErrorPanel";
import { CopyButton } from "@/components/CopyButton";
import { Seal } from "@/components/Seal";

type Step = 1 | 2 | 3 | 4;

const USERNAME_MAX = 64;

/** URLs validators can never reach — fail fast instead of burning a tx. */
function unreachableReason(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return "Not a valid URL.";
  }
  if (u.protocol !== "http:" && u.protocol !== "https:")
    return "Must be a public http(s) URL.";
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  )
    return "Local/private addresses are unreachable by validators — use a public URL.";
  return null;
}

export default function VerifyPage() {
  const client = useGenlayerClient();
  const { address, connected, setModalOpen, chainOk, switchNetwork } = useSession();
  const guard = useTxGuard();

  const [step, setStep] = useState<Step>(1);
  const [challenge, setChallenge] = useState("");
  const [platform, setPlatform] = useState<string>("gist");
  const [username, setUsername] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [hash, setHash] = useState<TxHash | null>(null);
  const [stage, setStage] = useState<TxStage>("submitted");
  const [txError, setTxError] = useState<string | null>(null);
  const [friendly, setFriendly] = useState<FriendlyError | null>(null);
  const [lastSuccess, setLastSuccess] = useState(false);
  const [summary, setSummary] = useState<ConsensusSummary | null>(null);
  const [receipt, setReceipt] = useState<unknown>(null);
  const [sealed, setSealed] = useState<IdentityRecord | null>(null);
  const [alreadyVerified, setAlreadyVerified] = useState<boolean | null>(null);
  const [readError, setReadError] = useState<FriendlyError | null>(null);
  const [readAttempt, setReadAttempt] = useState(0);

  useEffect(() => {
    if (connected) setStep((s) => (s === 1 ? 2 : s));
  }, [connected]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!connected || !address) return;
      try {
        const [ch, v] = await Promise.all([
          readChallenge(client, address),
          readIsVerified(client, address),
        ]);
        if (!alive) return;
        setReadError(null);
        setChallenge(ch);
        setAlreadyVerified(v);
        if (v) {
          const ident = await readIdentity(client, address);
          if (alive && ident) setSealed(ident);
        }
      } catch (e) {
        if (alive) setReadError(mapReadError(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [client, connected, address, readAttempt]);

  const resetTx = () => {
    setHash(null);
    setTxError(null);
    setFriendly(null);
    setLastSuccess(false);
    setSummary(null);
    setReceipt(null);
    setStage("submitted");
  };

  const fail = (e: unknown) => {
    const f = mapError(e);
    setFriendly(f);
    setTxError(f.detail);
    setLastSuccess(false);
    toast.error(f.title, { description: f.detail });
  };

  const handleChallenge = useCallback(async () => {
    await guard.run("challenge", async () => {
      resetTx();
      try {
        const h = await writeRequestChallenge(client);
        setHash(h);
        const { outcome, summary: s, receipt: r } = await trackToFinalized(client, h, setStage);
        setSummary(s);
        setReceipt(r);
        if (!outcome.success) throw new Error(outcome.message);
        const ch = await readChallenge(client, address!);
        setChallenge(ch);
        setLastSuccess(true);
        toast.success("Challenge issued and stored on-chain");
        setStep(3);
      } catch (e) {
        fail(e);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, address]);

  const urlProblem = proofUrl.trim() ? unreachableReason(proofUrl) : null;
  const usernameProblem =
    username.trim().length > USERNAME_MAX
      ? `Keep it under ${USERNAME_MAX} characters.`
      : null;

  const handleVerify = useCallback(async () => {
    if (!username.trim()) {
      toast.error("Username required", { description: "Enter the handle shown on your proof page." });
      return;
    }
    if (usernameProblem) {
      toast.error("Username too long", { description: usernameProblem });
      return;
    }
    if (urlProblem) {
      toast.error("Proof URL problem", { description: urlProblem });
      return;
    }
    await guard.run("verify", async () => {
      resetTx();
      try {
        const h = await writeVerifyIdentity(client, platform, username, proofUrl);
        setHash(h);
        const { outcome, summary: s, receipt: r } = await trackToFinalized(client, h, setStage);
        setSummary(s);
        setReceipt(r);
        if (!outcome.success) throw new Error(outcome.message);
        const ident = await readIdentity(client, address!);
        setSealed(ident);
        setAlreadyVerified(true);
        setLastSuccess(true);
        toast.success("Identity sealed on-chain");
        setStep(4);
      } catch (e) {
        fail(e);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, platform, username, proofUrl, address]);

  const handleRevoke = useCallback(async () => {
    if (!confirm("Revoke your sealed identity? This removes it from the registry.")) return;
    await guard.run("revoke", async () => {
      resetTx();
      try {
        const h = await writeRevoke(client);
        setHash(h);
        const { outcome, summary: s, receipt: r } = await trackToFinalized(client, h, setStage);
        setSummary(s);
        setReceipt(r);
        if (!outcome.success) throw new Error(outcome.message);
        setSealed(null);
        setAlreadyVerified(false);
        setLastSuccess(true);
        toast.success("Identity revoked");
      } catch (e) {
        fail(e);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const busyChallenge = guard.isBusy("challenge");
  const busyVerify = guard.isBusy("verify");
  const busyRevoke = guard.isBusy("revoke");

  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-mute hover:text-ink">
          <ArrowLeft size={15} /> Home
        </Link>
        <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-ink">
          Get verified
        </h1>
        <p className="mt-2 text-ink-mute">
          Four stamps stand between you and a sealed on-chain identity.
        </p>

        <ol className="mt-8 flex items-center gap-1" aria-label="Progress">
          {(["Wallet", "Challenge", "Proof", "Seal"] as const).map((label, i) => {
            const n = (i + 1) as Step;
            const done = step > n;
            const current = step === n;
            return (
              <li key={label} className="flex flex-1 items-center gap-1">
                <div className="flex flex-1 flex-col gap-1.5">
                  <span
                    className={`h-1.5 rounded-full ${
                      done ? "bg-pine-bright" : current ? "bg-brass-bright" : "bg-ink/10"
                    }`}
                  />
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      current ? "text-ink" : "text-ink-mute"
                    }`}
                  >
                    {n}. {label}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 space-y-5">
          {connected && readError && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-clay/30 bg-clay-pale px-5 py-3.5" role="alert">
              <TriangleAlert size={17} className="shrink-0 text-clay" />
              <p className="flex-1 text-sm text-ink-soft">
                <span className="font-bold text-ink">{readError.title}.</span> {readError.hint}
              </p>
              {readError.retryable && (
                <button
                  onClick={() => setReadAttempt((n) => n + 1)}
                  className="rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-paper"
                >
                  Retry reads
                </button>
              )}
            </div>
          )}
          {/* STEP 1 */}
          <section className="rounded-2xl border border-ink/10 bg-paper-card p-6 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
              <Wallet size={20} className="text-pine-bright" /> 1 · Connect wallet
            </h2>
            {!connected ? (
              <div className="mt-4">
                <p className="text-sm text-ink-mute">
                  Choose MetaMask or Rabby — your pick is remembered and reused. Studio is
                  gasless, so no funds are required.
                </p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-pine px-5 py-2.5 text-sm font-bold text-paper hover:bg-pine-bright"
                >
                  <Wallet size={16} /> Choose wallet
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-mint-pale px-3 py-1.5 font-mono text-xs font-bold text-pine">
                  <CheckCircle2 size={14} /> {address}
                </span>
                {chainOk === false && (
                  <button
                    onClick={() => switchNetwork().catch((e) => toast.error(mapError(e).title))}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-clay px-3 py-1.5 text-xs font-bold text-paper"
                  >
                    <TriangleAlert size={14} /> Switch to Studio (61999)
                  </button>
                )}
                {alreadyVerified && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-brass-pale px-3 py-1.5 text-xs font-bold text-brass">
                    <BadgeCheck size={14} /> Already sealed — verifying again refreshes the seal
                  </span>
                )}
              </div>
            )}
          </section>

          {/* STEP 2 */}
          <section className={`rounded-2xl border p-6 shadow-card ${connected ? "border-ink/10 bg-paper-card" : "border-ink/10 bg-paper-deep opacity-60"}`}>
            <h2 className="font-display text-xl font-bold text-ink">2 · Claim your challenge</h2>
            <p className="mt-1 text-sm text-ink-mute">
              A unique phrase bound to your address. Each request rotates the nonce — always
              publish the <em>latest</em> one, and never verify while a challenge tx is still running.
            </p>
            {challenge && (
              <div className="mt-4 rounded-xl border border-dashed border-pine/30 bg-mint-pale/50 p-4">
                <p className="font-mono text-sm font-semibold leading-relaxed text-pine-deep">{challenge}</p>
                <div className="mt-2">
                  <CopyButton text={challenge} className="border-pine/25 bg-paper-card text-pine" />
                </div>
              </div>
            )}
            <button
              onClick={handleChallenge}
              disabled={!connected || guard.anyBusy}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-pine px-5 py-2.5 text-sm font-bold text-paper transition hover:bg-pine-bright disabled:opacity-50"
            >
              {busyChallenge ? "Waiting for consensus…" : challenge ? "Issue fresh challenge" : "Issue challenge"}
              <ArrowRight size={15} />
            </button>
          </section>

          {/* STEP 3 */}
          <section className={`rounded-2xl border p-6 shadow-card ${challenge ? "border-ink/10 bg-paper-card" : "border-ink/10 bg-paper-deep opacity-60"}`}>
            <h2 className="font-display text-xl font-bold text-ink">3 · Publish & point to proof</h2>
            <p className="mt-1 text-sm text-ink-mute">
              Post the exact challenge text publicly, then paste the URL below. Validators will
              fetch this page themselves.
            </p>
            <div className="mt-4 grid gap-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">Platform</span>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm font-semibold text-ink"
                >
                  {SUPPORTED_PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-ink-mute">
                  {SUPPORTED_PLATFORMS.find((p) => p.id === platform)?.hint}
                </span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Username / handle <span className="font-mono text-ink-mute">({username.trim().length}/{USERNAME_MAX})</span>
                </span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. satoshi"
                  maxLength={USERNAME_MAX + 16}
                  className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 font-mono text-sm text-ink placeholder:text-ink/30"
                />
                {usernameProblem && (
                  <span className="mt-1 block text-xs font-semibold text-clay">{usernameProblem}</span>
                )}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">Public proof URL</span>
                <input
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://gist.github.com/you/…"
                  inputMode="url"
                  className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 font-mono text-sm text-ink placeholder:text-ink/30"
                />
                {proofUrl.trim() && !/^https?:\/\/.+\..+/.test(proofUrl.trim()) && (
                  <span className="mt-1 block text-xs font-semibold text-clay">
                    Must be a public http(s) URL.
                  </span>
                )}
                {urlProblem && /^https?:\/\//.test(proofUrl.trim()) && (
                  <span className="mt-1 block text-xs font-semibold text-clay">{urlProblem}</span>
                )}
              </label>
            </div>
            <button
              onClick={handleVerify}
              disabled={!connected || !challenge || guard.anyBusy}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brass-bright px-5 py-3 text-sm font-bold text-ink shadow-seal transition hover:brightness-105 disabled:opacity-50 sm:w-auto sm:px-8"
            >
              {busyVerify ? "Validators deliberating…" : "Submit for adjudication"}
            </button>
            <p className="mt-2 text-xs text-ink-mute">
              Takes ~30 seconds on the happy path. Contested proofs escalate through appeal rounds.
              Double clicks are ignored — one press, one transaction.
            </p>
          </section>

          {/* TX TRACKER + CONSENSUS + ERRORS */}
          {(hash || friendly) && (
            <div className="space-y-4">
              <TxTracker hash={hash} stage={stage} error={txError} success={lastSuccess} />
              {hash !== null && (summary !== null || receipt !== null) && (
                <ConsensusPanel hash={hash} summary={summary} receipt={receipt} />
              )}
              {friendly && (
                <ErrorPanel error={friendly} hash={hash} onRetry={resetTx} />
              )}
            </div>
          )}

          {/* STEP 4 / SEALED */}
          {sealed && (
            <section className="rounded-2xl border border-brass/40 bg-paper-card p-6 text-center shadow-seal">
              <Seal size={84} className="mx-auto" />
              <h2 className="mt-3 font-display text-2xl font-black text-ink">Sealed on-chain</h2>
              <p className="mt-1 text-sm text-ink-mute">
                <span className="font-mono font-bold text-pine">@{sealed.username}</span> · {sealed.platform}
              </p>
              {sealed.note && (
                <p className="mx-auto mt-2 max-w-md rounded-xl bg-paper-deep px-3 py-2 font-mono text-[11px] leading-relaxed text-ink-soft">
                  Validator evidence: “{sealed.note.slice(0, 220)}”
                </p>
              )}
              <a
                href={sealed.proof_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-pine-bright hover:underline"
              >
                {sealed.proof_url} <ExternalLink size={12} />
              </a>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link
                  href={`/lookup?address=${address}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-pine px-4 py-2 text-xs font-bold text-paper hover:bg-pine-bright"
                >
                  <Eye size={14} /> View dossier
                </Link>
                {hash && (
                  <a
                    href={txUrl(hash)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:bg-paper-deep"
                  >
                    Explorer receipt <ExternalLink size={13} />
                  </a>
                )}
                <button
                  onClick={handleRevoke}
                  disabled={guard.anyBusy}
                  className="rounded-xl border border-oxblood/30 px-4 py-2 text-xs font-bold text-oxblood hover:bg-oxblood-pale disabled:opacity-50"
                >
                  {busyRevoke ? "Revoking…" : "Revoke seal"}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
