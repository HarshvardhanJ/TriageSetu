"use client";

import { useMemo, useState } from "react";
import { UserPlus, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiClient } from "@/lib/api";
import { score, ageBand, vitalRanges, TIER_LABELS } from "@/lib/triage";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TierBadge } from "./tier-badge";
import type { Patient } from "@/lib/api";

const BLANK = {
  name: "",
  age: "",
  hr: "",
  rr: "",
  spo2: "",
  temp: "",
  sbp: "",
  avpu: "alert" as const,
  complaint: "",
  history: false,
  bleeding: false,
  breakGlass: false,
  gender: "unknown" as const,
};

export function IntakeForm({ onCreated }: { onCreated: (p: Patient) => void }) {
  const [f, setF] = useState({ ...BLANK });
  const [submitting, setSubmitting] = useState(false);
  const { hospitalId } = useAppStore();

  const preview = useMemo(() => {
    const age = parseInt(f.age, 10);
    if (!f.name || !age || !f.hr || !f.rr || !f.spo2 || !f.temp || !f.sbp || !f.complaint) {
      return null;
    }
    return score({
      display_name: f.name,
      age,
      heart_rate: +f.hr,
      respiratory_rate: +f.rr,
      spo2: +f.spo2,
      temperature: +f.temp,
      systolic_bp: +f.sbp,
      avpu: f.avpu,
      complaint: f.complaint,
      history_available: f.history,
      active_bleeding: f.bleeding,
      break_glass: f.breakGlass,
      gender: f.gender,
    });
  }, [f]);

  const band = f.age ? ageBand(parseInt(f.age, 10)) : null;
  const ranges = band ? vitalRanges(band) : null;

  const submit = async () => {
    if (!preview) {
      toast.error("Please complete all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const p = await apiClient.createPatient({
        display_name: f.name,
        age: parseInt(f.age, 10),
        heart_rate: +f.hr,
        respiratory_rate: +f.rr,
        spo2: +f.spo2,
        temperature: +f.temp,
        systolic_bp: +f.sbp,
        avpu: f.avpu,
        complaint: f.complaint,
        history_available: f.history,
        active_bleeding: f.bleeding,
        break_glass: f.breakGlass,
        gender: f.gender,
        hospitalId: hospitalId ?? undefined,
      });
      toast.success("Patient scored and placed in queue.");
      setF({ ...BLANK });
      onCreated(p);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      {/* Form */}
      <Card className="border border-border shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Live preview scoring
            </span>
          </div>
          <CardTitle className="mt-2 text-base">Register a new arrival</CardTitle>
          <CardDescription className="text-xs">
            Fields mirror the structured signal sent to the scoring engine. Preview updates as you type.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Display name" required>
              <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Priya N." />
            </Field>
            <Field label="Age (years)" required>
              <Input type="number" value={f.age} onChange={(e) => setF({ ...f, age: e.target.value })} placeholder="29" />
            </Field>
            <Field label="Sex">
              <Select value={f.gender} onValueChange={(v) => setF({ ...f, gender: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Vitals */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Vital signs
              </span>
              {band && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {band} reference ranges applied
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Heart rate" unit="bpm" required hint={ranges ? `${ranges.hr[0]}–${ranges.hr[1]}` : undefined}>
                <Input type="number" value={f.hr} onChange={(e) => setF({ ...f, hr: e.target.value })} placeholder="80" />
              </Field>
              <Field label="Resp rate" unit="/min" required hint={ranges ? `${ranges.rr[0]}–${ranges.rr[1]}` : undefined}>
                <Input type="number" value={f.rr} onChange={(e) => setF({ ...f, rr: e.target.value })} placeholder="16" />
              </Field>
              <Field label="SpO₂" unit="%" required hint={ranges ? `${ranges.spo2[0]}–${ranges.spo2[1]}` : undefined}>
                <Input type="number" value={f.spo2} onChange={(e) => setF({ ...f, spo2: e.target.value })} placeholder="98" />
              </Field>
              <Field label="Temperature" unit="°C" required hint={ranges ? `${ranges.temp[0]}–${ranges.temp[1]}` : undefined}>
                <Input type="number" step="0.1" value={f.temp} onChange={(e) => setF({ ...f, temp: e.target.value })} placeholder="37.0" />
              </Field>
              <Field label="Systolic BP" unit="mmHg" required hint={ranges ? `${ranges.sbp[0]}–${ranges.sbp[1]}` : undefined}>
                <Input type="number" value={f.sbp} onChange={(e) => setF({ ...f, sbp: e.target.value })} placeholder="118" />
              </Field>
              <Field label="AVPU" required>
                <Select value={f.avpu} onValueChange={(v) => setF({ ...f, avpu: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="voice">Responds to voice</SelectItem>
                    <SelectItem value="pain">Responds to pain</SelectItem>
                    <SelectItem value="unresponsive">Unresponsive</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          {/* Complaint */}
          <Field label="Chief complaint" required>
            <Textarea value={f.complaint} onChange={(e) => setF({ ...f, complaint: e.target.value })} placeholder="Describe the patient complaint…" rows={3} />
          </Field>

          {/* Flags */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <FlagCheck checked={f.history} onChange={(v) => setF({ ...f, history: v })} label="Prior history available" />
            <FlagCheck checked={f.bleeding} onChange={(v) => setF({ ...f, bleeding: v })} label="Active severe bleeding" />
            <FlagCheck checked={f.breakGlass} onChange={(v) => setF({ ...f, breakGlass: v })} label="Break-glass access" />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-muted-foreground">
              Pseudonymous identifier will be auto-assigned on save.
            </p>
            <Button onClick={submit} disabled={!preview || submitting} className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              {submitting ? "Scoring…" : "Score & add to queue"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live preview */}
      <div className="space-y-4">
        <Card className={cn(
          "border border-border",
          preview && preview.recommended_tier <= 2 && "border-l-4 border-l-triage-red",
          preview && preview.recommended_tier === 3 && "border-l-4 border-l-triage-amber",
          preview && preview.recommended_tier >= 4 && "border-l-4 border-l-triage-green"
        )}>
          <CardHeader className="pb-3">
            <CardDescription className="text-[10px] font-semibold uppercase tracking-wide">
              Live preview
            </CardDescription>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recommendation</CardTitle>
              {preview ? <TierBadge tier={preview.recommended_tier} size="md" animated /> : <span className="text-xs text-muted-foreground">Awaiting input</span>}
            </div>
          </CardHeader>
          <CardContent>
            {preview ? (
              <div className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span>Confidence</span>
                    <span className="tabular-nums font-semibold" style={{ color: preview.confidence >= 80 ? "var(--triage-green)" : preview.confidence >= 62 ? "var(--triage-amber)" : "var(--triage-red)" }}>
                      {preview.confidence}% · {preview.confidence_label}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${preview.confidence}%`,
                        background: preview.confidence >= 80 ? "var(--triage-green)" : preview.confidence >= 62 ? "var(--triage-amber)" : "var(--triage-red)",
                      }}
                    />
                  </div>
                </div>
                {preview.reasons.length > 0 && (
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-xs leading-relaxed">
                    <div className="mb-1 font-semibold text-foreground">Reasons</div>
                    <ul className="space-y-1">
                      {preview.reasons.map((r) => (
                        <li key={r} className="text-muted-foreground">• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {preview.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {preview.flags.map((fl) => (
                      <span key={fl} className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px]">
                        {fl}
                      </span>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Rule</div>
                    <div className="text-[11px] font-medium">{TIER_LABELS[preview.rule_tier].split("·")[1]?.trim()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">ML</div>
                    <div className="text-[11px] font-medium">{TIER_LABELS[preview.ml_tier].split("·")[1]?.trim()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Fused</div>
                    <div className="text-[11px] font-medium">{TIER_LABELS[preview.recommended_tier].split("·")[1]?.trim()}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Sparkles className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">
                  Fill required fields to see the live recommendation.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Safety boundary</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-1 text-xs text-muted-foreground">
              <li><strong className="text-foreground">1.</strong> Age-normalize every vital.</li>
              <li><strong className="text-foreground">2.</strong> Apply transparent red-flag rules.</li>
              <li><strong className="text-foreground">3.</strong> Estimate risk tier from structured signals.</li>
              <li><strong className="text-foreground">4.</strong> Escalate one level on uncertainty or disagreement.</li>
              <li><strong className="text-foreground">5.</strong> Re-assess against the wait-time safety window.</li>
            </ol>
            <p className="mt-2 text-[11px] italic text-muted-foreground">
              The explanation layer narrates the decision; it never chooses the tier.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  unit,
  required,
  hint,
  children,
}: {
  label: string;
  unit?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs">
        {label}
        {unit && <span className="ml-1 text-[10px] text-muted-foreground">{unit}</span>}
        {required && <span className="ml-0.5 text-[color-mix(in_oklch,var(--triage-red)_85%,white)]">*</span>}
      </Label>
      <div className="mt-1">{children}</div>
      {hint && <div className="mt-1 text-[10px] text-muted-foreground">ref {hint}</div>}
    </div>
  );
}

function FlagCheck({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs transition-colors",
        checked ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted/40"
      )}
    >
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      <span className="text-foreground">{label}</span>
    </label>
  );
}
