import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeed } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const rows = await db.audit.findMany({ orderBy: { id: "desc" }, take: 500 });
  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      detail: JSON.parse(r.detail),
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    }))
  );
}
