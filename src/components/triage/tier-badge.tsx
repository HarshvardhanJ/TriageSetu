"use client";
import { cn } from "@/lib/utils";
import { TIER_LABELS, tierColor } from "@/lib/triage";
export function TierBadge({ tier, size = "md" }: { tier: number; size?: "sm" | "md" | "lg"; animated?: boolean }) {
  const color = tierColor(tier);
  const sizes = { sm: "px-2 py-0.5 text-[10px]", md: "px-2.5 py-1 text-[11px]", lg: "px-3 py-1.5 text-xs" };
  const tones = { red: "border-[color-mix(in_oklch,var(--triage-red)_35%,transparent)] bg-[color-mix(in_oklch,var(--triage-red)_14%,white)] text-[color-mix(in_oklch,var(--triage-red)_90%,black)]", amber: "border-[color-mix(in_oklch,var(--triage-amber)_35%,transparent)] bg-[color-mix(in_oklch,var(--triage-amber)_16%,white)] text-[color-mix(in_oklch,var(--triage-amber)_90%,black)]", green: "border-[color-mix(in_oklch,var(--triage-green)_35%,transparent)] bg-[color-mix(in_oklch,var(--triage-green)_14%,white)] text-[color-mix(in_oklch,var(--triage-green)_90%,black)]" };
  return <span className={cn("inline-flex rounded-md border font-semibold whitespace-nowrap", sizes[size], tones[color])}>{TIER_LABELS[tier]}</span>;
}
