import { NextResponse } from "next/server";
import { isSurge, listPatients, logAudit, setSurge } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const enabled = url.searchParams.get("enabled") === "true";
  const hospitalId = url.searchParams.get("hospitalId") ?? undefined;
  await setSurge(enabled, hospitalId);
  const surge = await isSurge(hospitalId);
  // Re-score every waiting patient under the new policy
  const patients = await listPatients(hospitalId);
  const db = (await import("@/lib/db")).db;
  const { score } = await import("@/lib/triage");
  for (const p of patients) {
    const newScore = score(p.data, surge, p.waitMinutes);
    await db.patient.update({ where: { id: p.id }, data: { score: JSON.stringify(newScore) } });
  }
  await logAudit("SURGE_POLICY", null, {
    enabled,
    message: "Stricter escalation policy recalculated across waiting queue",
  });
  return NextResponse.json({ surge, patients: await listPatients(hospitalId) });
}
