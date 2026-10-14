import { BadgeCheck } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Circular wax-seal style verified badge — the SocioTrust signature motif. */
export function Seal({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <div
      className={twMerge("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Verified seal"
    >
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
        <circle cx="32" cy="32" r="30" fill="#0E7A55" />
        <circle
          cx="32"
          cy="32"
          r="30"
          fill="none"
          stroke="#E3B94E"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        <circle cx="32" cy="32" r="23" fill="none" stroke="#E3B94E" strokeWidth="1.5" />
      </svg>
      <BadgeCheck
        className="absolute text-brass-bright"
        style={{ width: size * 0.42, height: size * 0.42 }}
        strokeWidth={2.4}
      />
    </div>
  );
}

export function cx(...args: Parameters<typeof clsx>) {
  return twMerge(clsx(...args));
}
