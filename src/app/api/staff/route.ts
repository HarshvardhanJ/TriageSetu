import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeed } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await ensureSeed();
  const url = new URL(req.url);
  const hospitalId = url.searchParams.get("hospitalId");
  const where: any = hospitalId ? { hospitalId } : {};
  const staff = await db.staff.findMany({ where, orderBy: { onDuty: "desc" } });
  return NextResponse.json({ staff });
}
