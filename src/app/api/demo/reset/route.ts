import { NextResponse } from "next/server";
import { resetDemo } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function POST() {
  const patients = await resetDemo();
  return NextResponse.json({ patients });
}
