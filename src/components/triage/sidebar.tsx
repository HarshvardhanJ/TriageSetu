"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Activity,
  UserPlus,
  ScrollText,
  BarChart3,
  BedDouble,
  Users,
  Settings,
  Stethoscope,
  ShieldCheck,
} from "lucide-react";

const NAV = [
  { id: "queue", label: "Live queue", icon: Activity, badge: true, grad: "from-[oklch(0.62_0.22_22)] to-[oklch(0.65_0.24_18)]" },
  { id: "intake", label: "New intake", icon: UserPlus, grad: "from-[oklch(0.7_0.18_250)] to-[oklch(0.65_0.2_295)]" },
  { id: "analytics", label: "Analytics", icon: BarChart3, grad: "from-[oklch(0.62_0.22_300)] to-[oklch(0.78_0.19_70)]" },
  { id: "beds", label: "Bed board", icon: BedDouble, grad: "from-[oklch(0.72_0.17_160)] to-[oklch(0.65_0.14_200)]" },
  { id: "staff", label: "Staff roster", icon: Users, grad: "from-[oklch(0.78_0.19_70)] to-[oklch(0.65_0.22_25)]" },
  { id: "audit", label: "Audit trail", icon: ScrollText, grad: "from-[oklch(0.7_0.14_200)] to-[oklch(0.55_0.16_250)]" },
  { id: "settings", label: "Settings", icon: Settings, grad: "from-[oklch(0.66_0.025_260)] to-[oklch(0.5_0.015_260)]" },
] as const;

export function Sidebar({ queueCount, surge }: { queueCount: number; surge: boolean }) {
  const { view, setView } = useAppStore();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-sidebar-border bg-sidebar backdrop-blur-2xl lg:flex">
      {/* Brand with 3D depth */}
      <div className="relative px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <motion.div
            initial={{ rotate: -10, scale: 0.85, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.72_0.2_280)] via-[oklch(0.65_0.2_295)] to-[oklch(0.7_0.18_250)] text-white shadow-lg"
            style={{ transform: "translateZ(20px)" }}
          >
            <Stethoscope className="h-5 w-5" />
            <motion.span
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.15, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="absolute -inset-1.5 rounded-xl bg-gradient-to-br from-[oklch(0.72_0.2_280)] to-[oklch(0.7_0.18_250)] opacity-50 blur-md"
            />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[color-mix(in_oklch,var(--triage-green)_90%,white)] ring-2 ring-sidebar live-pulse" />
          </motion.div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-tight text-sidebar-foreground">
              Triage<span className="text-gradient">Setu</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Safety-first triage
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-2 py-2 overflow-y-auto">
        <div className="px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Workspace
        </div>
        {NAV.map((item, idx) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => setView(item.id)}
              whileHover={{ x: 3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "group relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-md"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
              style={{ transformStyle: "preserve-3d" }}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute -left-0.5 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[oklch(0.72_0.2_280)] to-[oklch(0.65_0.2_295)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <div
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-lg transition-all",
                  active
                    ? `bg-gradient-to-br ${item.grad} text-white shadow-md`
                    : "bg-muted/60 text-muted-foreground group-hover:bg-muted"
                )}
                style={{ transform: active ? "translateZ(15px)" : "translateZ(0)" }}
              >
                <Icon className="h-[15px] w-[15px]" />
              </div>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && queueCount > 0 && (
                <motion.span
                  key={queueCount}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    active
                      ? "bg-primary/20 text-primary"
                      : "bg-gradient-to-r from-[oklch(0.62_0.22_22)] to-[oklch(0.78_0.19_70)] text-white"
                  )}
                >
                  {queueCount}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Surge status */}
      <div className="px-3 pb-3">
        <motion.div
          animate={surge ? { boxShadow: "0 0 36px color-mix(in oklch, var(--surge) 40%, transparent)" } : {}}
          className={cn(
            "relative overflow-hidden rounded-xl border p-3 transition-colors",
            surge
              ? "border-[color-mix(in_oklch,var(--surge)_40%,transparent)] bg-gradient-to-br from-[color-mix(in_oklch,var(--surge)_18%,transparent)] to-[color-mix(in_oklch,var(--triage-red)_8%,transparent)]"
              : "border-border bg-card/60"
          )}
        >
          {surge && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute -right-8 -top-8 h-16 w-16 rounded-full bg-gradient-to-br from-[color-mix(in_oklch,var(--surge)_30%,transparent)] to-transparent opacity-60"
            />
          )}
          <div className="relative flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                surge
                  ? "bg-[color-mix(in_oklch,var(--surge)_90%,white)] surge-pulse"
                  : "bg-[color-mix(in_oklch,var(--triage-green)_85%,white)]"
              )}
            />
            <span className="text-xs font-semibold text-sidebar-foreground">
              {surge ? "3× Surge active" : "Standard policy"}
            </span>
          </div>
          <p className="relative mt-1 text-[11px] leading-snug text-muted-foreground">
            {surge ? "Borderline cases auto-escalate." : "Normal arrival volume."}
          </p>
        </motion.div>
      </div>

      {/* Privacy footer */}
      <div className="flex items-center gap-1.5 border-t border-sidebar-border px-4 py-2.5 text-[10px] text-muted-foreground">
        <ShieldCheck className="h-3 w-3 text-[color-mix(in_oklch,var(--triage-green)_85%,white)]" />
        <span>Pseudonymous · DPDP-ready</span>
      </div>
    </aside>
  );
}
