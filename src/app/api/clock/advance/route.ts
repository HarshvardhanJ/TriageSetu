import { NextResponse } from "next/server";
import { advanceClock } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const minutes = parseInt(url.searchParams.get("minutes") ?? "30", 10);
  if (![15, 30, 60].includes(minutes)) {
    return NextResponse.json({ detail: "Demo clock supports 15, 30, or 60 minutes" }, { status: 400 });
  }
  const hospitalId = url.searchParams.get("hospitalId") ?? undefined;
  const patients = await advanceClock(minutes, hospitalId);
  return NextResponse.json({ patients });
}
