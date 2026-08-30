"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Hospital {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface AppState {
  hospitalId: string | null;
  setHospitalId: (id: string) => void;
  hospitals: Hospital[];
  setHospitals: (h: Hospital[]) => void;
  view: "queue" | "intake" | "audit" | "analytics" | "beds" | "staff" | "settings";
  setView: (v: AppState["view"]) => void;
  autoRefresh: boolean;
  toggleAutoRefresh: () => void;
  clinicianId: string;
  clinicianRole: string;
  setClinician: (id: string, role: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hospitalId: null,
      setHospitalId: (id) => set({ hospitalId: id }),
      hospitals: [],
      setHospitals: (h) => set({ hospitals: h }),
      view: "queue",
      setView: (v) => set({ view: v }),
      autoRefresh: true,
      toggleAutoRefresh: () => set((s) => ({ autoRefresh: !s.autoRefresh })),
      clinicianId: "NURSE-DEMO-01",
      clinicianRole: "Triage nurse",
      setClinician: (id, role) => set({ clinicianId: id, clinicianRole: role }),
    }),
    {
      name: "triagesetu-app",
      partialize: (s) => ({
        hospitalId: s.hospitalId,
        clinicianId: s.clinicianId,
        clinicianRole: s.clinicianRole,
        autoRefresh: s.autoRefresh,
      }),
    }
  )
);
