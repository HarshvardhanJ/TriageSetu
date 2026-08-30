"use client";

import { Activity, ArrowRight, ShieldCheck, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroLanding({ onEnter }: { onEnter: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 py-12">
      <section className="w-full max-w-xl rounded-lg border border-border bg-card p-8 sm:p-12">
        <div className="mb-12 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground"><Stethoscope className="h-5 w-5" /></div><div><div className="text-base font-semibold">TriageSetu</div><div className="text-xs text-muted-foreground">Emergency department operations</div></div></div>
        <div className="border-l-4 border-primary pl-5"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Clinical decision support</p><h1 className="mt-3 text-2xl leading-tight sm:text-3xl">A clear priority queue for emergency care.</h1><p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">Review triage recommendations, clinical reasoning, capacity, and overrides in one calm workspace.</p></div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"><Button onClick={onEnter} className="h-10 gap-2 px-4">Open live queue <ArrowRight className="h-4 w-4" /></Button><span className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Clinician review remains required</span></div>
        <div className="mt-10 flex items-center gap-2 border-t border-border pt-5 text-xs text-muted-foreground"><Activity className="h-3.5 w-3.5 text-triage-green" /> System available · Recommendations update as patient data changes</div>
      </section>
    </main>
  );
}
