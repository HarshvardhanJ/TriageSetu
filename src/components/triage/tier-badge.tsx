"use client";

import { cn } from "@/lib/utils";
import { TIER_LABELS, tierColor } from "@/lib/triage";
import { motion } from "framer-motion";

export function TierBadge({
  tier,
  size = "md",
  animated = false,
}: {
  tier: number;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}) {
  const color = tierColor(tier);
  const sizes = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-[11px] px-2.5 py-1 gap-1.5",
    lg: "text-xs px-3 py-1.5 gap-2",
  };
  const dotSize = {
    sm: "h-1 w-1",
    md: "h-1.5 w-1.5",
    lg: "h-2 w-2",
  };
  const colorClasses = {
    red: "tier-bg-red text-[color-mix(in_oklch,var(--triage-red)_92%,white)] border-[color-mix(in_oklch,var(--triage-red)_35%,transparent)] shadow-[0_4px_12px_-4px_color-mix(in_oklch,var(--triage-red)_50%,transparent)]",
    amber:
      "tier-bg-amber text-[color-mix(in_oklch,var(--triage-amber)_92%,white)] border-[color-mix(in_oklch,var(--triage-amber)_35%,transparent)] shadow-[0_4px_12px_-4px_color-mix(in_oklch,var(--triage-amber)_50%,transparent)]",
    green:
      "tier-bg-green text-[color-mix(in_oklch,var(--triage-green)_90%,white)] border-[color-mix(in_oklch,var(--triage-green)_30%,transparent)] shadow-[0_4px_12px_-4px_color-mix(in_oklch,var(--triage-green)_45%,transparent)]",
  };
  const dotClasses = {
    red: "bg-[color-mix(in_oklch,var(--triage-red)_90%,white)]",
    amber: "bg-[color-mix(in_oklch,var(--triage-amber)_90%,white)]",
    green: "bg-[color-mix(in_oklch,var(--triage-green)_90%,white)]",
  };
  return (
    <motion.span
      layout
      initial={animated ? { scale: 0.85, opacity: 0, rotateX: -30 } : false}
      animate={animated ? { scale: 1, opacity: 1, rotateX: 0 } : {}}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      style={{ transformStyle: "preserve-3d" }}
      className={cn(
        "inline-flex items-center rounded-full border backdrop-blur-md font-semibold tracking-tight whitespace-nowrap",
        sizes[size],
        colorClasses[color]
      )}
    >
      <span className={cn("rounded-full", dotSize[size], dotClasses[color], animated && "animate-pulse")} />
      {TIER_LABELS[tier]}
    </motion.span>
  );
}
