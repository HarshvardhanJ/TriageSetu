"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Search, ScrollText } from "lucide-react";
import type { AuditEntry } from "@/lib/api";
import { apiClient } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const EVENT_DOT: Record<string, string> = {
  INTAKE: "bg-gradient-to-br from-[oklch(0.7_0.18_250)] to-[oklch(0.65_0.2_295)]",
  OVERRIDE: "bg-gradient-to-br from-[oklch(0.75_0.18_65)] to-[oklch(0.78_0.19_70)]",
  CONFIRMATION: "bg-gradient-to-br from-[oklch(0.68_0.16_155)] to-[oklch(0.72_0.17_160)]",
  REASSESSMENT: "bg-gradient-to-br from-[oklch(0.65_0.14_200)] to-[oklch(0.55_0.16_250)]",
  SURGE_POLICY: "bg-gradient-to-br from-[oklch(0.65_0.22_25)] to-[oklch(0.72_0.24_30)]",
  SYSTEM: "bg-muted-foreground",
  DISCHARGE: "bg-gradient-to-br from-[oklch(0.62_0.22_300)] to-[oklch(0.55_0.16_290)]",
  STATUS_CHANGE: "bg-muted-foreground",
};

const EVENT_LABEL: Record<string, string> = {
  INTAKE: "bg-gradient-to-r from-[oklch(0.7_0.18_250)] to-[oklch(0.65_0.2_295)]",
  OVERRIDE: "bg-gradient-to-r from-[oklch(0.75_0.18_65)] to-[oklch(0.78_0.19_70)]",
  CONFIRMATION: "bg-gradient-to-r from-[oklch(0.68_0.16_155)] to-[oklch(0.72_0.17_160)]",
  REASSESSMENT: "bg-gradient-to-r from-[oklch(0.65_0.14_200)] to-[oklch(0.55_0.16_250)]",
  SURGE_POLICY: "bg-gradient-to-r from-[oklch(0.65_0.22_25)] to-[oklch(0.72_0.24_30)]",
  SYSTEM: "bg-muted-foreground",
  DISCHARGE: "bg-gradient-to-r from-[oklch(0.62_0.22_300)] to-[oklch(0.55_0.16_290)]",
  STATUS_CHANGE: "bg-muted-foreground",
};

export function AuditTrail({ entries }: { entries: AuditEntry[] }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");

  const types = useMemo(() => {
    const set = new Set(entries.map((e) => e.eventType));
    return ["all", ...Array.from(set)];
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (type !== "all" && e.eventType !== type) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          (e.patientId ?? "").toLowerCase().includes(q) ||
          e.eventType.toLowerCase().includes(q) ||
          (e.clinicianId ?? "").toLowerCase().includes(q) ||
          JSON.stringify(e.detail).toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [entries, search, type]);

  const exportLog = async () => {
    try {
      const data = await apiClient.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `triagesetu-audit-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Audit log exported (pseudonymized).");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all",
                type === t
                  ? "bg-gradient-to-r from-[oklch(0.7_0.18_250)] to-[oklch(0.65_0.2_295)] text-white shadow-md"
                  : "bg-muted/50 backdrop-blur-md text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "all" ? "All events" : t.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit log…"
              className="h-8 w-full bg-card/60 backdrop-blur-md pl-8 sm:w-56"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 bg-card/60 backdrop-blur-md" onClick={exportLog}>
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-border glass shadow-glass p-3 sm:p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted">
              <ScrollText className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">No audit entries match this filter.</p>
          </div>
        ) : (
          <ol className="relative space-y-0.5">
            {/* Vertical gradient connector */}
            <div className="absolute bottom-3 left-[6px] top-3 w-0.5 bg-gradient-to-b from-[oklch(0.7_0.18_250)] via-[oklch(0.65_0.2_295)] to-[oklch(0.68_0.16_155)] opacity-40" />
            {filtered.slice(0, 200).map((e, i) => (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.01, 0.3) }}
                whileHover={{ x: 3 }}
                className="group relative flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/40"
              >
                <div className="relative z-10 mt-1 flex-shrink-0">
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: Math.min(i * 0.01, 0.3) + 0.1, type: "spring", stiffness: 400, damping: 25 }}
                    className={cn(
                      "block h-3 w-3 rounded-full ring-2 ring-card shadow-md",
                      EVENT_DOT[e.eventType] ?? "bg-muted-foreground"
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap text-white shadow-sm",
                        EVENT_LABEL[e.eventType] ?? "bg-muted-foreground"
                      )}
                    >
                      {e.eventType.replace("_", " ")}
                    </span>
                    {e.patientId && (
                      <span className="font-mono text-[11px] tabular-nums text-foreground/80">{e.patientId}</span>
                    )}
                    {e.clinicianId && (
                      <span className="text-[11px] text-muted-foreground">
                        · {e.clinicianId}
                        {e.clinicianRole ? ` (${e.clinicianRole})` : ""}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {e.detail.message ||
                      (e.detail.from_tier !== undefined
                        ? `Tier ${e.detail.from_tier} → ${e.detail.to_tier}. ${e.detail.reason ?? ""}`
                        : JSON.stringify(e.detail).slice(0, 200))}
                  </p>
                </div>
                <time className="hidden w-28 flex-shrink-0 text-right text-[10px] tabular-nums text-muted-foreground sm:block">
                  {new Date(e.createdAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </time>
              </motion.li>
            ))}
          </ol>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Append-only ledger · {filtered.length} of {entries.length} entries shown · raw export is pseudonymized unless break-glass was exercised.
      </p>
    </div>
  );
}
