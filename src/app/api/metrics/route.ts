import { NextResponse } from "next/server";
import { ensureSeed, isSurge, listPatients } from "@/lib/service";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await ensureSeed();
  const url = new URL(req.url);
  const hospitalId = url.searchParams.get("hospitalId") ?? undefined;
  const patients = await listPatients(hospitalId);
  const surge = await isSurge(hospitalId);

  const urgent = patients.filter((p) => (p.score.display_tier ?? 5) <= 2).length;
  const review = patients.filter((p) => p.score.flags.includes("Needs clinician review")).length;
  const overdue = patients.filter((p) => p.score.flags.includes("Reassessment overdue")).length;
  const avgWait = patients.length
    ? Math.round(patients.reduce((s, p) => s + p.waitMinutes, 0) / patients.length)
    : 0;
  const avgConfidence = patients.length
    ? Math.round(patients.reduce((s, p) => s + p.score.confidence, 0) / patients.length)
    : 0;

  // Tier distribution
  const tierDistribution = [1, 2, 3, 4, 5].map((t) => ({
    tier: t,
    count: patients.filter((p) => (p.score.display_tier ?? 5) === t).length,
  }));

  // Age band distribution
  const bands = ["pediatric", "adult", "geriatric"] as const;
  const ageBandDist = bands.map((b) => ({
    band: b,
    count: patients.filter((p) => p.score.age_band === b).length,
  }));

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const arrivedLastHour = await db.patient.count({
    where: { ...(hospitalId ? { hospitalId } : {}), arrivedAt: { gte: oneHourAgo } },
  });
  const dischargedLastHour = await db.audit.count({
    where: { createdAt: { gte: oneHourAgo }, eventType: { in: ["DISCHARGE", "STATUS_CHANGE"] } },
  });
  const esiiAvg =
    patients.length > 0
      ? Math.round(
          (patients.reduce((s, p) => s + (p.score.display_tier ?? 5) * p.waitMinutes, 0) /
            Math.max(1, patients.reduce((s, p) => s + p.waitMinutes, 0))) *
            10
        ) / 10
      : 0;

  return NextResponse.json({
    counts: {
      total: patients.length,
      urgent,
      review,
      overdue,
      avgWait,
      avgConfidence,
      arrivedLastHour,
      dischargedLastHour,
      esiiAvg,
      surge,
    },
    tierDistribution,
    ageBandDist,
  });
}
