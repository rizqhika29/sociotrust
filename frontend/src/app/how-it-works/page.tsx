import Link from "next/link";
import { ArrowLeft, ArrowRight, Gavel, Globe2, MessagesSquare, Scale, Timer, TriangleAlert } from "lucide-react";
import { CONTRACT_ADDRESS, shortAddress } from "@/lib/config";
import { SectionHeading } from "@/components/SectionHeading";
import { Faq } from "@/components/Faq";
import { CopyButton } from "@/components/CopyButton";

export default function HowItWorksPage() {
  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-mute hover:text-ink">
          <ArrowLeft size={15} /> Home
        </Link>
        <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-ink sm:text-5xl">
          How SocioTrust works
        </h1>
        <p className="mt-3 text-lg text-ink-mute">
          The full protocol — from challenge to seal — and the machinery that makes it
          trustworthy.
        </p>

        <div className="mt-10 space-y-4">
          {[
            {
              icon: MessagesSquare,
              t: "1 · The challenge",
              b: "You call request_challenge(). The contract stores a phrase binding your wallet address to a one-time nonce. It is deterministic — no AI, no web — so every validator trivially agrees on it. Requesting again rotates the nonce; only the latest phrase counts.",
            },
            {
              icon: Globe2,
              t: "2 · The public proof",
              b: "You create a public gist under your own GitHub account containing that phrase. Nothing secret: the whole point is that anyone — including five strangers' AI models — can verify it against GitHub's own records.",
            },
            {
              icon: Scale,
              t: "3 · Optimistic Democracy",
              b: "You call verify_identity(). One randomly selected leader fetches the canonical GitHub API record for your gist and checks two facts: does owner.login equal your username, and is the challenge in the files? Four validators independently repeat the check and compare only those decision booleans. Over half must agree — and a GitHub identity can seal exactly one wallet, enforced on-chain.",
            },
            {
              icon: Gavel,
              t: "4 · Appeals & finality",
              b: "Agreement means optimistic acceptance; a finality window follows in which anyone can appeal. Appeals grow the jury 5 → 11 → 23 and beyond. Silence means the seal locks on-chain: your wallet now maps to platform, handle, proof URL, and validator evidence.",
            },
          ].map((s) => (
            <section key={s.t} className="rounded-2xl border border-ink/10 bg-paper-card p-6 shadow-card">
              <h2 className="flex items-center gap-2.5 font-display text-xl font-bold text-ink">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pine text-brass-bright">
                  <s.icon size={18} />
                </span>
                {s.t}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{s.b}</p>
            </section>
          ))}
        </div>

        <div className="mt-10">
          <SectionHeading
            eyebrow="When things go wrong"
            title="Rejection is a feature"
          />
          <div className="mt-5 overflow-hidden rounded-2xl border border-ink/10">
            <table className="w-full bg-paper-card text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-paper-deep text-xs uppercase tracking-wider text-ink-mute">
                  <th className="px-4 py-3">Signal</th>
                  <th className="px-4 py-3">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {[
                  ["[EXPECTED] No challenge", "Verify was called before any challenge was issued."],
                  ["[EXPECTED] owner mismatch", "The gist's GitHub owner differs from the claimed username — proof must live under your own account."],
                  ["[EXPECTED] anonymous gist", "Gists without a GitHub owner prove nothing. Create the gist while logged in."],
                  ["[EXPECTED] already sealed", "That GitHub identity already belongs to another wallet. One identity, one wallet."],
                  ["[EXPECTED] challenge not in gist", "Validators agree the phrase is absent from the gist files."],
                  ["[EXTERNAL] gist not found", "The gist id does not exist on GitHub. Check the URL."],
                  ["[TRANSIENT] rate limited", "GitHub's API throttled validators — retry, nothing was stored."],
                  ["Undetermined", "The jury deadlocked after appeals. Retry with a fresh set."],
                ].map(([code, meaning]) => (
                  <tr key={code}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-clay">{code}</td>
                    <td className="px-4 py-3 text-ink-soft">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-brass/40 bg-brass-pale p-6">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <Timer size={20} className="text-brass" /> Timing & cost
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Happy-path transactions finalize in roughly half a minute on Studio. Fully
            escalated disputes can take hours — that is the price of decentralized judgment.
            Studio itself is gasless; no tokens are needed to read or write.
          </p>
        </div>

        <div className="mt-10 rounded-2xl bg-oxblood-pale p-6">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-oxblood">
            <TriangleAlert size={20} /> Honest limits
          </h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
            <li>A seal proves control of a GitHub account at seal time — not legal identity, and not immunity to account sales or hacks later.</li>
            <li>Only GitHub gists are accepted today, deliberately: ownership must come from an authoritative platform record, not an arbitrary page.</li>
            <li>Deleted gists leave a stale seal behind — re-verify after major profile changes, and check the live gist before trusting a seal.</li>
          </ul>
        </div>

        <div className="mt-10 rounded-2xl border border-ink/10 bg-paper-card p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-mute">Deployed contract</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-sm font-semibold text-ink">
            {shortAddress(CONTRACT_ADDRESS)}
            <CopyButton text={CONTRACT_ADDRESS} className="border-ink/15 text-ink-mute" />
          </p>
          <Link
            href="/verify"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-pine px-6 py-3 text-sm font-bold text-paper hover:bg-pine-bright"
          >
            Start your verification <ArrowRight size={15} />
          </Link>
        </div>

        <div className="mt-10">
          <Faq
            items={[
              {
                q: "Why not just check the page in normal JavaScript?",
                a: "Anyone can fake a frontend check, and any page can claim any handle. Here the check runs under consensus against GitHub's authoritative API: five independent parties confirm the platform's own ownership record, and disagreement is visible on-chain. That is what makes the seal worth trusting.",
              },
              {
                q: "Why compare only decision fields, not the whole API response?",
                a: "API responses carry volatile metadata (timestamps, counters) that legitimately differs between fetches. Validators extract a verdict — owner match? message found? — and agree on that, which is stable while the raw bytes are not.",
              },
              {
                q: "Who can revoke my seal?",
                a: "Only the wallet that owns it. There is no admin key and no backdoor — revocation is a single owner-only transaction.",
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
