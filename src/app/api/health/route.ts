import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      {
        ok: false,
        databaseUrl: "missing",
        message: "DATABASE_URL is not set"
      },
      { status: 500 }
    );
  }

  let parsedUrl: URL | null = null;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        databaseUrl: "invalid",
        message: "DATABASE_URL is not a valid URL"
      },
      { status: 500 }
    );
  }

  try {
    const categoryCount = await prisma.category.count();

    return NextResponse.json({
      ok: true,
      databaseUrl: "set",
      host: parsedUrl.host,
      database: parsedUrl.pathname.replace("/", "") || null,
      authSource: parsedUrl.searchParams.get("authSource"),
      categoryCount
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        databaseUrl: "set",
        host: parsedUrl.host,
        database: parsedUrl.pathname.replace("/", "") || null,
        authSource: parsedUrl.searchParams.get("authSource"),
        message: error instanceof Error ? error.message : "Unknown database error"
      },
      { status: 500 }
    );
  }
}
