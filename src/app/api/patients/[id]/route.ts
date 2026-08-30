import { NextResponse } from "next/server";
import { patientById } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await patientById(id);
  if (!p) return NextResponse.json({ detail: "Patient not found" }, { status: 404 });
  const db = (await import("@/lib/db")).db;
  const notes = await db.note.findMany({ where: { patientId: id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ...p, notes });
}
