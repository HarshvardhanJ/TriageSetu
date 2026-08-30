import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchAbhaHistory } from "@/lib/abha";
import { ensureSeed, logAudit } from "@/lib/service";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  abhaNumber: z.string().regex(/^\d{14}$/, "ABHA number must contain 14 digits"),
  consent: z.literal(true),
  hospitalId: z.string().optional(),
});

export async function POST(req: Request) {
  await ensureSeed();
  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ detail: parsed.error.flatten() }, { status: 400 });
  }

  const { abhaNumber, consent, hospitalId } = parsed.data;
  const history = await fetchAbhaHistory(abhaNumber, consent);
  await logAudit("ABHA_HISTORY_REQUEST", null, {
    hospitalId: hospitalId ?? null,
    abhaLast4: abhaNumber.slice(-4),
    consent: true,
    source: history.source,
    returnedCategories: ["conditions", "allergies", "medications", "recentEncounters"],
  });

  return NextResponse.json({ history });
}
