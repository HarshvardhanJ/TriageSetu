"use client";

import { useAppStore } from "@/lib/store";
import { useTheme } from "next-themes";
import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  Moon,
  Clock,
  Zap,
  RotateCw,
  Hospital as HospitalIcon,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Hospital } from "@/lib/api";

const VIEW_TITLES: Record<string, { title: string; subtitle: string }> = {
  queue: { title: "Live priority queue", subtitle: "Safety-first recommendations, awaiting clinician confirmation." },
  intake: { title: "New patient intake", subtitle: "Structured capture mirrored to the scoring engine." },
  analytics: { title: "Department analytics", subtitle: "Throughput, distribution and deterioration signals." },
  beds: { title: "Bed & resource board", subtitle: "Zone-level capacity across the department." },
  staff: { title: "Staff roster", subtitle: "On-duty clinicians and live patient load." },
  audit: { title: "Clinical audit trail", subtitle: "Append-only ledger of every recommendation and override." },
  settings: { title: "Workspace settings", subtitle: "Jurisdiction, retention, consent and clinician identity." },
};

export function Header({
  hospitals,
  surge,
  onSurge,
  onAdvance,
  onRefresh,
  refreshing,
}: {
  hospitals: Hospital[];
  surge: boolean;
  onSurge: () => void;
  onAdvance: (minutes: number) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const { view, hospitalId, setHospitalId, clinicianId, clinicianRole } = useAppStore();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const meta = VIEW_TITLES[view] ?? VIEW_TITLES.queue;
  const activeHospital = hospitals.find((h) => h.id === hospitalId) ?? hospitals[0];

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-4 px-6 py-4 lg:px-8">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color-mix(in_oklch,var(--triage-green)_70%,transparent)] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color-mix(in_oklch,var(--triage-green)_90%,white)] live-pulse" />
              </span>
              ED · Live
            </span>
            {surge && (
              <span className="inline-flex items-center gap-1 rounded-md border border-[color-mix(in_oklch,var(--surge)_35%,transparent)] bg-[color-mix(in_oklch,var(--surge)_15%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color-mix(in_oklch,var(--surge)_90%,white)]">
                <Zap className="h-3 w-3" /> Surge
              </span>
            )}
          </div>
          <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-foreground">
            <span className="text-gradient">{meta.title}</span>
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{meta.subtitle}</p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {/* Hospital switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 bg-card/60 backdrop-blur-md">
                <HospitalIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="hidden max-w-[140px] truncate sm:inline">
                  {activeHospital?.name.split(" — ")[0] ?? "Select hospital"}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 glass-strong">
              <DropdownMenuLabel>Active facility</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hospitals.map((h) => (
                <DropdownMenuItem
                  key={h.id}
                  onClick={() => setHospitalId(h.id)}
                  className="flex flex-col items-start gap-0.5 py-2"
                >
                  <span className="text-[13px] font-medium">{h.name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {h.code} · {h.type.replace("_", " ")} · {h.bedsTotal} beds
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clock */}
          <div className="hidden items-center gap-1.5 rounded-md border border-border bg-card/60 backdrop-blur-md px-2.5 py-1.5 text-[11px] tabular-nums text-muted-foreground md:flex">
            <Clock className="h-3 w-3" />
            {mounted && now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
          </div>

          {/* Advance clock */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 bg-card/60 backdrop-blur-md">
                <RotateCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Advance</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-strong">
              <DropdownMenuLabel>Reassess queue</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[15, 30, 60].map((m) => (
                <DropdownMenuItem key={m} onClick={() => onAdvance(m)}>
                  Advance +{m} min
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Surge toggle */}
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="sm"
              variant={surge ? "default" : "outline"}
              onClick={onSurge}
              className={cn(
                "relative gap-1.5 h-8 overflow-hidden transition-all",
                surge
                  ? "border-[color-mix(in_oklch,var(--surge)_40%,transparent)] bg-gradient-to-r from-[oklch(0.65_0.22_25)] to-[oklch(0.72_0.24_30)] text-white shadow-[0_4px_16px_-4px_color-mix(in_oklch,var(--surge)_60%,transparent)] hover:shadow-[0_6px_20px_-4px_color-mix(in_oklch,var(--surge)_70%,transparent)]"
                  : "bg-card/60 backdrop-blur-md hover:border-[color-mix(in_oklch,var(--surge)_40%,transparent)]"
              )}
            >
              {surge && (
                <motion.div
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                />
              )}
              <motion.span
                animate={surge ? { scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] } : {}}
                transition={{ duration: 0.8, repeat: surge ? Infinity : 0, repeatDelay: 1.4 }}
              >
                <Zap className="h-3.5 w-3.5" />
              </motion.span>
              <span className="relative hidden sm:inline">{surge ? "Surge on" : "3× Surge"}</span>
            </Button>
          </motion.div>

          {/* Refresh */}
          <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-card/60 backdrop-blur-md" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </Button>

          {/* Theme toggle */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 bg-card/60 backdrop-blur-md"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <AnimatePresence mode="wait" initial={false}>
              {mounted && theme === "dark" ? (
                <motion.span key="sun" initial={{ rotate: -90, opacity: 0, scale: 0.6 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 90, opacity: 0, scale: 0.6 }} transition={{ duration: 0.2 }}>
                  <Sun className="h-3.5 w-3.5" />
                </motion.span>
              ) : (
                <motion.span key="moon" initial={{ rotate: 90, opacity: 0, scale: 0.6 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: -90, opacity: 0, scale: 0.6 }} transition={{ duration: 0.2 }}>
                  <Moon className="h-3.5 w-3.5" />
                </motion.span>
              )}
            </AnimatePresence>
          </Button>

          {/* Clinician chip */}
          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2 bg-card/60 backdrop-blur-md">
            <div className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.7_0.18_250)] to-[oklch(0.65_0.2_295)] text-[9px] font-bold text-white">
              {clinicianId.split("-")[0].slice(0, 2)}
            </div>
            <span className="hidden text-[11px] lg:inline">{clinicianRole}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
