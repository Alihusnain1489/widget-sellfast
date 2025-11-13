import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    console.log('API: Fetching companies, category:', category || 'all');

    // If no category or category is empty, return all companies that have items
    if (!category || category === '' || category === 'all') {
      const companies = await prisma.company.findMany({
        where: { 
          items: { 
            some: {} // Has at least one item
          } 
        },
        select: { 
          id: true, 
          name: true,
          icon: true,
        },
        orderBy: {
          name: 'asc'
        }
      });

      console.log(`API: Found ${companies.length} companies with items`);
      return NextResponse.json(companies);
    }

    // Find companies that have items in the specified category
    // Company -> ItemCompany -> Item -> ItemCategory
    // First, find the category to get exact name match
    const categoryRecord = await prisma.itemCategory.findFirst({
      where: {
        name: category
      }
    });

    if (!categoryRecord) {
      console.log(`Category "${category}" not found`);
      return NextResponse.json([]);
    }

    const companies = await prisma.company.findMany({
      where: { 
        items: { 
          some: { 
            item: { 
              categoryId: categoryRecord.id
            } 
          } 
        } 
      },
      select: { 
        id: true, 
        name: true,
        icon: true,
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`API: Found ${companies.length} companies for category "${category}" (${categoryRecord.name})`);

    return NextResponse.json(companies);
  } catch (error: any) {
    console.error("API Error fetching companies:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch companies" },
      { status: 500 }
    );
  }
}