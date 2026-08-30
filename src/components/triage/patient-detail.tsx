"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Activity, Brain, CheckCircle2, Droplet, FileText, HeartPulse, History, Send, ShieldCheck, Thermometer, Wind } from "lucide-react";
import type { Note, Patient } from "@/lib/api";
import { apiClient } from "@/lib/api";
import { TierBadge } from "./tier-badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { TIER_LABELS } from "@/lib/triage";

export function PatientDetail({ patient, open, onClose, onUpdated }: { patient: Patient | null; open: boolean; onClose: () => void; onUpdated: () => void }) {
  const { clinicianId, clinicianRole } = useAppStore();
  const [tier, setTier] = useState(5);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (patient) {
      setTier(patient.clinicianTier ?? patient.score.recommended_tier);
      setReason("");
      setNotes(patient.notes ?? []);
      setNoteText("");
    }
  }, [patient]);

  if (!patient) return null;
  const { data, score } = patient;
  const displayTier = patient.clinicianTier ?? score.recommended_tier;
  const history = data.abha_history;

  const save = async () => {
    if (reason.trim().length < 3) return toast.error("Add a short clinical rationale before recording.");
    setSaving(true);
    try {
      await apiClient.override(patient.id, { tier, reason, clinician_id: clinicianId, clinician_role: clinicianRole });
      toast.success(tier === score.recommended_tier ? "Recommendation confirmed and logged." : "Clinical override recorded and logged.");
      onUpdated();
      onClose();
    } catch (error) { toast.error((error as Error).message); } finally { setSaving(false); }
  };

  const updateStatus = async (status: "treated" | "transferred") => {
    try {
      await apiClient.setStatus(patient.id, status, clinicianId, clinicianRole);
      toast.success(status === "treated" ? "Patient discharged from queue." : "Patient marked for transfer.");
      onUpdated();
      onClose();
    } catch (error) { toast.error((error as Error).message); }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    try {
      const note = await apiClient.addNote(patient.id, { author: clinicianId, role: clinicianRole, text: noteText.trim() });
      setNotes((current) => [note, ...current]);
      setNoteText("");
      toast.success("Clinical note added.");
    } catch (error) { toast.error((error as Error).message); }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="fixed left-1/2 top-1/2 z-50 flex h-[92vh] w-[calc(100vw-2rem)] !max-w-[1100px] -translate-x-1/2 -translate-y-1/2 flex-col gap-0 overflow-hidden rounded-xl border bg-card p-0">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
          <div className="grid gap-3 pr-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><DialogTitle className="text-lg">{patient.displayName}</DialogTitle><TierBadge tier={displayTier} size="sm" /></div><DialogDescription className="mt-1 font-mono text-xs tabular-nums">{patient.id} · {data.age}y · {score.age_band} · waiting {patient.waitMinutes} min</DialogDescription></div>
            <div className="w-fit rounded-md bg-muted/50 px-3 py-2 sm:min-w-[150px] sm:text-right"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Confidence</div><div className="font-mono text-sm font-semibold">{score.confidence}% <span className="text-xs font-normal text-muted-foreground">{score.confidence_label}</span></div></div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <section aria-label="Vital signs" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"><Vital icon={HeartPulse} label="HR" value={data.heart_rate} unit="bpm" /><Vital icon={Wind} label="RR" value={data.respiratory_rate} unit="/min" /><Vital icon={Droplet} label="SpO₂" value={data.spo2} unit="%" /><Vital icon={Thermometer} label="Temp" value={data.temperature} unit="°C" /><Vital icon={Activity} label="BP" value={data.systolic_bp} unit="mmHg" /><Vital icon={Brain} label="AVPU" value={data.avpu} unit="" /></section>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
            <section className="min-w-0 space-y-4">
              <Panel title="Clinical summary"><p className="break-words text-sm leading-6">{score.explanation}</p>{score.flags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{score.flags.map((flag) => <span key={flag} className="rounded-md border border-border bg-muted px-2 py-1 text-xs">{flag}</span>)}</div>}</Panel>
              <Panel title="Chief complaint"><p className="break-words text-sm leading-6">{data.complaint}</p><div className="mt-2 text-xs text-muted-foreground">{data.history_available ? "Prior history available" : "No prior history linked"}{data.active_bleeding ? " · Active bleeding" : ""}</div></Panel>
              {history && <Panel title="Prior history" icon={<History className="h-3.5 w-3.5" />}><div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />{data.abha_number_masked} · {history.source}{history.verified && " · verified"}</div><div className="grid gap-2 sm:grid-cols-3"><HistoryList title="Conditions" items={history.conditions} /><HistoryList title="Allergies" items={history.allergies} /><HistoryList title="Medications" items={history.medications} /></div>{history.recentEncounters.length > 0 && <div className="mt-3 space-y-2"><div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Recent encounters</div>{history.recentEncounters.map((e) => <div key={`${e.date}-${e.facility}`} className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs"><div className="flex flex-wrap justify-between gap-2"><b className="min-w-0 break-words">{e.facility}</b><span className="shrink-0 font-mono text-muted-foreground">{e.date}</span></div><p className="mt-1 break-words text-muted-foreground">{e.summary}</p></div>)}</div>}</Panel>}
            </section>

            <section className="min-w-0 rounded-lg border border-border bg-muted/20 p-4"><h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><FileText className="h-3.5 w-3.5" />Recommendation trace</h2><div className="mt-4 space-y-2.5"><Trace label="Rule safety net" tier={score.rule_tier} /><Trace label="ML risk model" tier={score.ml_tier} /><Separator className="my-2" /><Trace label="System recommendation" tier={score.recommended_tier} strong />{patient.clinicianTier !== null && <Trace label="Current clinician tier" tier={patient.clinicianTier} strong />}</div><Separator className="my-4" /><h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Primary inputs</h3><div className="mt-2 space-y-2">{score.feature_contributions.slice(0, 4).map((item) => <div key={item.feature} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs"><span className="min-w-0 break-words text-muted-foreground">{item.feature}</span><span className="shrink-0 font-mono tabular-nums">{item.impact}</span></div>)}</div></section>
          </div>

          <section className="mt-5 border-t border-border pb-2 pt-4"><div className="flex items-center justify-between gap-3"><h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clinical notes</h2><span className="text-xs text-muted-foreground">{notes.length} recorded</span></div>{notes.length > 0 && <div className="mt-3 max-h-32 space-y-2 overflow-y-auto">{notes.map((note) => <div key={note.id} className="border-l-2 border-primary pl-3 text-sm"><p className="break-words">{note.text}</p><p className="mt-1 text-xs text-muted-foreground">{note.author} · {new Date(note.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}</p></div>)}</div>}<div className="mt-3 flex gap-2"><Textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Add a clinical note" rows={1} className="min-h-9 resize-none text-sm" /><Button size="sm" className="h-9 shrink-0" onClick={addNote} disabled={!noteText.trim()} aria-label="Add clinical note"><Send className="h-3.5 w-3.5" /></Button></div></section>
        </div>

        <footer className="shrink-0 border-t border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
          <div className="grid items-end gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]">
            <div className="min-w-0"><label htmlFor="clinical-tier" className="block text-xs font-medium leading-4 text-muted-foreground">Clinical tier</label><Select value={String(tier)} onValueChange={(value) => setTier(Number(value))}><SelectTrigger id="clinical-tier" className="mt-1 h-9 w-full text-sm"><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5].map((value) => <SelectItem key={value} value={String(value)}>{TIER_LABELS[value]}</SelectItem>)}</SelectContent></Select></div>
            <div className="min-w-0"><label htmlFor="clinical-rationale" className="block text-xs font-medium leading-4 text-muted-foreground">Rationale</label><Textarea id="clinical-rationale" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for confirmation or override" rows={1} className="mt-1 h-9 min-h-9 w-full resize-none overflow-hidden py-2 text-sm leading-5" /></div>
            <div className="flex shrink-0 items-center gap-2"><Button variant="outline" size="sm" className="h-9 whitespace-nowrap" onClick={() => updateStatus("transferred")}>Transfer</Button><Button size="sm" className="h-9 whitespace-nowrap gap-2" disabled={saving || reason.trim().length < 3} onClick={save}><CheckCircle2 className="h-3.5 w-3.5" />{saving ? "Saving" : "Record"}</Button></div>
          </div>
          <button type="button" onClick={() => updateStatus("treated")} className="mt-2 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">Mark treated and remove from queue</button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function Panel({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) { return <section className="rounded-lg border border-border bg-card p-4"><h2 className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{icon}{title}</h2>{children}</section>; }
function HistoryList({ title, items }: { title: string; items: string[] }) { return <div className="min-w-0 rounded-md border border-border bg-muted/20 p-2.5"><div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div><div className="mt-1.5 space-y-1 text-[11px]">{items.length ? items.map((item) => <div key={item} className="break-words rounded bg-card px-2 py-1">{item}</div>) : <span className="text-muted-foreground">None returned</span>}</div></div>; }
function Vital({ icon: Icon, label, value, unit }: { icon: typeof HeartPulse; label: string; value: string | number; unit: string }) { return <div className="min-w-0 rounded-md border border-border bg-card p-2.5"><div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground"><Icon className="h-3 w-3 shrink-0" />{label}</div><div className="mt-1 truncate font-mono text-sm font-semibold tabular-nums">{value}<span className="ml-0.5 text-[10px] font-normal text-muted-foreground">{unit}</span></div></div>; }
function Trace({ label, tier, strong = false }: { label: string; tier: number; strong?: boolean }) { return <div className={strong ? "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md bg-card px-2.5 py-2" : "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1"}><span className={strong ? "min-w-0 break-words text-xs font-medium" : "min-w-0 break-words text-xs text-muted-foreground"}>{label}</span><span className="shrink-0"><TierBadge tier={tier} size="sm" /></span></div>; }
