import { NextResponse } from "next/server";
import { ensureSeed, isSurge } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await ensureSeed();
  const url = new URL(req.url);
  const hospitalId = url.searchParams.get("hospitalId") ?? undefined;
  const surge = await isSurge(hospitalId);
  return NextResponse.json({
    ok: true,
    model: "TriageSetu Hybrid Scorer v2 (rule + ML proxy)",
    surge,
    timestamp: new Date().toISOString(),
  });
}
