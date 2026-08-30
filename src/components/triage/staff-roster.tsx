"use client";

import { motion } from "framer-motion";
import { Moon, Sun, Sunset, UserCheck, UserX } from "lucide-react";
import type { StaffMember } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const ROLE_GRADIENTS: Record<string, string> = {
  triage_nurse: "from-[oklch(0.7_0.18_250)] to-[oklch(0.65_0.2_295)]",
  charge_nurse: "from-[oklch(0.65_0.14_200)] to-[oklch(0.55_0.16_250)]",
  ed_physician: "from-[oklch(0.62_0.22_300)] to-[oklch(0.55_0.16_290)]",
  resident: "from-[oklch(0.78_0.19_70)] to-[oklch(0.65_0.22_25)]",
  consultant: "from-[oklch(0.75_0.18_65)] to-[oklch(0.78_0.19_70)]",
};

const ROLE_LABELS: Record<string, string> = {
  triage_nurse: "Triage Nurse",
  charge_nurse: "Charge Nurse",
  ed_physician: "ED Physician",
  resident: "Resident",
  consultant: "Consultant",
};

const SHIFT_META: Record<string, { label: string; icon: any; gradient: string }> = {
  day: { label: "Day", icon: Sun, gradient: "from-[oklch(0.78_0.19_70)] to-[oklch(0.75_0.18_65)]" },
  evening: { label: "Evening", icon: Sunset, gradient: "from-[oklch(0.75_0.18_65)] to-[oklch(0.65_0.22_25)]" },
  night: { label: "Night", icon: Moon, gradient: "from-[oklch(0.65_0.14_200)] to-[oklch(0.55_0.16_250)]" },
};

export function StaffRoster({ staff }: { staff: StaffMember[] }) {
  const onDuty = staff.filter((s) => s.onDuty);
  const offDuty = staff.filter((s) => !s.onDuty);
  const totalLoad = onDuty.reduce((s, m) => s + m.load, 0);
  const avgLoad = onDuty.length ? Math.round(totalLoad / onDuty.length) : 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "On duty", value: onDuty.length, gradient: "from-[oklch(0.68_0.16_155)] to-[oklch(0.72_0.17_160)]" },
          { label: "Off duty", value: offDuty.length, gradient: "from-[oklch(0.66_0.02_260)] to-[oklch(0.5_0.015_260)]" },
          { label: "Total patient load", value: totalLoad, gradient: "from-[oklch(0.7_0.18_250)] to-[oklch(0.65_0.2_295)]" },
          { label: "Avg load / clinician", value: avgLoad, gradient: "from-[oklch(0.62_0.22_300)] to-[oklch(0.55_0.16_290)]" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.04, type: "spring", stiffness: 200, damping: 22 }}
          >
            <Card className="glass shadow-glass overflow-hidden">
              <CardContent className="relative p-3">
                <div className="pointer-events-none absolute -right-3 -top-3 h-12 w-12 rounded-full bg-gradient-to-br opacity-20 blur-2xl" style={{ background: `linear-gradient(135deg, var(--primary), var(--triage-violet))` }} />
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
                <div className={cn("mt-1 bg-gradient-to-r bg-clip-text text-2xl font-bold tabular-nums text-transparent", s.gradient)}>
                  {s.value}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* On duty */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[oklch(0.68_0.16_155)] to-[oklch(0.72_0.17_160)] text-white shadow-md">
            <UserCheck className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold">On duty now</h3>
          <span className="rounded-md bg-gradient-to-r from-[oklch(0.68_0.16_155)] to-[oklch(0.72_0.17_160)] px-2 py-0.5 text-[10px] font-bold text-white">
            {onDuty.length}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {onDuty.map((m, i) => {
            const role = ROLE_LABELS[m.role] ?? m.role;
            const grad = ROLE_GRADIENTS[m.role] ?? "from-[oklch(0.66_0.02_260)] to-[oklch(0.5_0.015_260)]";
            const ShiftIcon = SHIFT_META[m.shift]?.icon ?? Sun;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: Math.min(i * 0.05, 0.4), type: "spring", stiffness: 200, damping: 22 }}
                whileHover={{ y: -3 }}
              >
                <Card className="group relative overflow-hidden glass shadow-glass">
                  <CardContent className="relative p-4">
                    <div className={cn("pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br opacity-20 blur-2xl transition-opacity group-hover:opacity-40", grad)} />
                    <div className="relative flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-10 w-10 ring-2 ring-border">
                          <AvatarFallback className={cn("bg-gradient-to-br text-xs font-bold text-white", grad)}>
                            {m.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-semibold">{m.name}</div>
                          <div className="text-[11px] text-muted-foreground">{role}</div>
                        </div>
                      </div>
                      <span className={cn("inline-flex items-center gap-1 rounded-md bg-gradient-to-r px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm", SHIFT_META[m.shift]?.gradient ?? "from-muted to-muted")}>
                        <ShiftIcon className="h-2.5 w-2.5" /> {SHIFT_META[m.shift]?.label}
                      </span>
                    </div>
                    <div className="relative mt-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Patient load</span>
                        <span className={cn(
                          "font-bold tabular-nums",
                          m.load > 6 ? "text-[color-mix(in_oklch,var(--triage-red)_90%,white)]"
                          : m.load > 4 ? "text-[color-mix(in_oklch,var(--triage-amber)_90%,white)]"
                          : "text-foreground"
                        )}>{m.load}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, m.load * 12)}%` }}
                          transition={{ duration: 0.8, delay: i * 0.05 + 0.2 }}
                          className={cn(
                            "h-full rounded-full bg-gradient-to-r",
                            m.load > 6 ? "from-[oklch(0.62_0.22_22)] to-[oklch(0.65_0.24_18)]"
                            : m.load > 4 ? "from-[oklch(0.75_0.18_65)] to-[oklch(0.78_0.19_70)]"
                            : "from-[oklch(0.68_0.16_155)] to-[oklch(0.72_0.17_160)]"
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Off duty */}
      {offDuty.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-muted text-muted-foreground">
              <UserX className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-muted-foreground">Off duty</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {offDuty.map((m) => {
              const role = ROLE_LABELS[m.role] ?? m.role;
              const grad = ROLE_GRADIENTS[m.role] ?? "from-muted to-muted";
              return (
                <div key={m.id} className="rounded-xl border border-border glass p-3 opacity-70">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className={cn("bg-gradient-to-br text-[10px] font-bold text-white opacity-60", grad)}>
                        {m.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium">{m.name}</div>
                      <div className="text-[10px] text-muted-foreground">{role}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
