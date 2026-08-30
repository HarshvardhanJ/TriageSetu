"use client";

import { useMemo, useState, type ReactNode } from "react";
import { History, Loader2, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient, type AbhaHistory, type Patient } from "@/lib/api";
import { ageBand, score, TIER_LABELS, vitalRanges } from "@/lib/triage";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TierBadge } from "./tier-badge";

const BLANK = { name: "", age: "", hr: "", rr: "", spo2: "", temp: "", sbp: "", avpu: "alert" as const, complaint: "", history: false, bleeding: false, breakGlass: false, gender: "unknown" as const };

export function IntakeForm({ onCreated }: { onCreated: (p: Patient) => void }) {
  const [f, setF] = useState({ ...BLANK });
  const [abhaNumber, setAbhaNumber] = useState("");
  const [history, setHistory] = useState<AbhaHistory | null>(null);
  const [consent, setConsent] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { hospitalId } = useAppStore();
  const set = (patch: Partial<typeof f>) => setF((current) => ({ ...current, ...patch }));

  const preview = useMemo(() => {
    const age = parseInt(f.age, 10);
    if (!f.name || !age || !f.hr || !f.rr || !f.spo2 || !f.temp || !f.sbp || !f.complaint) return null;
    return score({ display_name: f.name, age, heart_rate: +f.hr, respiratory_rate: +f.rr, spo2: +f.spo2, temperature: +f.temp, systolic_bp: +f.sbp, avpu: f.avpu, complaint: f.complaint, history_available: f.history, active_bleeding: f.bleeding, break_glass: f.breakGlass, gender: f.gender });
  }, [f]);
  const band = f.age ? ageBand(parseInt(f.age, 10)) : null;
  const ranges = band ? vitalRanges(band) : null;

  const fetchHistory = async () => {
    if (abhaNumber.length !== 14) return toast.error("Enter a 14-digit ABHA number.");
    if (!consent) return toast.error("Confirm patient consent before requesting history.");
    setHistoryLoading(true);
    try {
      const result = await apiClient.abhaHistory(abhaNumber, hospitalId ?? undefined);
      setHistory(result.history); set({ history: true }); setConsent(false);
      toast.success("Prior history linked.");
    } catch (error) { toast.error((error as Error).message); }
    finally { setHistoryLoading(false); }
  };

  const submit = async () => {
    if (!preview) return toast.error("Please complete all required fields.");
    setSubmitting(true);
    try {
      const patient = await apiClient.createPatient({
        display_name: f.name, age: +f.age, heart_rate: +f.hr, respiratory_rate: +f.rr, spo2: +f.spo2, temperature: +f.temp,
        systolic_bp: +f.sbp, avpu: f.avpu, complaint: f.complaint, history_available: f.history, active_bleeding: f.bleeding,
        break_glass: f.breakGlass, gender: f.gender, hospitalId: hospitalId ?? undefined,
        abha_number_masked: history?.abhaNumberMasked,
        abha_history: history ? { verified: history.verified, source: history.source, conditions: history.conditions, allergies: history.allergies, medications: history.medications, recentEncounters: history.recentEncounters } : undefined,
      });
      toast.success("Patient scored and placed in queue."); setF({ ...BLANK }); setAbhaNumber(""); setHistory(null); setConsent(false); onCreated(patient);
    } catch (error) { toast.error((error as Error).message); }
    finally { setSubmitting(false); }
  };

  return <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)]">
    <Card className="min-w-0 border border-border shadow-none">
      <CardHeader className="pb-3"><span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"><Sparkles className="h-3 w-3" /> Live preview scoring</span><CardTitle className="mt-2 text-base">Register a new arrival</CardTitle><CardDescription className="text-xs">Capture the structured signals needed for triage. Prior history is optional and consent-gated.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        <section className="space-y-3"><SectionTitle>Patient</SectionTitle><div className="grid gap-3 sm:grid-cols-[1.25fr_.65fr_.7fr]"><Field label="Display name" required><Input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Priya N." /></Field><Field label="Age (years)" required><Input type="number" min={0} max={120} value={f.age} onChange={(e) => set({ age: e.target.value })} placeholder="29" /></Field><Field label="Sex"><Select value={f.gender} onValueChange={(v) => set({ gender: v as typeof f.gender })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="female">Female</SelectItem><SelectItem value="male">Male</SelectItem><SelectItem value="unknown">Unknown</SelectItem></SelectContent></Select></Field></div></section>
        <section className="space-y-3"><div className="flex items-center justify-between"><SectionTitle>Vital signs</SectionTitle>{band && <span className="rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">{band} reference ranges</span>}</div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Field label="Heart rate" unit="bpm" required hint={ranges ? `${ranges.hr[0]}–${ranges.hr[1]}` : undefined}><Input type="number" value={f.hr} onChange={(e) => set({ hr: e.target.value })} placeholder="80" /></Field><Field label="Resp rate" unit="/min" required hint={ranges ? `${ranges.rr[0]}–${ranges.rr[1]}` : undefined}><Input type="number" value={f.rr} onChange={(e) => set({ rr: e.target.value })} placeholder="16" /></Field><Field label="SpO₂" unit="%" required hint={ranges ? `${ranges.spo2[0]}–${ranges.spo2[1]}` : undefined}><Input type="number" value={f.spo2} onChange={(e) => set({ spo2: e.target.value })} placeholder="98" /></Field><Field label="Temperature" unit="°C" required hint={ranges ? `${ranges.temp[0]}–${ranges.temp[1]}` : undefined}><Input type="number" step="0.1" value={f.temp} onChange={(e) => set({ temp: e.target.value })} placeholder="37.0" /></Field><Field label="Systolic BP" unit="mmHg" required hint={ranges ? `${ranges.sbp[0]}–${ranges.sbp[1]}` : undefined}><Input type="number" value={f.sbp} onChange={(e) => set({ sbp: e.target.value })} placeholder="118" /></Field><Field label="AVPU" required><Select value={f.avpu} onValueChange={(v) => set({ avpu: v as typeof f.avpu })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="alert">Alert</SelectItem><SelectItem value="voice">Responds to voice</SelectItem><SelectItem value="pain">Responds to pain</SelectItem><SelectItem value="unresponsive">Unresponsive</SelectItem></SelectContent></Select></Field></div></section>
        <section className="space-y-2"><SectionTitle>Presentation</SectionTitle><Field label="Chief complaint" required><Textarea value={f.complaint} onChange={(e) => set({ complaint: e.target.value })} placeholder="Describe the patient complaint…" rows={3} /></Field></section>
        <section className="rounded-lg border border-border bg-muted/20 p-3.5"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><History className="h-4 w-4 text-primary" /><h2 className="text-sm font-medium">Prior history</h2>{history && <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Linked</span>}</div><p className="mt-1 text-[11px] leading-5 text-muted-foreground">Request only triage-relevant records after explicit patient consent.</p></div><ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" /></div><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><Field label="ABHA number"><Input inputMode="numeric" maxLength={14} value={abhaNumber} onChange={(e) => setAbhaNumber(e.target.value.replace(/\D/g, "").slice(0, 14))} placeholder="14-digit ABHA number" /></Field><div className="flex items-end"><Button type="button" variant="outline" onClick={fetchHistory} disabled={historyLoading || abhaNumber.length !== 14 || !consent} className="w-full gap-2 sm:w-auto">{historyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}{historyLoading ? "Fetching…" : "Fetch history"}</Button></div></div><label className="mt-2 flex cursor-pointer items-start gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-[11px] leading-5"><Checkbox checked={consent} onCheckedChange={(v) => setConsent(Boolean(v))} className="mt-0.5" /><span>I confirm the patient/attendant has consented to this history request.</span></label>{history && <HistoryPreview history={history} />}</section>
        <section className="space-y-2"><SectionTitle>Safety flags</SectionTitle><div className="grid gap-2 sm:grid-cols-3"><FlagCheck checked={f.history} onChange={(v) => set({ history: v })} label="Prior history available" /><FlagCheck checked={f.bleeding} onChange={(v) => set({ bleeding: v })} label="Active severe bleeding" /><FlagCheck checked={f.breakGlass} onChange={(v) => set({ breakGlass: v })} label="Break-glass access" /></div></section>
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] leading-5 text-muted-foreground">Pseudonymous identifier is auto-assigned. Only the masked ABHA number and compact history snapshot are retained with this intake.</p><Button onClick={submit} disabled={!preview || submitting} className="w-full gap-1.5 sm:w-auto"><UserPlus className="h-4 w-4" />{submitting ? "Scoring…" : "Score & add to queue"}</Button></div>
      </CardContent>
    </Card>
    <div className="space-y-4 xl:sticky xl:top-24 xl:self-start"><Card className={cn("border border-border", preview && preview.recommended_tier <= 2 && "border-l-4 border-l-triage-red", preview && preview.recommended_tier === 3 && "border-l-4 border-l-triage-amber", preview && preview.recommended_tier >= 4 && "border-l-4 border-l-triage-green")}><CardHeader className="pb-3"><CardDescription className="text-[10px] font-semibold uppercase tracking-wide">Live preview</CardDescription><div className="flex items-center justify-between gap-2"><CardTitle className="text-base">Recommendation</CardTitle>{preview ? <TierBadge tier={preview.recommended_tier} size="md" animated /> : <span className="text-xs text-muted-foreground">Awaiting input</span>}</div></CardHeader><CardContent>{preview ? <div className="space-y-4"><div><div className="mb-1 flex justify-between text-[11px] uppercase tracking-wide text-muted-foreground"><span>Confidence</span><span className="font-mono font-semibold">{preview.confidence}% · {preview.confidence_label}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-all" style={{ width: `${preview.confidence}%`, background: preview.confidence >= 80 ? "var(--triage-green)" : preview.confidence >= 62 ? "var(--triage-amber)" : "var(--triage-red)" }} /></div></div><div className="rounded-md border border-border bg-muted/30 p-3 text-xs"><div className="mb-1 font-semibold">Reasons</div><ul className="space-y-1 text-muted-foreground">{preview.reasons.map((r) => <li key={r}>• {r}</li>)}</ul></div><div className="flex flex-wrap gap-1">{preview.flags.map((fl) => <span key={fl} className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px]">{fl}</span>)}</div><div className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">{[["Rule", preview.rule_tier], ["ML", preview.ml_tier], ["Fused", preview.recommended_tier]].map(([label, tier]) => <div key={label as string}><div className="text-[10px] uppercase text-muted-foreground">{label}</div><div className="text-[11px] font-medium">{TIER_LABELS[tier as number].split("·")[1]?.trim()}</div></div>)}</div></div> : <div className="py-8 text-center text-xs text-muted-foreground">Fill required fields to see the live recommendation.</div>}</CardContent></Card><Card className="bg-muted/20"><CardHeader className="pb-2"><CardTitle className="text-sm">Safety boundary</CardTitle></CardHeader><CardContent><ol className="space-y-1 text-xs text-muted-foreground"><li><b className="text-foreground">1.</b> Age-normalize every vital.</li><li><b className="text-foreground">2.</b> Apply transparent red-flag rules.</li><li><b className="text-foreground">3.</b> Estimate risk tier from structured signals.</li><li><b className="text-foreground">4.</b> Escalate on uncertainty or disagreement.</li><li><b className="text-foreground">5.</b> Re-assess against the wait-time safety window.</li></ol></CardContent></Card></div>
  </div>;
}

