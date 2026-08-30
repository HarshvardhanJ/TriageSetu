"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function ConfidenceMeter({
  value,
  label,
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const color =
    value >= 80
      ? "var(--triage-green)"
      : value >= 62
      ? "var(--triage-amber)"
      : "var(--triage-red)";
  const gradient =
    value >= 80
      ? "linear-gradient(90deg, var(--triage-green), var(--triage-cyan))"
      : value >= 62
      ? "linear-gradient(90deg, var(--triage-amber), var(--surge))"
      : "linear-gradient(90deg, var(--triage-red), var(--surge))";
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">Confidence</span>
        <motion.span
          key={value}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-bold tabular-nums"
          style={{ color }}
        >
          {value}%
        </motion.span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: gradient }}
        >
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          />
        </motion.div>
      </div>
      {label && (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
