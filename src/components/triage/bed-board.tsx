"use client";

import { motion } from "framer-motion";
import { BedDouble } from "lucide-react";
import type { Bed } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ZONE_META: Record<string, { label: string; gradient: string }> = {
  resus: { label: "Resus", gradient: "from-[oklch(0.62_0.22_22)] to-[oklch(0.65_0.24_18)]" },
  major: { label: "Major", gradient: "from-[oklch(0.75_0.18_65)] to-[oklch(0.78_0.19_70)]" },
  minor: { label: "Minor", gradient: "from-[oklch(0.68_0.16_155)] to-[oklch(0.72_0.17_160)]" },
  observation: { label: "Observation", gradient: "from-[oklch(0.65_0.14_200)] to-[oklch(0.55_0.16_250)]" },
  paediatric: { label: "Paediatric", gradient: "from-[oklch(0.62_0.22_300)] to-[oklch(0.55_0.16_290)]" },
};

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  free: { label: "Free", cls: "border-[color-mix(in_oklch,var(--triage-green)_35%,transparent)] bg-[color-mix(in_oklch,var(--triage-green)_12%,transparent)] text-[color-mix(in_oklch,var(--triage-green)_90%,white)]", dot: "bg-[oklch(0.68_0.16_155)]" },
  occupied: { label: "Occupied", cls: "border-[color-mix(in_oklch,var(--triage-red)_35%,transparent)] bg-[color-mix(in_oklch,var(--triage-red)_14%,transparent)] text-[color-mix(in_oklch,var(--triage-red)_90%,white)]", dot: "bg-[oklch(0.62_0.22_22)]" },
  cleaning: { label: "Cleaning", cls: "border-[color-mix(in_oklch,var(--triage-amber)_35%,transparent)] bg-[color-mix(in_oklch,var(--triage-amber)_14%,transparent)] text-[color-mix(in_oklch,var(--triage-amber)_90%,white)]", dot: "bg-[oklch(0.75_0.18_65)]" },
  reserved: { label: "Reserved", cls: "border-border bg-muted/60 text-muted-foreground", dot: "bg-muted-foreground" },
};

export function BedBoard({ beds }: { beds: Bed[] }) {
  const zones = Object.keys(ZONE_META);
  const stats = beds.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["free", "occupied", "cleaning", "reserved"] as const).map((s, i) => (
          <motion.div
            key={s}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 200, damping: 22 }}
          >
            <Card className="glass shadow-glass overflow-hidden">
              <CardContent className="relative p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {STATUS_META[s].label}
                    </div>
                    <div className="mt-1 text-2xl font-bold tabular-nums">{stats[s] ?? 0}</div>
                  </div>
                  <div className={cn("grid h-9 w-9 place-items-center rounded-lg border", STATUS_META[s].cls)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[s].dot)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Zone grids */}
      <div className="grid gap-4 lg:grid-cols-2">
        {zones.map((zone, zi) => {
          const zoneBeds = beds.filter((b) => b.zone === zone);
          if (!zoneBeds.length) return null;
          const meta = ZONE_META[zone];
          const occupied = zoneBeds.filter((b) => b.status === "occupied").length;
          const pct = zoneBeds.length ? Math.round((occupied / zoneBeds.length) * 100) : 0;
          return (
            <motion.div
              key={zone}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: zi * 0.08, type: "spring", stiffness: 200, damping: 22 }}
              whileHover={{ y: -2 }}
            >
              <Card className="glass shadow-glass overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br text-white shadow-md", meta.gradient)}>
                        <BedDouble className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-sm">{meta.label}</CardTitle>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {occupied}/{zoneBeds.length} occupied
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: zi * 0.08 + 0.2 }}
                        className={cn("h-full rounded-full bg-gradient-to-r", meta.gradient)}
                      />
                    </div>
                    <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{pct}%</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {zoneBeds.map((b, i) => (
                      <motion.div
                        key={b.id}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: Math.min(i * 0.02, 0.4) }}
                        whileHover={{ scale: 1.08, y: -2, rotateZ: 1 }}
                        className={cn(
                          "aspect-square rounded-xl border p-2 transition-all shadow-sm",
                          STATUS_META[b.status]?.cls ?? "border-border bg-card"
                        )}
                      >
                        <div className="flex h-full flex-col items-center justify-center">
                          <BedDouble className="h-3.5 w-3.5 opacity-80" />
                          <div className="mt-1 text-[10px] font-bold tabular-nums">{b.code.split("-")[1]}</div>
                          <div className="text-[9px] uppercase opacity-70">
                            {STATUS_META[b.status]?.label ?? b.status}
                          </div>
                        </div>
                        {(b.status === "occupied" || b.status === "cleaning") && (
                          <motion.span
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                            className={cn("absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full", STATUS_META[b.status].dot)}
                          />
                        )}
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
