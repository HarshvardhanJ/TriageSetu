"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/triage/sidebar";
import { Header } from "@/components/triage/header";
import { LiveQueue } from "@/components/triage/live-queue";
import { IntakeForm } from "@/components/triage/intake-form";
import { PatientDetail } from "@/components/triage/patient-detail";
import { AuditTrail } from "@/components/triage/audit-trail";
import { Analytics } from "@/components/triage/analytics";
import { BedBoard } from "@/components/triage/bed-board";
import { StaffRoster } from "@/components/triage/staff-roster";
import { SettingsView } from "@/components/triage/settings-view";
import { MetricCard } from "@/components/triage/metric-card";
import { HeroLanding } from "@/components/triage/hero-landing";
import { apiClient, type Patient, type Hospital, type Bed, type StaffMember, type AuditEntry, type Metrics } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Activity, AlertTriangle, Clock, RefreshCw, Stethoscope, Zap, Menu } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { view, hospitalId, setHospitals, autoRefresh } = useAppStore();
  const [showLanding, setShowLanding] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [surge, setSurge] = useState(false);
  const [hospitals, setHospitalsState] = useState<Hospital[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [queueData, metricsData] = await Promise.all([
        apiClient.queue(hospitalId ?? undefined),
        apiClient.metrics(hospitalId ?? undefined),
      ]);
      setPatients(queueData.patients);
      setSurge(queueData.surge);
      setMetrics(metricsData);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, [hospitalId]);

  // Initial load + hospital list
  useEffect(() => {
    (async () => {
      try {
        const h = await apiClient.hospitals();
        setHospitalsState(h.hospitals);
        setHospitals(h.hospitals);
      } catch (e) {
        toast.error((e as Error).message);
      }
    })();
  }, [setHospitals]);

  useEffect(() => {
    if (hospitals.length > 0 && !hospitalId) {
      useAppStore.getState().setHospitalId(hospitals[0].id);
    }
  }, [hospitals, hospitalId]);

  useEffect(() => {
    if (hospitalId) queueMicrotask(loadAll);
  }, [hospitalId, loadAll]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(loadAll, 15000);
    return () => clearInterval(t);
  }, [autoRefresh, loadAll]);

  // Load view-specific data
  useEffect(() => {
    if (view === "audit") {
      apiClient.audit().then((a) => setAudit(a)).catch((e) => toast.error((e as Error).message));
    } else if (view === "beds") {
      apiClient.beds(hospitalId ?? undefined).then((b) => setBeds(b.beds)).catch((e) => toast.error((e as Error).message));
    } else if (view === "staff") {
      apiClient.staff(hospitalId ?? undefined).then((s) => setStaff(s.staff)).catch((e) => toast.error((e as Error).message));
    }
  }, [view, hospitalId]);

  const review = useCallback(async (p: Patient) => {
    try {
      const full = await apiClient.patient(p.id);
      setSelected(full);
      setModalOpen(true);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  const onSurge = useCallback(async () => {
    try {
      const r = await apiClient.surge(!surge, hospitalId ?? undefined);
      setSurge(r.surge);
      setPatients(r.patients);
      toast.success(r.surge ? "3× surge policy enabled. Queue rescored." : "Standard policy restored.");
      loadAll();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [surge, hospitalId, loadAll]);

  const onAdvance = useCallback(
    async (minutes: number) => {
      try {
        const r = await apiClient.advanceClock(minutes, hospitalId ?? undefined);
        setPatients(r.patients);
        toast.success(`Advanced ${minutes} min — queue reassessed for deterioration.`);
        loadAll();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
    [hospitalId, loadAll]
  );

  const onReset = useCallback(async () => {
    try {
      const r = await apiClient.resetDemo();
      setPatients(r.patients ?? []);
      toast.success("Demo reset — 20 baseline cases restored.");
      await loadAll();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [loadAll]);

  const onIntakeCreated = useCallback(
    async (p: Patient) => {
      await loadAll();
      setSelected(p);
      setModalOpen(true);
      useAppStore.getState().setView("queue");
    },
    [loadAll]
  );

  const counts = metrics?.counts;
  const VIEW_TITLES = {
    queue: { title: "Live priority queue", subtitle: "Safety-first recommendations, awaiting clinician confirmation." },
    intake: { title: "New patient intake", subtitle: "Structured capture mirrored to the scoring engine." },
    analytics: { title: "Department analytics", subtitle: "Throughput, distribution and deterioration signals." },
    beds: { title: "Bed & resource board", subtitle: "Zone-level capacity across the department." },
    staff: { title: "Staff roster", subtitle: "On-duty clinicians and live patient load." },
    audit: { title: "Clinical audit trail", subtitle: "Append-only ledger of every recommendation and override." },
    settings: { title: "Workspace settings", subtitle: "Jurisdiction, retention, consent and clinician identity." },
  } as const;

  if (showLanding) {
    return <HeroLanding onEnter={() => setShowLanding(false)} />;
  }

  return (
    <div className="min-h-screen bg-background">

      <Sidebar queueCount={patients.length} surge={surge} />

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Stethoscope className="h-4 w-4" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">
            TriageSetu
          </span>
        </div>
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="px-2">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <MobileNav hospitals={hospitals} surge={surge} queueCount={patients.length} onClose={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="lg:pl-[260px]">
        <Header
          hospitals={hospitals}
          surge={surge}
          onSurge={onSurge}
          onAdvance={onAdvance}
          onRefresh={loadAll}
          refreshing={refreshing}
        />

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-4">
              {/* Queue metrics */}
              {view === "queue" && counts && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard label="In queue" value={counts.total} hint={surge ? "3× surge protocol active" : "Normal arrival volume"} icon={Activity} tone={surge ? "surge" : "blue"} delay={0} />
                    <MetricCard label="Urgent now" value={counts.urgent} hint="ESI 1–2 recommendations" icon={AlertTriangle} tone="red" delay={0.05} />
                    <MetricCard label="Needs review" value={counts.review} hint="Escalated under uncertainty" icon={RefreshCw} tone="violet" delay={0.1} />
                    <MetricCard label="Reassessments" value={counts.overdue} hint={counts.overdue ? "Safety window exceeded" : "None overdue"} icon={Clock} tone={counts.overdue ? "red" : "green"} delay={0.15} />
                  </div>
                  <LiveQueue patients={patients} onReview={review} />
                </>
              )}

              {view === "queue" && !counts && (
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-primary border-r-[color-mix(in_oklch,var(--triage-violet)_85%,white)] border-b-[color-mix(in_oklch,var(--triage-cyan)_85%,white)]" />
                </div>
              )}

              {view === "intake" && <IntakeForm onCreated={onIntakeCreated} />}
              {view === "analytics" && metrics && <Analytics metrics={metrics} patients={patients} />}
              {view === "beds" && <BedBoard beds={beds} />}
              {view === "staff" && <StaffRoster staff={staff} />}
              {view === "audit" && <AuditTrail entries={audit} />}
              {view === "settings" && <SettingsView onReset={onReset} />}
          </div>
        </main>
      </div>

      <button
        onClick={() => setShowLanding(true)}
        className="fixed bottom-5 right-5 z-30 grid h-10 w-10 place-items-center rounded-md border border-primary bg-primary text-primary-foreground"
        title="Back to home"
      >
        <Stethoscope className="h-5 w-5" />
      </button>

      <PatientDetail
        patient={selected}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onUpdated={loadAll}
      />
    </div>
  );
}

function MobileNav({
  hospitals,
  surge,
  queueCount,
  onClose,
}: {
  hospitals: Hospital[];
  surge: boolean;
  queueCount: number;
  onClose: () => void;
}) {
  const { view, setView, hospitalId, setHospitalId } = useAppStore();
  const NAV = [
    { id: "queue", label: "Live queue", icon: Activity },
    { id: "intake", label: "New intake", icon: Stethoscope },
    { id: "analytics", label: "Analytics", icon: Zap },
    { id: "beds", label: "Bed board", icon: Activity },
    { id: "staff", label: "Staff roster", icon: Activity },
    { id: "audit", label: "Audit trail", icon: Clock },
    { id: "settings", label: "Settings", icon: Activity },
  ] as const;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
          <Stethoscope className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold">Triage<span className="text-primary">Setu</span></span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id);
                onClose();
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === "queue" && queueCount > 0 && (
                <span className={`rounded-full px-1.5 text-[10px] font-semibold ${active ? "bg-primary-foreground/20" : "bg-muted"}`}>
                  {queueCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Facility</div>
        <div className="space-y-1">
          {hospitals.map((h) => (
            <button
              key={h.id}
              onClick={() => setHospitalId(h.id)}
              className={`block w-full rounded-md px-2 py-1.5 text-left text-xs ${
                h.id === hospitalId ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {h.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
