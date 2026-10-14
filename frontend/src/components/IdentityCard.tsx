import Link from "next/link";
import { ArrowUpRight, AtSign, Link2 } from "lucide-react";
import type { IdentityRecord } from "@/lib/config";
import { shortAddress } from "@/lib/config";
import { Seal } from "./Seal";
import { CopyButton } from "./CopyButton";

export function IdentityCard({
  address,
  identity,
}: {
  address: string;
  identity: IdentityRecord;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-paper-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <Seal size={52} />
        <span className="rounded-full bg-mint-pale px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-pine">
          Verified
        </span>
      </div>
      <div>
        <p className="flex items-center gap-1.5 font-display text-xl font-bold text-ink">
          <AtSign size={18} className="text-pine-bright" />
          {identity.username}
        </p>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-ink-mute">
          {identity.platform}
        </p>
      </div>
      <dl className="space-y-2 border-t border-dashed border-ink/15 pt-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-ink-mute">Wallet</dt>
          <dd className="flex items-center gap-2 font-mono text-xs font-semibold text-ink">
            {shortAddress(address)}
            <CopyButton text={address} label="" className="border-ink/15 text-ink-mute" />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-ink-mute">Proof</dt>
          <dd>
            <a
              href={identity.proof_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-pine-bright hover:underline"
            >
              <Link2 size={13} /> Open proof
            </a>
          </dd>
        </div>
      </dl>
      <Link
        href={`/lookup?address=${address}`}
        className="inline-flex items-center gap-1 text-xs font-bold text-brass hover:underline"
      >
        Open dossier <ArrowUpRight size={13} />
      </Link>
    </article>
  );
}
