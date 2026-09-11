type Tier = "critical" | "serious" | "noting" | "cleared";

const TIER_STYLES: Record<
  Tier,
  { label: string; border: string; text: string; tilt: string }
> = {
  critical: {
    label: "Critical",
    border: "border-critical",
    text: "text-critical",
    tilt: "-3deg",
  },
  serious: {
    label: "Serious",
    border: "border-serious",
    text: "text-serious",
    tilt: "2deg",
  },
  noting: {
    label: "Worth noting",
    border: "border-noting",
    text: "text-noting",
    tilt: "1deg",
  },
  cleared: {
    label: "Cleared",
    border: "border-ink-soft",
    text: "text-ink-soft",
    tilt: "-1deg",
  },
};

export function Stamp({ tier, delayMs = 0 }: { tier: Tier; delayMs?: number }) {
  const style = TIER_STYLES[tier];
  return (
    <span
      className={`stamp-enter inline-flex shrink-0 items-center gap-1.5 border-[3px] ${style.border} px-3 py-1 font-[family-name:var(--font-typewriter)] text-xs font-bold uppercase tracking-[0.18em] ${style.text}`}
      style={{
        "--stamp-tilt": style.tilt,
        animationDelay: `${delayMs}ms`,
      } as React.CSSProperties}
    >
      {style.label}
    </span>
  );
}