function SectionTitle({ children }: { children: ReactNode }) { return <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">{children}</span>; }
function Field({ label, unit, required, hint, children }: { label: string; unit?: string; required?: boolean; hint?: string; children: ReactNode }) { return <div><Label className="text-xs">{label}{unit && <span className="ml-1 text-[10px] text-muted-foreground">{unit}</span>}{required && <span className="ml-0.5 text-destructive">*</span>}</Label><div className="mt-1">{children}</div>{hint && <div className="mt-1 text-[10px] text-muted-foreground">ref {hint}</div>}</div>; }
function FlagCheck({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) { return <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-xs hover:bg-muted/30"><Checkbox checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} /><span>{label}</span></label>; }
function HistoryPreview({ history }: { history: AbhaHistory }) { return <div className="mt-3 space-y-2"><div className="grid gap-2 sm:grid-cols-3"><HistoryList title="Conditions" items={history.conditions} /><HistoryList title="Allergies" items={history.allergies} /><HistoryList title="Medications" items={history.medications} /></div><div className="rounded-md border border-border bg-card p-2.5"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Recent encounters</span><span className="font-mono text-[10px] text-muted-foreground">{history.source} · {history.abhaNumberMasked}</span></div><div className="mt-2 space-y-1.5">{history.recentEncounters.map((e) => <div key={`${e.date}-${e.facility}`} className="rounded border border-border/70 bg-muted/20 px-2 py-1.5 text-[11px]"><div className="flex justify-between gap-2"><b>{e.facility}</b><span className="font-mono text-muted-foreground">{e.date}</span></div><div className="mt-0.5 text-muted-foreground">{e.summary}</div></div>)}</div></div></div>; }
function HistoryList({ title, items }: { title: string; items: string[] }) { return <div className="rounded-md border border-border bg-card p-2.5"><div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div><div className="mt-1.5 space-y-1 text-[11px]">{items.length ? items.map((x) => <div key={x} className="rounded bg-muted/30 px-2 py-1">{x}</div>) : <span className="text-muted-foreground">None returned</span>}</div></div>; }
