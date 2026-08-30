import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const hospitalId = url.searchParams.get("hospitalId") ?? undefined;
  const where: any = {};
  if (hospitalId) where.hospitalId = hospitalId;
  const [patients, audit, staff, beds, hospitals] = await Promise.all([
    db.patient.findMany({ where: { ...where, status: "waiting" } }),
    db.audit.findMany({ take: 500, orderBy: { id: "desc" } }),
    db.staff.findMany({ where }),
    db.bed.findMany({ where }),
    db.hospital.findMany(),
  ]);
  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    hospitals,
    patients: patients.map((p) => ({
      id: p.id,
      name: p.displayName,
      gender: p.gender,
      waitMinutes: p.waitMinutes,
      clinicianTier: p.clinicianTier,
      clinicianId: p.clinicianId,
      clinicianRole: p.clinicianRole,
      status: p.status,
      // Pseudonymized — we DO NOT export raw complaint / vitals here.
      // A clinician with break-glass access can fetch the full record from /api/patients/[id].
      data: "[REDACTED — break-glass required]",
      score: JSON.parse(p.score),
    })),
    audit: audit.map((a) => ({
      ...a,
      detail: JSON.parse(a.detail),
      createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
    })),
    staff,
    beds,
  });
}
