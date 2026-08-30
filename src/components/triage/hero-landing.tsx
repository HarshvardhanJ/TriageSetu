"use client";

import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { useSyncExternalStore, useEffect, useState } from "react";
import {
  Stethoscope,
  Activity,
  ArrowRight,
  HeartPulse,
  ChevronDown,
  AlertTriangle,
  Clock,
  Users,
  Building2,
} from "lucide-react";

// India health statistics — sourced from NFHS-5, MoHFW, WHO India reports
const STATS = [
  { value: "1.4B", label: "Population served", sub: "World's most populous nation", icon: Users },
  { value: "1:834", label: "Doctor-to-patient ratio", sub: "WHO recommends 1:1000", icon: HeartPulse },
  { value: "70%", label: "Rural healthcare gap", sub: "Lack specialists in rural India", icon: Building2 },
  { value: "2.4M", label: "Annual TB cases", sub: "World's highest TB burden", icon: Activity },
];

const HEADLINES = [
  {
    tag: "EMERGENCY",
    title: "India's Emergency Departments Face Unprecedented Strain",
    excerpt: "With patient loads exceeding five hundred daily visits at major urban centres, triage decisions must be made in seconds — often with incomplete information. The pressure on clinicians has never been greater.",
    tier: "ESI 1 · RESUSCITATION",
  },
  {
    tag: "PEDIATRIC CRISIS",
    title: "One in Four Child Deaths Preventable with Faster Triage",
    excerpt: "Under-triage remains the leading cause of preventable mortality in paediatric emergency care across rural districts. A few minutes of delay can mean the difference between life and death.",
    tier: "ESI 2 · EMERGENT",
  },
  {
    tag: "CARDIAC ALERT",
    title: "Golden Hour Slips Away for Six in Ten STEMI Patients",
    excerpt: "Door-to-balloon times exceed ninety minutes in tier-two cities. AI-assisted triage could reclaim critical minutes that separate recovery from irreversible cardiac damage.",
    tier: "ESI 2 · EMERGENT",
  },
];

const TICKER_ITEMS = [
  "India faces 2.4 million new TB cases annually",
  "Only one in five rural PHCs have a full-time doctor",
  "Cardiovascular disease is now India's number one killer",
  "Maternal mortality at 97 per 100,000 live births",
  "Out-of-pocket health spend: 47% of total",
  "1.7 million cancer cases diagnosed in 2024",
  "Diabetes capital of the world: 101 million diabetics",
  "Mental health treatment gap exceeds 95 percent",
];

