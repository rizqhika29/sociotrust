"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-paper-card">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-display text-base font-bold text-ink">{it.q}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-pine-bright transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && <p className="px-5 pb-5 text-sm leading-relaxed text-ink-mute">{it.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
