import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json({ ok: true, mode: "local" });
  }

  try {
    await prisma.$runCommandRaw({ ping: 1 });
    return NextResponse.json({ ok: true, mode: "database" });
  } catch {
    return NextResponse.json(
      { ok: false, mode: "database", message: "Database unavailable" },
      { status: 503 }
    );
  }
}
