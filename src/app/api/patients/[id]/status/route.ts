import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Discharge / mark as treated
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body.status ?? "treated";
  const updated = await db.patient.update({
    where: { id },
    data: { status, revealed: true },
  });
  await db.audit.create({
    data: {
      eventType: status === "treated" ? "DISCHARGE" : "STATUS_CHANGE",
      patientId: id,
      detail: JSON.stringify({ message: `Patient marked ${status}` }),
      clinicianId: body.clinicianId ?? "NURSE-DEMO-01",
      clinicianRole: body.clinicianRole ?? "Triage nurse",
    },
  });
  return NextResponse.json(updated);
}
