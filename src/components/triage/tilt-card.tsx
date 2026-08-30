"use client";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
interface TiltCardProps { children: ReactNode; className?: string; intensity?: number; glare?: boolean; glowOnHover?: boolean; }
export function TiltCard({ children, className }: TiltCardProps) { return <div className={cn(className)}>{children}</div>; }
