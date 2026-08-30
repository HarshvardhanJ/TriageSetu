import { NextResponse } from "next/server";
import { createPatient, ensureSeed, nextPatientId } from "@/lib/service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const AbhaHistorySchema = z.object({
  verified: z.boolean(),
  source: z.string().max(80),
  conditions: z.array(z.string().max(160)).max(20),
  allergies: z.array(z.string().max(160)).max(20),
  medications: z.array(z.string().max(160)).max(20),
  recentEncounters: z.array(z.object({
    date: z.string().max(40), facility: z.string().max(160), summary: z.string().max(500),
  })).max(20),
});

const IntakeSchema = z.object({
  display_name: z.string().min(2).max(80), age: z.number().int().min(0).max(120),
  heart_rate: z.number().int().min(20).max(260), respiratory_rate: z.number().int().min(5).max(90),
  spo2: z.number().int().min(50).max(100), temperature: z.number().min(30).max(45),
  systolic_bp: z.number().int().min(40).max(260), avpu: z.enum(["alert", "voice", "pain", "unresponsive"]),
  complaint: z.string().min(3).max(500), history_available: z.boolean(), active_bleeding: z.boolean(), break_glass: z.boolean(),
  gender: z.enum(["male", "female", "unknown"]).optional(), hospitalId: z.string().optional(),
  abha_number_masked: z.string().regex(/^XXXX-XXXX-\d{4}$/).optional(), abha_history: AbhaHistorySchema.optional(),
});

export async function POST(req: Request) {
  await ensureSeed();
  const body = await req.json(); const parsed = IntakeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ detail: parsed.error.flatten() }, { status: 400 });
  const { hospitalId, ...intake } = parsed.data;
  const db = (await import("@/lib/db")).db; let hId = hospitalId;
  if (!hId) { const h = await db.hospital.findFirst({ orderBy: { createdAt: "asc" } }); hId = h!.id; }
  const pid = await nextPatientId(hId); const patient = await createPatient({ ...intake }, hId, pid);
  return NextResponse.json(patient, { status: 201 });
}
