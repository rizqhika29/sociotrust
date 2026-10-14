import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { CONTRACT_ADDRESS, shortAddress } from "@/lib/config";
import { CopyButton } from "./CopyButton";

export function Footer() {
  return (
    <footer className="border-t border-paper/10 bg-pine-deep text-paper/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-paper/10 text-brass-bright">
              <ShieldCheck size={20} />
            </span>
            <span className="font-display text-lg font-bold text-paper">SocioTrust</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed">
            Link your social, prove your trust. Identity verification adjudicated by
            decentralized AI validators on GenLayer — no oracles, no intermediaries.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="text-paper/50">Contract</span>
            <span className="font-mono font-semibold text-brass-bright">
              {shortAddress(CONTRACT_ADDRESS)}
            </span>
            <CopyButton
              text={CONTRACT_ADDRESS}
              label=""
              className="border-paper/20 text-paper/70"
            />
          </div>
        </div>
        <nav aria-label="Product">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brass-bright">Product</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/verify" className="hover:text-paper">Get verified</Link></li>
            <li><Link href="/lookup" className="hover:text-paper">Lookup identity</Link></li>
            <li><Link href="/activity" className="hover:text-paper">Registry</Link></li>
            <li><Link href="/how-it-works" className="hover:text-paper">How it works</Link></li>
          </ul>
        </nav>
        <nav aria-label="Protocol">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brass-bright">Protocol</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="https://docs.genlayer.com/" target="_blank" rel="noreferrer" className="hover:text-paper">GenLayer docs</a></li>
            <li><a href="https://studio.genlayer.com/" target="_blank" rel="noreferrer" className="hover:text-paper">GenLayer Studio</a></li>
            <li><a href="https://explorer-studio.genlayer.com/" target="_blank" rel="noreferrer" className="hover:text-paper">Explorer</a></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-paper/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-paper/40 sm:px-6">
          <span>SocioTrust · On-chain Identity Verification · GenLayer Studio Network</span>
          <span>Decisions are appealable. Trust is earned.</span>
        </div>
      </div>
    </footer>
  );
}
