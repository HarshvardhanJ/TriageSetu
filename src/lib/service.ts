// TriageSetu service layer — DB operations, seeding, scoring orchestration.
import { db } from "./db";
import { score, type Intake, type Score } from "./triage";
import { DEMO_PATIENTS, DEMO_HOSPITALS, DEMO_STAFF, generateBeds } from "./demo-data";

export interface PatientRow {
  id: string;
  hospitalId: string;
  displayName: string;
  data: Intake;
  score: Score;
  arrivedAt: string;
  waitMinutes: number;
  clinicianTier: number | null;
  clinicianId: string | null;
  clinicianRole: string | null;
  status: string;
  gender: string;
  revealed: boolean;
}

export async function isSurge(hospitalId?: string): Promise<boolean> {
  const key = hospitalId ? `surge_${hospitalId}` : "surge_global";
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value === "true";
}

export async function setSurge(enabled: boolean, hospitalId?: string) {
  const key = hospitalId ? `surge_${hospitalId}` : "surge_global";
  await db.setting.upsert({
    where: { key },
    update: { value: enabled ? "true" : "false" },
    create: { key, value: enabled ? "true" : "false" },
  });
}

export async function logAudit(
  eventType: string,
  patientId: string | null,
  detail: Record<string, any>,
  clinicianId?: string,
  clinicianRole?: string
) {
  await db.audit.create({
    data: {
      eventType,
      patientId,
      detail: JSON.stringify(detail),
      clinicianId,
      clinicianRole,
    },
  });
}

export function toRow(p: any): PatientRow {
  return {
    id: p.id,
    hospitalId: p.hospitalId,
    displayName: p.displayName,
    data: JSON.parse(p.data),
    score: JSON.parse(p.score),
    arrivedAt: p.arrivedAt instanceof Date ? p.arrivedAt.toISOString() : p.arrivedAt,
    waitMinutes: p.waitMinutes,
    clinicianTier: p.clinicianTier,
    clinicianId: p.clinicianId,
    clinicianRole: p.clinicianRole,
    status: p.status,
    gender: p.gender,
    revealed: p.revealed,
  };
}

export async function createPatient(
  intake: Intake,
  hospitalId: string,
  patientId: string,
  wait = 0,
  auditEvent = true
): Promise<PatientRow> {
  const surge = await isSurge(hospitalId);
  const s = score(intake, surge, wait);
  const created = await db.patient.create({
    data: {
      id: patientId,
      hospitalId,
      displayName: intake.display_name,
      data: JSON.stringify(intake),
      score: JSON.stringify(s),
      waitMinutes: wait,
      gender: intake.gender ?? "unknown",
      revealed: intake.break_glass,
    },
  });
  if (auditEvent) {
    await logAudit("INTAKE", patientId, { message: "Structured intake scored", score: s });
  }
  return toRow(created);
}

export async function patientById(pid: string): Promise<PatientRow | null> {
  const p = await db.patient.findUnique({ where: { id: pid } });
  if (!p) return null;
  return toRow(p);
}

export async function listPatients(hospitalId?: string, status = "waiting"): Promise<PatientRow[]> {
  const where: any = { status };
  if (hospitalId) where.hospitalId = hospitalId;
  const rows = await db.patient.findMany({ where });
  const mapped = rows.map(toRow);
  // Compute display tier
  for (const p of mapped) {
    p.score.display_tier = p.clinicianTier ?? p.score.recommended_tier;
  }
  return mapped.sort(
    (a, b) => a.score.display_tier! - b.score.display_tier! || b.waitMinutes - a.waitMinutes
  );
}

export async function nextPatientId(hospitalId: string): Promise<string> {
  const count = await db.patient.count({ where: { hospitalId } });
  // Find hospital code prefix
  const hospital = await db.hospital.findUnique({ where: { id: hospitalId } });
  const prefix = hospital?.code.split("-")[0] ?? "TS";
  return `${prefix}-${101 + count}`;
}

export async function ensureSeed() {
  const hospitalCount = await db.hospital.count();
  if (hospitalCount > 0) {
    // Check if any patients exist; if not, seed demo patients into the first hospital
    const patientCount = await db.patient.count();
    if (patientCount === 0) {
      await seedDemo();
    }
    return;
  }
  // Create hospitals
  for (const h of DEMO_HOSPITALS) {
    const hospital = await db.hospital.create({
      data: {
        code: h.code,
        name: h.name,
        type: h.type,
        bedsTotal: h.bedsTotal,
      },
    });
    // Beds
    const beds = generateBeds(hospital.id, h.bedsTotal);
    if (beds.length) await db.bed.createMany({ data: beds });
    // Staff
    for (const s of DEMO_STAFF) {
      await db.staff.create({ data: { ...s, hospitalId: hospital.id } });
    }
    // Settings
    await db.setting.create({
      data: { key: `surge_${hospital.id}`, value: "false" },
    });
  }
  await seedDemo();
  await logAudit("SYSTEM", null, { message: "Demo data loaded — 2 hospitals, 20 patients, beds & staff seeded" });
}

export async function seedDemo() {
  const hospitals = await db.hospital.findMany();
  if (!hospitals.length) return;
  const primary = hospitals[0];
  for (const d of DEMO_PATIENTS) {
    await createPatient(d, primary.id, d.id, d.waitMinutes, false);
  }
}

export async function resetDemo() {
  // Delete in dependency order to avoid FK constraint violations
  await db.note.deleteMany();
  await db.audit.deleteMany();
  await db.patient.deleteMany();
  const settings = await db.setting.findMany();
  for (const s of settings) {
    if (s.key.startsWith("surge")) {
      await db.setting.update({ where: { key: s.key }, data: { value: "false" } });
    }
  }
  await seedDemo();
  await logAudit("SYSTEM", null, { message: "Demo reset — queue restored to 20 baseline cases" });
  return listPatients();
}

export async function advanceClock(minutes: number, hospitalId?: string) {
  const surge = await isSurge(hospitalId);
  const patients = await listPatients(hospitalId);
  for (const p of patients) {
    const wait = p.waitMinutes + minutes;
    const newScore = score(p.data, surge, wait);
    await db.patient.update({
      where: { id: p.id },
      data: { waitMinutes: wait, score: JSON.stringify(newScore) },
    });
  }
  await logAudit("REASSESSMENT", null, {
    minutes,
    message: `Deterioration monitor rescored all ${patients.length} waiting patients`,
  });
  return listPatients(hospitalId);
}

export async function overrideTier(
  pid: string,
  tier: number,
  reason: string,
  clinicianId: string,
  clinicianRole: string
) {
  const p = await patientById(pid);
  if (!p) return null;
  const recommended = p.score.recommended_tier;
  await db.patient.update({
    where: { id: pid },
    data: { clinicianTier: tier, clinicianId, clinicianRole, revealed: true },
  });
  await logAudit(
    tier !== recommended ? "OVERRIDE" : "CONFIRMATION",
    pid,
    { from_tier: recommended, to_tier: tier, reason, clinicianId, clinicianRole },
    clinicianId,
    clinicianRole
  );
  return patientById(pid);
}
