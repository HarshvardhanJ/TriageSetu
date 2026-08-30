"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ShieldCheck,
  Database,
  ScrollText,
  Clock,
  Trash2,
  UserCog,
  Globe,
  Lock,
} from "lucide-react";

const JURISDICTIONS = [
  { value: "dpdp", label: "India — DPDP Act 2023" },
  { value: "hipaa", label: "United States — HIPAA" },
  { value: "gdpr", label: "EU — GDPR + national health law" },
  { value: "pdpa", label: "Singapore — PDPA" },
];

const RETENTION_DAYS = [30, 90, 180, 365];

export function SettingsView({ onReset }: { onReset: () => void }) {
  const { clinicianId, clinicianRole, setClinician, autoRefresh, toggleAutoRefresh } = useAppStore();
  const [jurisdiction, setJurisdiction] = useState("dpdp");
  const [retention, setRetention] = useState(180);
  const [consentRequired, setConsentRequired] = useState(true);
  const [anonExport, setAnonExport] = useState(true);
  const [idInput, setIdInput] = useState(clinicianId);
  const [roleInput, setRoleInput] = useState(clinicianRole);

  const saveClinician = () => {
    setClinician(idInput, roleInput);
    toast.success("Clinician identity saved.");
  };

  const saveCompliance = async () => {
    try {
      await Promise.all([
        apiClient.setSetting("jurisdiction", jurisdiction),
        apiClient.setSetting("retention_days", String(retention)),
        apiClient.setSetting("consent_required", String(consentRequired)),
        apiClient.setSetting("anon_export", String(anonExport)),
      ]);
      toast.success("Compliance settings saved.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Clinician identity */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Clinician identity</CardTitle>
            </div>
            <CardDescription className="text-xs">
              This identity is stamped on every override and audit record.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Clinician ID</Label>
              <Input className="mt-1" value={idInput} onChange={(e) => setIdInput(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Select value={roleInput} onValueChange={setRoleInput}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Triage nurse">Triage nurse</SelectItem>
                  <SelectItem value="Charge nurse">Charge nurse</SelectItem>
                  <SelectItem value="ED physician">ED physician</SelectItem>
                  <SelectItem value="Resident">Resident</SelectItem>
                  <SelectItem value="Consultant">Consultant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={saveClinician} className="w-full">Save identity</Button>
          </CardContent>
        </Card>

        {/* Compliance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[color-mix(in_oklch,var(--triage-green)_85%,white)]" />
              <CardTitle className="text-base">Jurisdiction & data protection</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Affects audit trail design, retention policy, consent model, and break-glass rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs flex items-center gap-1.5"><Globe className="h-3 w-3" /> Regulatory jurisdiction</Label>
              <Select value={jurisdiction} onValueChange={setJurisdiction}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JURISDICTIONS.map((j) => (
                    <SelectItem key={j.value} value={j.value}>
                      {j.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1.5"><Clock className="h-3 w-3" /> Audit retention (days)</Label>
              <Select value={String(retention)} onValueChange={(v) => setRetention(Number(v))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RETENTION_DAYS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium flex items-center gap-1.5"><Lock className="h-3 w-3" /> Consent required at intake</div>
                <div className="text-[11px] text-muted-foreground">Patient acknowledges triage data use.</div>
              </div>
              <Switch checked={consentRequired} onCheckedChange={setConsentRequired} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium">Anonymized exports by default</div>
                <div className="text-[11px] text-muted-foreground">Strip direct identifiers in bulk export.</div>
              </div>
              <Switch checked={anonExport} onCheckedChange={setAnonExport} />
            </div>
            <Button onClick={saveCompliance} className="w-full">Save compliance settings</Button>
          </CardContent>
        </Card>

        {/* Workspace */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[color-mix(in_oklch,var(--chart-4)_85%,white)]" />
              <CardTitle className="text-base">Workspace</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Local prototype state and refresh behaviour.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium">Auto-refresh queue</div>
                <div className="text-[11px] text-muted-foreground">Poll every 15 seconds for live updates.</div>
              </div>
              <Switch checked={autoRefresh} onCheckedChange={toggleAutoRefresh} />
            </div>
            <Separator />
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
              <div className="mb-1 flex items-center gap-1.5 font-semibold">
                <ScrollText className="h-3.5 w-3.5" /> Storage
              </div>
              <p className="text-muted-foreground">
                SQLite-backed prototype. All data lives locally in the sandbox; nothing is sent to external services.
                The hybrid scorer (rule + ML proxy) runs entirely in-process — no external model calls.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-[color-mix(in_oklch,var(--triage-red)_30%,transparent)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-[color-mix(in_oklch,var(--triage-red)_85%,white)]" />
              <CardTitle className="text-base">Reset demo data</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Restore the queue to the 20 baseline demo cases. Audit log is also cleared.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="gap-2 border-[color-mix(in_oklch,var(--triage-red)_40%,transparent)] text-[color-mix(in_oklch,var(--triage-red)_85%,white)] hover:bg-[color-mix(in_oklch,var(--triage-red)_10%,transparent)]"
              onClick={onReset}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Reset to demo baseline
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
