"use client";

import type { Intake, Score } from "./triage";

export interface Patient {
  id: string;
  hospitalId: string;
  displayName: string;
  data: Intake;
  score: Score;
  arrivedAt: string;
  waitMinutes: number;
  clinicianTier: number | null;
  clinicianId: string | null;
  clinicianRole: string | null;
  status: string;
  gender: string;
  revealed: boolean;
  notes?: Note[];
}

export interface Note {
  id: number;
  patientId: string;
  author: string;
  role: string;
  text: string;
  createdAt: string;
}

export interface Hospital {
  id: string;
  code: string;
  name: string;
  type: string;
  bedsTotal: number;
}

export interface Bed {
  id: string;
  hospitalId: string;
  code: string;
  zone: string;
  status: string;
  patientId: string | null;
}

export interface StaffMember {
  id: string;
  hospitalId: string;
  name: string;
  role: string;
  shift: string;
  onDuty: boolean;
  load: number;
}

export interface AuditEntry {
  id: number;
  createdAt: string;
  eventType: string;
  patientId: string | null;
  clinicianId: string | null;
  clinicianRole: string | null;
  detail: Record<string, any>;
}

export interface Metrics {
  counts: {
    total: number;
    urgent: number;
    review: number;
    overdue: number;
    avgWait: number;
    avgConfidence: number;
    arrivedLastHour: number;
    dischargedLastHour: number;
    esiiAvg: number;
    surge: boolean;
  };
  tierDistribution: { tier: number; count: number }[];
  ageBandDist: { band: string; count: number }[];
}

async function api(path: string, opts?: RequestInit) {
  const r = await fetch(`/api/${path}`, opts);
  if (!r.ok) {
    const e = await r.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(e.detail || `Request failed (${r.status})`);
  }
  return r.json();
}

export const apiClient = {
  health: () => api("health"),
  queue: (hospitalId?: string) =>
    api(`queue${hospitalId ? `?hospitalId=${hospitalId}` : ""}`),
  patient: (id: string) => api(`patients/${id}`),
  createPatient: (body: Partial<Intake> & { hospitalId?: string }) =>
    api("patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  override: (id: string, body: { tier: number; reason: string; clinician_id: string; clinician_role: string }) =>
    api(`patients/${id}/override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  setStatus: (id: string, status: string, clinicianId?: string, clinicianRole?: string) =>
    api(`patients/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, clinicianId, clinicianRole }),
    }),
  surge: (enabled: boolean, hospitalId?: string) =>
    api(`surge?enabled=${enabled}${hospitalId ? `&hospitalId=${hospitalId}` : ""}`, { method: "POST" }),
  advanceClock: (minutes: number, hospitalId?: string) =>
    api(`clock/advance?minutes=${minutes}${hospitalId ? `&hospitalId=${hospitalId}` : ""}`, { method: "POST" }),
  audit: () => api("audit"),
  metrics: (hospitalId?: string) =>
    api(`metrics${hospitalId ? `?hospitalId=${hospitalId}` : ""}`),
  hospitals: () => api("hospitals"),
  beds: (hospitalId?: string) =>
    api(`beds${hospitalId ? `?hospitalId=${hospitalId}` : ""}`),
  staff: (hospitalId?: string) =>
    api(`staff${hospitalId ? `?hospitalId=${hospitalId}` : ""}`),
  notes: (patientId: string) => api(`notes/${patientId}`),
  addNote: (patientId: string, body: { author: string; role: string; text: string }) =>
    api(`notes/${patientId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  exportData: (hospitalId?: string) =>
    api(`export${hospitalId ? `?hospitalId=${hospitalId}` : ""}`),
  resetDemo: () => api("demo/reset", { method: "POST" }),
  settings: () => api("settings"),
  setSetting: (key: string, value: string) =>
    api("settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    }),
};