export function HeroLanding({ onEnter }: { onEnter: () => void }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [activeHeadline, setActiveHeadline] = useState(0);
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveHeadline((i) => (i + 1) % HEADLINES.length), 6000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTickerIndex((i) => (i + 1) % TICKER_ITEMS.length), 3500);
    return () => clearInterval(t);
  }, []);

  // Mouse parallax for 3D paper effect
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [3, -3]), { stiffness: 150, damping: 25 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-3, 3]), { stiffness: 150, damping: 25 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#1a1410]">
      {/* Subtle dark gradient backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-br from-[#1a1410] via-[#2a1f15] to-[#1a1410]" />

      {/* Top nav */}
      <div className="relative z-20 flex items-center justify-between px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="relative grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-[oklch(0.72_0.2_280)] via-[oklch(0.65_0.2_295)] to-[oklch(0.7_0.18_250)] text-white shadow-lg">
            <Stethoscope className="h-5 w-5" />
            <motion.span
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.15, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="absolute -inset-1.5 rounded-lg bg-gradient-to-br from-[oklch(0.72_0.2_280)] to-[oklch(0.7_0.18_250)] opacity-50 blur-md"
            />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold tracking-tight text-white">
              Triage<span className="text-gradient">Setu</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-white/50">
              The Clinical Times
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-md px-3 py-1 text-[11px] font-medium text-white/70 sm:inline-flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color-mix(in_oklch,var(--triage-green)_70%,transparent)] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color-mix(in_oklch,var(--triage-green)_90%,white)] live-pulse" />
            </span>
            Live edition
          </span>
          <motion.button
            onClick={onEnter}
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="group relative overflow-hidden bg-gradient-to-r from-[oklch(0.72_0.2_280)] via-[oklch(0.65_0.2_295)] to-[oklch(0.7_0.18_250)] px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_4px_16px_-4px_rgba(114,80,200,0.6)]"
          >
            <motion.span
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />
            <span className="relative z-10 flex items-center gap-1.5">
              Open dashboard
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </motion.button>
        </div>
      </div>

      {/* 3D Newspaper container */}
      <div
        className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-2 sm:px-10"
        onMouseMove={handleMouseMove}
        style={{ perspective: 2500 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30, rotateX: -8 }}
          animate={mounted ? { opacity: 1, y: 0, rotateX: 0 } : {}}
          transition={{ duration: 0.8, type: "spring", stiffness: 80, damping: 18 }}
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
          }}
          className="relative"
        >
          {/* Paper shadow */}
          <div className="absolute inset-0 translate-z-[-50px] translate-y-4 rounded-sm bg-black/50 blur-2xl" />

          {/* Main newspaper — authentic broadsheet */}
          <div className="paper relative overflow-hidden rounded-sm shadow-depth">
            {/* === MASTHEAD === */}
            <div className="relative z-10 px-8 pt-6 pb-4">
              {/* Top metadata row */}
              <div className="flex items-center justify-between gap-4 pb-2 text-[10px] uppercase tracking-[0.15em] ink-muted font-serif-old">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">No. MMXXVI · Vol. 1</span>
                </div>
                <div className="hidden sm:block italic">"Safety First, Always"</div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  <span className="font-bold">{today}</span>
                </div>
              </div>

              {/* Thick-thin rule */}
              <div className="rule-thick-thin" />

              {/* Big masthead title — Blackletter style */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={mounted ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-4 py-4"
              >
                {/* Left ornament */}
                <span className="fleuron hidden text-2xl sm:inline-block">❦</span>

                <div className="text-center">
                  <h1 className="font-blackletter text-5xl ink sm:text-7xl">
                    The Clinical Times
                  </h1>
                  <div className="mt-1 font-serif-old text-[10px] uppercase tracking-[0.4em] ink-muted">
                    A TriageSetu Special Report
                  </div>
                </div>

                {/* Right ornament */}
                <span className="fleuron hidden text-2xl sm:inline-block">❦</span>
              </motion.div>

              {/* Bottom thick-thin rule */}
              <div className="rule-thick-thin" />

              {/* Sub-masthead info bar */}
              <div className="flex items-center justify-between gap-4 pt-2 text-[10px] uppercase tracking-[0.12em] ink-muted font-serif-old">
                <span>★ Patient Safety Edition ★</span>
                <span className="hidden sm:inline italic">Established MMXXVI</span>
                <span accent="">Accenture Innovation Challenge</span>
              </div>
            </div>

            {/* === BREAKING TICKER === */}
            <div className="relative z-10 mx-8 mb-4 flex items-center gap-3 border-y border-[#1C1917]/40 bg-[#1C1917] px-3 py-2">
              <span className="flex shrink-0 items-center gap-1.5 bg-[#c4473d] px-2 py-0.5 font-serif-old text-[10px] font-bold uppercase tracking-wider text-white">
                <AlertTriangle className="h-2.5 w-2.5" /> Breaking
              </span>
              <div className="relative flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tickerIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                    className="font-serif-old text-[12px] font-medium text-[#DCCFB0]"
                  >
                    {TICKER_ITEMS[tickerIndex]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* === MAIN HEADLINE BAND === */}
            <div className="relative z-10 px-8 pb-4">
              {/* Kicker */}
              <div className="text-center font-serif-old text-[10px] font-bold uppercase tracking-[0.3em] ink-muted">
                ── Special Dispatch · Patient Safety Series ──
              </div>

              {/* Rotating headline */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeHeadline}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.5 }}
                  className="mt-3 text-center"
                >
                  {/* Tag */}
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-serif-old text-[10px] font-bold uppercase tracking-[0.2em] ink-muted">
                      {HEADLINES[activeHeadline].tier}
                    </span>
                  </div>
                  {/* Headline — Didone serif */}
                  <h2 className="mx-auto mt-2 max-w-3xl font-didone text-3xl font-black leading-[1.1] ink sm:text-5xl">
                    {HEADLINES[activeHeadline].title}
                  </h2>
                </motion.div>
              </AnimatePresence>

              {/* Headline dots */}
              <div className="mt-4 flex items-center justify-center gap-2">
                {HEADLINES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveHeadline(i)}
                    className={`h-2 rounded-full border border-[#1C1917] transition-all ${
                      i === activeHeadline ? "w-8 bg-[#1C1917]" : "w-2 bg-transparent"
                    }`}
                    aria-label={`Story ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* === 3-COLUMN BODY === */}
            <div className="relative z-10 grid gap-0 px-8 pb-6 md:grid-cols-3">
              {/* Left column */}
              <div className="col-rule md:pr-5 md:border-l-0">
                <div className="mb-3 font-serif-old text-[10px] font-bold uppercase tracking-[0.2em] ink-muted">
                  ── By the Numbers ──
                </div>
                <div className="space-y-3">
                  {STATS.slice(0, 2).map((stat, i) => (
                    <StatBlock key={stat.label} stat={stat} delay={0.5 + i * 0.1} />
                  ))}
                </div>

                {/* In this edition */}
                <div className="mt-4 border-t border-[#1C1917]/30 pt-3">
                  <div className="font-serif-old text-[10px] font-bold uppercase tracking-[0.2em] ink-muted">
                    In This Edition
                  </div>
                  <ul className="mt-1.5 space-y-0.5 font-serif-old text-[11px] ink-muted">
                    <li>→ Why triage matters</li>
                    <li>→ The 3× surge protocol</li>
                    <li>→ How AI assists, never decides</li>
                    <li>→ DPDP & patient data</li>
                  </ul>
                </div>
              </div>

              {/* Center column — lead story */}
              <div className="col-rule border-t border-[#1C1917]/30 px-5 md:border-t-0">
                <div className="mb-3 text-center font-serif-old text-[10px] font-bold uppercase tracking-[0.2em] ink-muted">
                  ── Lead Story ──
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeHeadline}
                    initial={{ opacity: 0, rotateX: -10 }}
                    animate={{ opacity: 1, rotateX: 0 }}
                    exit={{ opacity: 0, rotateX: 10 }}
                    transition={{ duration: 0.5 }}
                  >
                    {/* Subhead */}
                    <p className="mb-2 text-center font-didone text-sm font-bold italic ink-muted">
                      {HEADLINES[activeHeadline].tag}
                    </p>

                    {/* Body text with drop cap */}
                    <p className="drop-cap font-serif-old text-[13px] leading-[1.6] ink">
                      {HEADLINES[activeHeadline].excerpt}
                    </p>

                    {/* Continue reading */}
                    <p className="mt-3 font-serif-old text-[11px] italic ink-muted">
                      Continued on the dashboard →
                    </p>

                    {/* Ornamental divider */}
                    <div className="my-3 flex items-center justify-center gap-2">
                      <span className="h-px w-12 bg-[#1C1917]/40" />
                      <span className="fleuron text-sm">❦</span>
                      <span className="h-px w-12 bg-[#1C1917]/40" />
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Editorial quote */}
                <div className="mt-2">
                  <p className="font-didone text-[13px] italic leading-relaxed ink">
                    &ldquo;Under-triage and over-triage carry asymmetric costs. Missing a critical case is categorically worse than over-prioritizing a minor one.&rdquo;
                  </p>
                  <div className="mt-1 text-right font-serif-old text-[10px] font-bold uppercase tracking-wider ink-muted">
                    — PatientTriage.ai Brief
                  </div>
                </div>

                {/* CTA — small inline version in the lead story column */}
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    onClick={onEnter}
                    className="group relative w-full overflow-hidden border-2 border-[#1C1917] bg-[#1C1917] px-4 py-3 font-serif-old text-[13px] font-bold uppercase tracking-[0.15em] text-[#DCCFB0] shadow-[4px_4px_0_0_rgba(28,25,23,0.3)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgba(28,25,23,0.4)] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_rgba(28,25,23,0.3)]"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Open the live triage queue
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </button>
                  <button
                    onClick={onEnter}
                    className="group relative w-full overflow-hidden border-2 border-[#1C1917] bg-transparent px-4 py-3 font-serif-old text-[13px] font-bold uppercase tracking-[0.15em] text-[#1C1917] shadow-[4px_4px_0_0_rgba(28,25,23,0.2)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:bg-[#1C1917]/5 hover:shadow-[6px_6px_0_0_rgba(28,25,23,0.3)] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_rgba(28,25,23,0.2)]"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Activity className="h-4 w-4" />
                      View department analytics
                    </span>
                  </button>
                </div>
              </div>

              {/* Right column */}
              <div className="col-rule border-t border-[#1C1917]/30 px-5 md:border-t-0">
                <div className="mb-3 font-serif-old text-[10px] font-bold uppercase tracking-[0.2em] ink-muted">
                  ── The Burden ──
                </div>
                <div className="space-y-3">
                  {STATS.slice(2).map((stat, i) => (
                    <StatBlock key={stat.label} stat={stat} delay={0.6 + i * 0.1} />
                  ))}
                </div>

                {/* Market bulletin */}
                <div className="mt-4 border-t border-[#1C1917]/30 pt-3">
                  <div className="font-serif-old text-[10px] font-bold uppercase tracking-[0.2em] ink-muted">
                    ── Today's Bulletin ──
                  </div>
                  <ul className="mt-1.5 space-y-1 font-serif-old text-[11px] ink-muted">
                    <li>• Surge protocol: ready</li>
                    <li>• Audit ledger: append-only</li>
                    <li>• Jurisdiction: DPDP / HIPAA</li>
                    <li>• Demo cohort: 20 patients</li>
                    <li>• Facilities: 2 hospitals</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* === PROMINENT ENTER-THE-DASHBOARD BAND === */}
            <div className="relative z-10 border-y-4 border-double border-[#1C1917] bg-[#1C1917] px-8 py-5">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                <div className="text-center sm:text-left">
                  <div className="font-serif-old text-[10px] font-bold uppercase tracking-[0.3em] text-[#DCCFB0]/60">
                    ── Begin Your Session ──
                  </div>
                  <div className="mt-1 font-didone text-2xl font-black text-[#DCCFB0] sm:text-3xl">
                    Enter the dashboard
                  </div>
                  <div className="mt-0.5 font-serif-old text-[12px] italic text-[#DCCFB0]/70">
                    20 patients waiting · 2 hospitals · live scoring engine
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <motion.button
                    onClick={onEnter}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="group relative overflow-hidden bg-gradient-to-r from-[oklch(0.72_0.2_280)] via-[oklch(0.65_0.2_295)] to-[oklch(0.7_0.18_250)] px-6 py-3 font-serif-old text-[13px] font-bold uppercase tracking-[0.15em] text-white shadow-[0_8px_24px_-4px_rgba(114,80,200,0.6)]"
                  >
                    {/* Shimmer overlay */}
                    <motion.span
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    />
                    <span className="relative z-10 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      Open the live triage queue
                    </span>
                  </motion.button>
                  <motion.button
                    onClick={onEnter}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="group relative overflow-hidden border-2 border-[#DCCFB0] bg-transparent px-6 py-3 font-serif-old text-[13px] font-bold uppercase tracking-[0.15em] text-[#DCCFB0] transition-colors hover:bg-[#DCCFB0]/10"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      View analytics
                    </span>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* === FOOTER BAND === */}
            <div className="relative z-10 border-t-2 border-[#1C1917] bg-[#1C1917]/5 px-8 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2 font-serif-old text-[10px] uppercase tracking-[0.12em] ink-muted">
                <div className="flex items-center gap-1.5">
                  <Stethoscope className="h-3 w-3" />
                  <span className="font-bold">TriageSetu Clinical Times</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3 w-3" />
                  <span>20 demo patients · 2 hospitals</span>
                </div>
                <div className="italic">Clinical workflow prototype — not a medical device</div>
              </div>
            </div>

            {/* Paper edge shadow for 3D depth */}
            <div className="pointer-events-none absolute inset-0 z-[2] rounded-sm shadow-[inset_0_0_40px_rgba(100,75,40,0.15)]" />
          </div>

          {/* Floating accent badges removed per user feedback */}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={mounted ? { opacity: 1 } : {}}
          transition={{ delay: 2 }}
          className="mt-6 flex flex-col items-center gap-1 text-white/50"
        >
          <span className="font-serif-old text-[10px] uppercase tracking-wider">Scroll down or open dashboard</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function StatBlock({
  stat,
  delay,
}: {
  stat: typeof STATS[number];
  delay: number;
}) {
  const Icon = stat.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -2 }}
      className="group relative"
    >
      <div className="flex items-baseline gap-2">
        <div className="font-didone text-4xl font-black ink leading-none">
          {stat.value}
        </div>
        <div className="grid h-6 w-6 shrink-0 place-items-center self-center border border-[#1C1917] text-[#1C1917]">
          <Icon className="h-3 w-3" />
        </div>
      </div>
      <div className="mt-1 font-serif-old text-[12px] font-bold ink">{stat.label}</div>
      <div className="font-serif-old text-[10px] italic ink-faint">{stat.sub}</div>
    </motion.div>
  );
}
