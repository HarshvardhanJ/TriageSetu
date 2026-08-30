// TriageSetu service layer — DB operations, seeding, scoring orchestration.
import { db } from "./db";
import { score, type Intake, type Score } from "./triage";
import { DEMO_PATIENTS, DEMO_HOSPITALS, DEMO_STAFF, generateBeds } from "./demo-data";

// Module-level cache so ensureSeed runs at most once per serverless container.
const globalForService = globalThis as unknown as {
  __seeded?: boolean;
  __schemaReady?: boolean;
};

/**
 * Ensure the SQLite schema exists in the database file. On Vercel, we write
 * to /tmp/triagesetu.db (a fresh empty file), so we must create the schema
 * before any queries. We do this by issuing raw DDL via Prisma's executeRaw.
 */
async function ensureSchema() {
  if (globalForService.__schemaReady) return;
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Hospital" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bedsTotal" INTEGER NOT NULL DEFAULT 40,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Hospital_code_key" ON "Hospital"("code")`);
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hospitalId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "score" TEXT NOT NULL,
    "arrivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "waitMinutes" INTEGER NOT NULL DEFAULT 0,
    "clinicianTier" INTEGER,
    "clinicianId" TEXT,
    "clinicianRole" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "gender" TEXT NOT NULL DEFAULT 'unknown',
    "revealed" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id")
  )`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Patient_hospitalId_status_idx" ON "Patient"("hospitalId", "status")`);
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Audit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventType" TEXT NOT NULL,
    "patientId" TEXT,
    "clinicianId" TEXT,
    "clinicianRole" TEXT,
    "detail" TEXT NOT NULL,
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  )`);
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Bed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hospitalId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'free',
    "patientId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id")
  )`);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Bed_hospitalId_code_key" ON "Bed"("hospitalId", "code")`);
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "shift" TEXT NOT NULL,
    "onDuty" BOOLEAN NOT NULL DEFAULT 1,
    "load" INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id")
  )`);
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Note" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  )`);
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
  )`);
  globalForService.__schemaReady = true;
}

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
  // Idempotent: if data already exists in this container, skip seeding.
  if (globalForService.__seeded) return;
  try {
    // Ensure the schema exists (needed on Vercel where DB file is fresh).
    await ensureSchema();
    const hospitalCount = await db.hospital.count();
    if (hospitalCount > 0) {
      // Check if any patients exist; if not, seed demo patients into the first hospital
      const patientCount = await db.patient.count();
      if (patientCount === 0) {
        await seedDemo();
      }
      globalForService.__seeded = true;
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
    globalForService.__seeded = true;
  } catch (err) {
    // On Vercel's read-only filesystem, the bundled SQLite file may fail to open.
    // Log and rethrow so the API returns a clear error to the caller.
    console.error("[ensureSeed] Failed to seed database:", err);
    throw err;
  }
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
  // Ensure schema exists (Vercel cold start may have a fresh DB).
  await ensureSchema();
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
