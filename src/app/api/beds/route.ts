import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const hospitalId = url.searchParams.get("hospitalId");
  const where: any = hospitalId ? { hospitalId } : {};
  const beds = await db.bed.findMany({ where, orderBy: { code: "asc" } });
  return NextResponse.json({ beds });
}
