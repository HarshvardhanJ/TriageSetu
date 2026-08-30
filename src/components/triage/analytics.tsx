"use client";

import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Clock,
  Gauge,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Metrics, Patient } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "./metric-card";

const TIER_COLORS = [
  "url(#gradRed)",
  "url(#gradAmber)",
  "url(#gradTeal)",
  "url(#gradBlue)",
  "url(#gradViolet)",
];

export function Analytics({
  metrics,
  patients,
}: {
  metrics: Metrics;
  patients: Patient[];
}) {
  // Simulated hourly arrival/discharge trend
  const trend = Array.from({ length: 8 }, (_, i) => {
    const h = (new Date().getHours() - 7 + i + 24) % 24;
    return {
      hour: `${String(h).padStart(2, "0")}:00`,
      arrivals: Math.max(1, Math.round(4 + Math.sin(i * 0.9) * 3 + i * 0.4)),
      discharges: Math.max(0, Math.round(2 + Math.sin(i * 0.7 + 1) * 2 + i * 0.3)),
    };
  });

  const waitByTier = [1, 2, 3, 4, 5].map((t) => {
    const ps = patients.filter((p) => (p.score.display_tier ?? p.score.recommended_tier) === t);
    const avg = ps.length ? Math.round(ps.reduce((s, p) => s + p.waitMinutes, 0) / ps.length) : 0;
    return { tier: `ESI ${t}`, avg, count: ps.length };
  });

  const confBuckets = [
    { range: "0–50%", count: 0 },
    { range: "50–62%", count: 0 },
    { range: "62–80%", count: 0 },
    { range: "80%+", count: 0 },
  ];
  for (const p of patients) {
    const c = p.score.confidence;
    if (c < 50) confBuckets[0].count++;
    else if (c < 62) confBuckets[1].count++;
    else if (c < 80) confBuckets[2].count++;
    else confBuckets[3].count++;
  }

  const ageRadar = metrics.ageBandDist.map((b) => ({
    band: b.band.charAt(0).toUpperCase() + b.band.slice(1),
    patients: b.count,
    capacity: b.band === "pediatric" ? 6 : b.band === "geriatric" ? 10 : 18,
  }));

  const reviewCount = patients.filter((p) => p.score.flags.includes("Needs clinician review")).length;
  const surgeCount = patients.filter((p) => p.score.flags.includes("3× surge safety policy applied")).length;
  const overdueCount = patients.filter((p) => p.score.flags.includes("Reassessment overdue")).length;

  const tooltipStyle = {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    fontSize: "12px",
    color: "var(--popover-foreground)",
    backdropFilter: "blur(12px)",
  };

  return (
    <div className="space-y-4">
      {/* SVG gradient defs */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="gradTeal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="gradViolet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="gradPrimary" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="gradGreen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>

      {/* Top metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Avg wait time" value={`${metrics.counts.avgWait}m`} hint="Across waiting queue" icon={Clock} tone={metrics.counts.avgWait > 45 ? "amber" : "default"} delay={0} />
        <MetricCard label="Avg confidence" value={`${metrics.counts.avgConfidence}%`} hint="Hybrid model" icon={Gauge} tone={metrics.counts.avgConfidence < 70 ? "amber" : "green"} delay={0.05} />
        <MetricCard label="Arrivals · last hour" value={metrics.counts.arrivedLastHour} hint="Simulated" icon={TrendingUp} tone="blue" delay={0.1} />
        <MetricCard label="Discharges · last hour" value={metrics.counts.dischargedLastHour} hint="Simulated" icon={Activity} tone="violet" delay={0.15} />
      </div>

      {/* Charts grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tier distribution */}
        <Card className="glass shadow-glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tier distribution</CardTitle>
            <CardDescription className="text-xs">Live queue by recommended ESI level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.tierDistribution} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="tier" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `ESI ${v}`} stroke="var(--border)" />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", fillOpacity: 0.3 }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {metrics.tierDistribution.map((_, i) => (
                      <Cell key={i} fill={TIER_COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Hourly trend */}
        <Card className="glass shadow-glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Arrivals vs discharges</CardTitle>
            <CardDescription className="text-xs">Last 8 hours (simulated)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="arrivals" stroke="url(#gradPrimary)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="discharges" stroke="url(#gradGreen)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Wait by tier */}
        <Card className="glass shadow-glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg wait by tier</CardTitle>
            <CardDescription className="text-xs">Minutes per ESI level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waitByTier} layout="vertical" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
                  <YAxis type="category" dataKey="tier" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="var(--border)" width={48} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", fillOpacity: 0.3 }} />
                  <Bar dataKey="avg" radius={[0, 6, 6, 0]} fill="url(#gradAmber)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Age band radar */}
        <Card className="glass shadow-glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Age-band load</CardTitle>
            <CardDescription className="text-xs">Patients vs nominal capacity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={ageRadar} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="band" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <PolarRadiusAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
                  <Radar name="Patients" dataKey="patients" stroke="url(#gradPrimary)" fill="url(#gradPrimary)" fillOpacity={0.35} strokeWidth={2} />
                  <Radar name="Capacity" dataKey="capacity" stroke="url(#gradGreen)" fill="url(#gradGreen)" fillOpacity={0.15} strokeWidth={1.5} strokeDasharray="3 3" />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Safety flags row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Needs clinician review" value={reviewCount} hint="Escalated under uncertainty" icon={AlertTriangle} tone="violet" />
        <MetricCard label="Surge-escalated" value={surgeCount} hint="3× policy applied" icon={Zap} tone="surge" />
        <MetricCard label="Reassessment overdue" value={overdueCount} hint="Safety window exceeded" icon={Clock} tone="red" />
      </div>

      {/* Confidence distribution */}
      <Card className="glass shadow-glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Confidence distribution</CardTitle>
          <CardDescription className="text-xs">How often the model is high / moderate / low</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            {confBuckets.map((b, i) => {
              const pct = patients.length ? Math.round((b.count / patients.length) * 100) : 0;
              const colors = ["var(--triage-red)", "var(--triage-amber)", "var(--triage-amber)", "var(--triage-green)"];
              const gradients = [
                "linear-gradient(90deg, var(--triage-red), var(--surge))",
                "linear-gradient(90deg, var(--triage-amber), var(--surge))",
                "linear-gradient(90deg, var(--triage-amber), var(--surge))",
                "linear-gradient(90deg, var(--triage-green), var(--triage-cyan))",
              ];
              return (
                <div key={b.range} className="rounded-xl border border-border glass p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{b.range}</span>
                    <span className="font-bold tabular-nums" style={{ color: colors[i] }}>{b.count}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05 }}
                      className="h-full rounded-full"
                      style={{ background: gradients[i] }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{pct}% of queue</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

