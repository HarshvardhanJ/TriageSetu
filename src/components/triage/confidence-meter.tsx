"use client";
import { cn } from "@/lib/utils";
export function ConfidenceMeter({ value, label, className }: { value: number; label?: string; className?: string }) {
  const text = value >= 80 ? "High confidence" : value >= 62 ? "Moderate confidence" : "Needs review";
  return <span className={cn("text-[11px] text-muted-foreground", className)}>{label || text} <span className="font-mono tabular-nums">({value}%)</span></span>;
}
