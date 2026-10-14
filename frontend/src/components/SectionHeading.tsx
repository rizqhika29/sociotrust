export function SectionHeading({
  eyebrow,
  title,
  lede,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  dark?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <p
        className={`text-xs font-bold uppercase tracking-[0.25em] ${
          dark ? "text-brass-bright" : "text-pine-bright"
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl ${
          dark ? "text-paper" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {lede && (
        <p className={`mt-3 text-base leading-relaxed ${dark ? "text-paper/70" : "text-ink-mute"}`}>
          {lede}
        </p>
      )}
    </div>
  );
}
