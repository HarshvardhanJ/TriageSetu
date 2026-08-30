import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeed } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const hospitals = await db.hospital.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ hospitals });
}
