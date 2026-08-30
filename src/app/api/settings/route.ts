import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await db.setting.findMany();
  return NextResponse.json({
    settings: settings.reduce<Record<string, string>>((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {}),
  });
}

const Schema = z.object({
  key: z.string().min(2),
  value: z.string(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ detail: parsed.error.flatten() }, { status: 400 });
  const { key, value } = parsed.data;
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  return NextResponse.json({ ok: true });
}
