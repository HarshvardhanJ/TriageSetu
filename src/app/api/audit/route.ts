import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.audit.findMany({ orderBy: { id: "desc" }, take: 500 });
  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      detail: JSON.parse(r.detail),
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    }))
  );
}
