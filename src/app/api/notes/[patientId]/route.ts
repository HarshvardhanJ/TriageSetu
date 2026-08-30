import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({
  author: z.string().min(2),
  role: z.string().min(2),
  text: z.string().min(1).max(1000),
});

export async function GET(_req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const notes = await db.note.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ notes });
}

export async function POST(req: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ detail: parsed.error.flatten() }, { status: 400 });
  const note = await db.note.create({
    data: { patientId, author: parsed.data.author, role: parsed.data.role, text: parsed.data.text },
  });
  return NextResponse.json(note, { status: 201 });
}
