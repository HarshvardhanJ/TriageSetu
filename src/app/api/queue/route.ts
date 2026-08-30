import { NextResponse } from "next/server";
import { ensureSeed, isSurge, listPatients } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await ensureSeed();
  const url = new URL(req.url);
  const hospitalId = url.searchParams.get("hospitalId") ?? undefined;
  const status = url.searchParams.get("status") ?? "waiting";
  const [patients, surge] = await Promise.all([listPatients(hospitalId, status), isSurge(hospitalId)]);
  return NextResponse.json({ patients, surge });
}
