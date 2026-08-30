"use client";

import { useMemo, useState, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Search, AlertTriangle, ChevronRight, Eye, HeartPulse, Wind, Droplet } from "lucide-react";
import type { Patient } from "@/lib/api";
import { TierBadge } from "./tier-badge";
import { ConfidenceMeter } from "./confidence-meter";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type FilterKey = "all" | "red" | "amber" | "green" | "review" | "overdue";

const AVATAR_GRADIENTS = [
  "from-[oklch(0.7_0.18_250)] to-[oklch(0.65_0.2_295)]",
  "from-[oklch(0.65_0.14_200)] to-[oklch(0.55_0.16_250)]",
  "from-[oklch(0.68_0.16_155)] to-[oklch(0.72_0.17_160)]",
  "from-[oklch(0.78_0.19_70)] to-[oklch(0.65_0.22_25)]",
  "from-[oklch(0.62_0.22_300)] to-[oklch(0.55_0.16_290)]",
  "from-[oklch(0.55_0.16_250)] to-[oklch(0.62_0.22_300)]",
  "from-[oklch(0.7_0.14_200)] to-[oklch(0.68_0.16_155)]",
  "from-[oklch(0.65_0.2_295)] to-[oklch(0.7_0.18_250)]",
];

function avatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function PatientCard3D({ p, onReview, index }: { p: Patient; onReview: (p: Patient) => void; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [8, -8]), { stiffness: 300, damping: 25 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-8, 8]), { stiffness: 300, damping: 25 });

  const glareX = useTransform(mouseX, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(mouseY, [0, 1], ["0%", "100%"]);
  const glareBg = useTransform(
    [glareX, glareY],
    ([x, y]) => `radial-gradient(circle at ${x} ${y}, rgb(255 255 255 / 0.15), transparent 60%)`
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  const d = p.data;
  const s = p.score;
  const tier = s.display_tier ?? s.recommended_tier;
  const overdue = s.flags.includes("Reassessment overdue");
  const review = s.flags.includes("Needs clinician review");
  const clinicianSet = p.clinicianTier !== null;
  const isUrgent = tier <= 2;

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => onReview(p)}
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4), type: "spring", stiffness: 200, damping: 22 }}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl glass-card shadow-glass transition-shadow hover:shadow-depth",
        isUrgent && "border-[color-mix(in_oklch,var(--triage-red)_35%,transparent)]",
        overdue && "shadow-glow-red"
      )}
    >
      {/* Tier tint background */}
      <div className={cn(
        "pointer-events-none absolute inset-0 opacity-60",
        tier <= 2 ? "bg-gradient-to-br from-[color-mix(in_oklch,var(--triage-red)_12%,transparent)] via-transparent to-transparent"
        : tier === 3 ? "bg-gradient-to-br from-[color-mix(in_oklch,var(--triage-amber)_10%,transparent)] via-transparent to-transparent"
        : "bg-gradient-to-br from-[color-mix(in_oklch,var(--triage-green)_8%,transparent)] via-transparent to-transparent"
      )} />

      {/* Glare overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ background: glareBg }}
      />

      <div className="relative p-4" style={{ transform: "translateZ(30px)" }}>
        {/* Header: avatar + name + tier */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-[11px] font-bold text-white shadow-md",
              avatarGradient(p.displayName)
            )}>
              {p.displayName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
              {isUrgent && (
                <motion.span
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[color-mix(in_oklch,var(--triage-red)_90%,white)] ring-2 ring-card"
                />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-foreground">{p.displayName}</span>
                {p.revealed && <Eye className="h-3 w-3 text-muted-foreground" />}
              </div>
              <div className="text-[11px] text-muted-foreground tabular-nums">
                {p.id} · {d.age}y · {s.age_band}
              </div>
            </div>
          </div>
          <TierBadge tier={tier} size="sm" animated />
        </div>

        {/* Complaint */}
        <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{d.complaint}</p>

        {/* Vitals row */}
        <div className="mt-3 flex items-center gap-3 text-[11px] tabular-nums">
          <span className="flex items-center gap-1 text-muted-foreground">
            <HeartPulse className="h-3 w-3 text-[color-mix(in_oklch,var(--triage-red)_80%,white)]" />
            <span className="font-semibold text-foreground">{d.heart_rate}</span>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Wind className="h-3 w-3 text-[color-mix(in_oklch,var(--triage-cyan)_80%,white)]" />
            <span className="font-semibold text-foreground">{d.respiratory_rate}</span>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Droplet className="h-3 w-3 text-[color-mix(in_oklch,var(--triage-violet)_80%,white)]" />
            <span className={cn("font-semibold", d.spo2 < 92 && "text-[color-mix(in_oklch,var(--triage-red)_90%,white)]")}>{d.spo2}%</span>
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums">
            {overdue && <AlertTriangle className="h-3 w-3 text-[color-mix(in_oklch,var(--triage-red)_90%,white)]" />}
            <span className={cn(overdue ? "text-[color-mix(in_oklch,var(--triage-red)_90%,white)]" : "text-foreground")}>
              {p.waitMinutes}m
            </span>
          </span>
        </div>

        {/* Confidence */}
        <div className="mt-3">
          <ConfidenceMeter value={s.confidence} label={s.confidence_label} />
        </div>

        {/* Flags */}
        {(clinicianSet || review || s.flags.includes("3× surge safety policy applied")) && (
          <div className="mt-3 flex flex-wrap gap-1">
            {clinicianSet && (
              <span className="rounded-md bg-gradient-to-r from-[oklch(0.7_0.18_250)] to-[oklch(0.65_0.2_295)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                Clinician set
              </span>
            )}
            {review && !clinicianSet && (
              <span className="rounded-md bg-gradient-to-r from-[oklch(0.62_0.22_300)] to-[oklch(0.55_0.16_290)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                Needs review
              </span>
            )}
            {s.flags.includes("3× surge safety policy applied") && (
              <span className="rounded-md bg-gradient-to-r from-[oklch(0.65_0.22_25)] to-[oklch(0.72_0.24_30)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                Surge
              </span>
            )}
          </div>
        )}

        {/* Hover CTA */}
        <div className="mt-3 flex items-center justify-end opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px]">
            Review <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function LiveQueue({
  patients,
  onReview,
}: {
  patients: Patient[];
  onReview: (p: Patient) => void;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        const match =
          p.displayName.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.data.complaint.toLowerCase().includes(q);
        if (!match) return false;
      }
      const tier = p.score.display_tier ?? p.score.recommended_tier;
      if (filter === "all") return true;
      if (filter === "review") return p.score.flags.includes("Needs clinician review");
      if (filter === "overdue") return p.score.flags.includes("Reassessment overdue");
      const color = tier <= 2 ? "red" : tier === 3 ? "amber" : "green";
      return color === filter;
    });
  }, [patients, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: patients.length, red: 0, amber: 0, green: 0, review: 0, overdue: 0 };
    for (const p of patients) {
      const tier = p.score.display_tier ?? p.score.recommended_tier;
      const color = tier <= 2 ? "red" : tier === 3 ? "amber" : "green";
      c[color]++;
      if (p.score.flags.includes("Needs clinician review")) c.review++;
      if (p.score.flags.includes("Reassessment overdue")) c.overdue++;
    }
    return c;
  }, [patients]);

  const filterTabs: { id: FilterKey; label: string }[] = [
    { id: "all", label: "All" },
    { id: "red", label: "Urgent" },
    { id: "amber", label: "Watch" },
    { id: "green", label: "Stable" },
    { id: "review", label: "Needs review" },
    { id: "overdue", label: "Overdue" },
  ];

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          {filterTabs.map((t) => {
            const count = counts[t.id] ?? 0;
            const active = filter === t.id;
            return (
              <motion.button
                key={t.id}
                whileTap={{ scale: 0.95 }}
                whileHover={{ y: -1 }}
                onClick={() => setFilter(t.id)}
                className={cn(
                  "relative inline-flex items-center gap-1.5 overflow-hidden rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                  active
                    ? "text-white shadow-md"
                    : "bg-muted/50 backdrop-blur-md text-muted-foreground hover:text-foreground"
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`filter-${t.id}`}
                    className="absolute inset-0 bg-gradient-to-r from-[oklch(0.72_0.2_280)] to-[oklch(0.65_0.2_295)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{t.label}</span>
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      "relative z-10 rounded tabular-nums text-[10px] font-bold px-1",
                      active ? "bg-white/20 text-white" : "bg-card/60 text-muted-foreground"
                    )}
                  >
                    {count}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ID, complaint…"
            className="h-8 bg-card/60 backdrop-blur-md pl-8 text-[13px]"
          />
        </div>
      </div>

      {/* 3D card grid (desktop + mobile) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((p, i) => (
            <PatientCard3D key={p.id} p={p} onReview={onReview} index={i} />
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-1 py-16 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl glass">
            <Search className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">No matching patients in this view.</p>
          <p className="text-xs text-muted-foreground/70">Try a different filter or search term.</p>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Recommendations assist licensed clinicians; they do not make clinical decisions. Rules can only escalate,
        never downgrade. Confidence reflects model agreement, history availability, and feature completeness —
        not diagnostic certainty.
      </p>
    </div>
  );
}
