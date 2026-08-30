"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  HeartPulse,
  Wind,
  Thermometer,
  Droplet,
  Activity,
  Brain,
  Stethoscope,
  FileText,
  Send,
  ShieldOff,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import type { Patient, Note } from "@/lib/api";
import { apiClient } from "@/lib/api";
import { TierBadge } from "./tier-badge";
import { ConfidenceMeter } from "./confidence-meter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { TIER_LABELS } from "@/lib/triage";
import { cn } from "@/lib/utils";

export function PatientDetail({
  patient,
  open,
  onClose,
  onUpdated,
}: {
  patient: Patient | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { clinicianId, clinicianRole } = useAppStore();
  const [tier, setTier] = useState<number>(5);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (patient) {
      const t = patient.clinicianTier ?? patient.score.recommended_tier;
      setTier(t);
      setReason("");
      setNotes(patient.notes ?? []);
      setRevealed(patient.revealed);
    }
  }, [patient]);

  if (!patient) return null;
  const d = patient.data;
  const s = patient.score;
  const displayTier = patient.clinicianTier ?? s.recommended_tier;

  const save = async () => {
    if (reason.trim().length < 3) {
      toast.error("A clinical rationale is required.");
      return;
    }
    setSaving(true);
    try {
      await apiClient.override(patient.id, {
        tier,
        reason,
        clinician_id: clinicianId,
        clinician_role: clinicianRole,
      });
      toast.success(
        tier === s.recommended_tier
          ? "Confirmation logged in audit trail."
          : "Override recorded in audit trail."
      );
      onUpdated();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const discharge = async (status: "treated" | "transferred" | "discharged") => {
    try {
      await apiClient.setStatus(patient.id, status);
      toast.success(`Patient marked ${status}.`);
      onUpdated();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const addNote = async () => {
    if (noteText.trim().length < 1) return;
    try {
      const n = await apiClient.addNote(patient.id, {
        author: clinicianId,
        role: clinicianRole,
        text: noteText.trim(),
      });
      setNotes([n, ...notes]);
      setNoteText("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const reveal = () => {
    setRevealed(true);
    toast.info("Break-glass access logged to audit trail.");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="fixed left-[50%] top-[50%] z-50 flex max-h-[90vh] w-[96vw] max-w-[960px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border p-0 gap-0 glass-strong shadow-depth gradient-border-animated">
        {/* Header — fixed, always visible */}
        <DialogHeader className="relative shrink-0 overflow-hidden border-b border-border px-6 py-3">
          <div className={cn(
            "pointer-events-none absolute inset-0 opacity-40",
            displayTier <= 2 ? "bg-gradient-to-br from-[oklch(0.62_0.22_22)] via-transparent to-[oklch(0.78_0.19_70)]"
              : displayTier === 3 ? "bg-gradient-to-br from-[oklch(0.75_0.18_65)] via-transparent to-[oklch(0.78_0.19_70)]"
              : "bg-gradient-to-br from-[oklch(0.68_0.16_155)] via-transparent to-[oklch(0.65_0.14_200)]"
          )} />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-md",
                displayTier <= 2 ? "from-[oklch(0.62_0.22_22)] to-[oklch(0.65_0.24_18)]"
                : displayTier === 3 ? "from-[oklch(0.75_0.18_65)] to-[oklch(0.78_0.19_70)]"
                : "from-[oklch(0.68_0.16_155)] to-[oklch(0.72_0.17_160)]"
              )}>
                {patient.displayName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card/70 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <Stethoscope className="h-3 w-3" /> Review
                  </span>
                  {patient.clinicianTier !== null && (
                    <Badge className="bg-gradient-to-r from-[oklch(0.7_0.18_250)] to-[oklch(0.65_0.2_295)] text-white text-[10px]">
                      <UserCheck className="mr-1 h-3 w-3" /> Clinician-set
                    </Badge>
                  )}
                </div>
                <DialogTitle className="mt-1 flex items-center gap-2 text-lg">
                  <span className="text-gradient font-semibold tracking-tight">{patient.displayName}</span>
                  <TierBadge tier={displayTier} size="sm" />
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                  {patient.id} · {d.age}y · {s.age_band} · {patient.waitMinutes}m wait ·{" "}
                  {d.history_available ? "history available" : "no history"}
                </DialogDescription>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <ConfidenceMeter value={s.confidence} label={s.confidence_label} className="w-32" />
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable clinical content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Left: explanation, vitals, complaint */}
            <div className="space-y-3">
              {/* Explanation */}
              <div className="rounded-lg border border-border glass p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <FileText className="h-3 w-3" /> Explanation
                </div>
                <p className="text-[12px] leading-relaxed text-foreground">{s.explanation}</p>
                {s.flags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.flags.map((f) => (
                      <span key={f} className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] text-foreground">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Vitals */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Vitals</span>
                  {!revealed && (
                    <Button variant="ghost" size="sm" className="h-5 gap-1 text-[10px] px-1.5" onClick={reveal}>
                      <ShieldOff className="h-2.5 w-2.5" /> Break glass
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <VitalCard icon={HeartPulse} label="HR" value={d.heart_rate} unit="bpm" />
                  <VitalCard icon={Wind} label="RR" value={d.respiratory_rate} unit="/min" />
                  <VitalCard icon={Droplet} label="SpO₂" value={d.spo2} unit="%" />
                  <VitalCard icon={Thermometer} label="Temp" value={d.temperature} unit="°C" />
                  <VitalCard icon={Activity} label="BP" value={d.systolic_bp} unit="mmHg" />
                  <VitalCard icon={Brain} label="AVPU" value={d.avpu} unit="" />
                </div>
              </div>

              {/* Complaint */}
              <div className="rounded-lg border border-border glass p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Chief complaint</div>
                <p className="text-[12px] text-foreground">{d.complaint}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {d.active_bleeding && <Badge variant="destructive" className="text-[10px]">Bleeding</Badge>}
                  {d.history_available ? (
                    <Badge variant="secondary" className="text-[10px]">History</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">No history</Badge>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Notes</div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {notes.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-2 text-center text-[11px] text-muted-foreground">
                      No notes yet.
                    </div>
                  )}
                  {notes.map((n) => (
                    <div key={n.id} className="rounded-lg border border-border bg-muted/30 p-2">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-semibold">{n.author}</span>
                        <time>{new Date(n.createdAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}</time>
                      </div>
                      <p className="mt-0.5 text-[12px]">{n.text}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add note…"
                    rows={1}
                    className="text-[12px] min-h-[36px]"
                  />
                  <Button size="sm" className="self-end shrink-0" onClick={addNote} disabled={!noteText.trim()}>
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Right: decision trace + ML inputs */}
            <div className="space-y-3">
              {/* Decision trace */}
              <div className="rounded-lg border border-border glass p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Decision trace</div>
                <div className="space-y-1.5">
                  <TraceRow label="Rule safety net" tier={s.rule_tier} />
                  <TraceRow label="ML risk model" tier={s.ml_tier} />
                  <Separator />
                  <TraceRow label="Fused" tier={s.recommended_tier} strong />
                  {patient.clinicianTier !== null && (
                    <TraceRow label="Clinician" tier={patient.clinicianTier} strong />
                  )}
                </div>
              </div>

              {/* Top ML inputs */}
              <div className="rounded-lg border border-border glass p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Top ML inputs</div>
                <div className="space-y-1.5">
                  {s.feature_contributions.map((c) => (
                    <div key={c.feature} className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{c.feature}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-gradient-to-r from-[oklch(0.7_0.18_250)] to-[oklch(0.65_0.2_295)]" style={{ width: `${Math.min(100, c.impact * 25)}%` }} />
                        </div>
                        <span className="w-6 text-right tabular-nums font-medium">{c.impact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1 text-[11px]" onClick={() => discharge("treated")}>
                  <CheckCircle2 className="h-3 w-3" /> Discharge
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-[11px]" onClick={() => discharge("transferred")}>
                  Transfer
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky footer — Record decision always visible */}
        <div className="shrink-0 border-t border-border bg-card/80 backdrop-blur-xl px-6 py-3">
          <div className="flex items-end gap-3">
            <div className="flex-1 grid grid-cols-[auto_1fr] gap-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tier</label>
                <Select value={String(tier)} onValueChange={(v) => setTier(Number(v))}>
                  <SelectTrigger className="mt-0.5 h-9 w-[140px] text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((t) => (
                      <SelectItem key={t} value={String(t)} className="text-[12px]">
                        {TIER_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Rationale <span className="text-[color-mix(in_oklch,var(--triage-red)_85%,white)]">*</span></label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Clinical assessment / reason for tier…"
                  rows={1}
                  className="mt-0.5 text-[12px] min-h-[36px] resize-none"
                />
              </div>
            </div>
            <Button
              onClick={save}
              disabled={saving || reason.trim().length < 3}
              className="shrink-0 gap-1.5 bg-gradient-to-r from-[oklch(0.72_0.2_280)] to-[oklch(0.65_0.2_295)] text-white shadow-md disabled:opacity-40"
            >
              {saving ? "Recording…" : "Record decision"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VitalCard({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: any;
  label: string;
  value: string | number;
  unit: string;
}) {
  return (
    <div className="rounded-lg border border-border glass p-2">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-2.5 w-2.5" /> {label}
      </div>
      <div className="mt-0.5 text-sm font-bold tabular-nums">
        {value}
        {unit && <span className="ml-0.5 text-[9px] font-normal text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function TraceRow({
  label,
  tier,
  strong = false,
}: {
  label: string;
  tier: number;
  strong?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between", strong && "rounded-md bg-muted/50 px-2 py-1")}>
      <span className={cn("text-[11px]", strong ? "font-semibold text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
      <TierBadge tier={tier} size="sm" />
    </div>
  );
}
