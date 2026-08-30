import { NextResponse } from "next/server";
import { overrideTier, patientById } from "@/lib/service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({
  clinician_id: z.string().min(2).max(80),
  clinician_role: z.string().min(2).max(80),
  tier: z.number().int().min(1).max(5),
  reason: z.string().min(3).max(400),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ detail: parsed.error.flatten() }, { status: 400 });
  }
  const { tier, reason, clinician_id, clinician_role } = parsed.data;
  const updated = await overrideTier(id, tier, reason, clinician_id, clinician_role);
  if (!updated) return NextResponse.json({ detail: "Patient not found" }, { status: 404 });
  return NextResponse.json(updated);
}
