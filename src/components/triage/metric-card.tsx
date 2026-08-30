"use client";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
export function MetricCard({ label, value, hint, icon: Icon, tone = "default", suffix = "" }: { label: string; value: string | number; hint?: string; icon?: LucideIcon; tone?: "default" | "red" | "amber" | "green" | "surge" | "blue" | "violet"; delay?: number; suffix?: string }) {
  const accents = { default: "border-l-primary", red: "border-l-triage-red", amber: "border-l-triage-amber", green: "border-l-triage-green", surge: "border-l-triage-red", blue: "border-l-primary", violet: "border-l-primary" };
  return <section className={cn("min-w-0 rounded-lg border border-border border-l-4 bg-card p-4", accents[tone])}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{value}{suffix && <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span>}</p>{hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}</div>{Icon && <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />}</div></section>;
}
