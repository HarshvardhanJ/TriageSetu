"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  delay = 0,
  suffix = "",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "red" | "amber" | "green" | "surge" | "blue" | "violet";
  delay?: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [6, -6]), { stiffness: 300, damping: 25 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-6, 6]), { stiffness: 300, damping: 25 });

  // Glare position
  const glareBg = useTransform(
    [mouseX, mouseY],
    ([x, y]) =>
      `radial-gradient(circle at ${(x as number) * 100}% ${(y as number) * 100}%, rgb(255 255 255 / 0.12), transparent 60%)`
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const tones = {
    default: {
      text: "text-foreground",
      grad: "from-[oklch(0.7_0.18_250)] to-[oklch(0.65_0.2_295)]",
      glow: "",
    },
    red: {
      text: "text-[color-mix(in_oklch,var(--triage-red)_92%,white)]",
      grad: "from-[oklch(0.62_0.22_22)] to-[oklch(0.65_0.24_18)]",
      glow: hovering ? "shadow-glow-red" : "",
    },
    amber: {
      text: "text-[color-mix(in_oklch,var(--triage-amber)_92%,white)]",
      grad: "from-[oklch(0.75_0.18_65)] to-[oklch(0.78_0.19_70)]",
      glow: hovering ? "shadow-glow-amber" : "",
    },
    green: {
      text: "text-[color-mix(in_oklch,var(--triage-green)_92%,white)]",
      grad: "from-[oklch(0.68_0.16_155)] to-[oklch(0.72_0.17_160)]",
      glow: hovering ? "shadow-glow-green" : "",
    },
    blue: {
      text: "text-[color-mix(in_oklch,var(--triage-cyan)_92%,white)]",
      grad: "from-[oklch(0.65_0.14_200)] to-[oklch(0.55_0.16_250)]",
      glow: "",
    },
    violet: {
      text: "text-[color-mix(in_oklch,var(--triage-violet)_92%,white)]",
      grad: "from-[oklch(0.62_0.22_300)] to-[oklch(0.55_0.16_290)]",
      glow: "",
    },
    surge: {
      text: "text-[color-mix(in_oklch,var(--surge)_92%,white)]",
      grad: "from-[oklch(0.65_0.22_25)] to-[oklch(0.72_0.24_30)]",
      glow: hovering ? "shadow-glow-surge" : "",
    },
  };
  const t = tones[tone];

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        mouseX.set(0.5);
        mouseY.set(0.5);
      }}
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay, type: "spring", stiffness: 200, damping: 22 }}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border glass shadow-glass transition-shadow duration-300",
        t.glow
      )}
    >
      {/* Background gradient blob */}
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-25 blur-2xl transition-opacity duration-300 group-hover:opacity-50",
          t.grad
        )}
      />

      {/* Glare overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ background: glareBg }}
      />

      <div className="relative p-4" style={{ transform: "translateZ(40px)" }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span className={cn("h-1 w-1 rounded-full bg-gradient-to-r", t.grad)} />
              {label}
            </div>
            <div className={cn("mt-1.5 text-[28px] font-bold leading-none tabular-nums tracking-tight", t.text)}>
              {value}
              {suffix && <span className="ml-0.5 text-base font-normal text-muted-foreground">{suffix}</span>}
            </div>
            {hint && <div className="mt-1.5 text-[11px] text-muted-foreground">{hint}</div>}
          </div>
          {Icon && (
            <motion.div
              whileHover={{ rotate: 8, scale: 1.1 }}
              className={cn(
                "grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md",
                t.grad
              )}
              style={{ transform: "translateZ(50px)" }}
            >
              <Icon className="h-4 w-4" />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
