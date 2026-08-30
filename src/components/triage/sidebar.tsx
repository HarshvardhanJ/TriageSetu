"use client";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Activity, UserPlus, ScrollText, BarChart3, BedDouble, Users, Settings, Stethoscope, ShieldCheck } from "lucide-react";
const NAV = [{ id: "queue", label: "Live queue", icon: Activity }, { id: "intake", label: "New intake", icon: UserPlus }, { id: "analytics", label: "Analytics", icon: BarChart3 }, { id: "beds", label: "Bed board", icon: BedDouble }, { id: "staff", label: "Staff roster", icon: Users }, { id: "audit", label: "Audit trail", icon: ScrollText }, { id: "settings", label: "Settings", icon: Settings }] as const;
export function Sidebar({ queueCount, surge }: { queueCount: number; surge: boolean }) {
  const { view, setView } = useAppStore();
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
    <div className="border-b border-sidebar-border p-5"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground"><Stethoscope className="h-5 w-5" /></div><div><div className="font-semibold">TriageSetu</div><div className="text-xs text-muted-foreground">Emergency department</div></div></div></div>
    <nav className="flex-1 space-y-1 p-3"><p className="px-2 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Workspace</p>{NAV.map((item) => { const Icon = item.icon; const active = view === item.id; return <button key={item.id} onClick={() => setView(item.id)} className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors", active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Icon className="h-4 w-4" /><span className="flex-1 text-left">{item.label}</span>{item.id === "queue" && queueCount > 0 && <span className="font-mono text-xs tabular-nums">{queueCount}</span>}</button>; })}</nav>
    <div className="m-3 rounded-md border border-border p-3"><div className="flex items-center gap-2 text-xs font-medium"><span className={cn("h-2 w-2 rounded-full", surge ? "bg-triage-red" : "bg-triage-green")} />{surge ? "3× surge policy active" : "Standard policy active"}</div><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{surge ? "Borderline cases automatically escalate." : "Normal arrival volume."}</p></div>
    <div className="flex items-center gap-2 border-t border-sidebar-border px-4 py-3 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Pseudonymous workspace</div>
  </aside>;
}
