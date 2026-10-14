"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { WalletButton } from "./WalletButton";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/verify", label: "Verify" },
  { href: "/lookup", label: "Lookup" },
  { href: "/activity", label: "Registry" },
  { href: "/how-it-works", label: "How it works" },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pine text-brass-bright">
            <ShieldCheck size={20} strokeWidth={2.2} />
          </span>
          <span className="leading-none">
            <span className="block font-display text-lg font-bold tracking-tight text-ink">
              SocioTrust
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-mute">
              On-chain Identity
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  active ? "bg-pine text-paper" : "text-ink-soft hover:bg-ink/5"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-pine/20 bg-mint-pale px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-pine lg:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-pine-bright" />
            StudioNet
          </span>
          <WalletButton compact />
        </div>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-ink/5 px-4 py-1.5 md:hidden" aria-label="Mobile">
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold ${
                active ? "bg-pine text-paper" : "text-ink-soft"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
