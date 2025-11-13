import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const item = searchParams.get("item");

    if (!item) {
      return NextResponse.json(
        { error: "Item parameter is required" },
        { status: 400 }
      );
    }

    const specifications = await prisma.specification.findMany({
      where: { 
        item: { 
          name: item
        } 
      },
      select: { id: true, name: true },
    });

    return NextResponse.json(specifications);
  } catch (error) {
    console.error("Error fetching specifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch specifications" },
      { status: 500 }
    );
  }
}