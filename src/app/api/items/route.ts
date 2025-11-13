import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const company = searchParams.get("company");
    const companyId = searchParams.get("companyId");
    const itemId = searchParams.get("itemId");

    console.log('API: Fetching items, params:', { category, company, companyId, itemId });

    // If itemId is provided, return that specific item with specifications
    if (itemId) {
      try {
        const item = await prisma.item.findUnique({
          where: { id: itemId },
          include: {
            specifications: {
              orderBy: { name: 'asc' }
            },
          },
        });
        
        // Sort specifications by order in JavaScript (handles null values in order field)
        if (item?.specifications) {
          item.specifications.sort((a: any, b: any) => {
            // If both have order, sort by order
            if (a.order !== null && a.order !== undefined && b.order !== null && b.order !== undefined) {
              return a.order - b.order
            }
            // If only a has order, it comes first
            if (a.order !== null && a.order !== undefined) return -1
            // If only b has order, it comes first
            if (b.order !== null && b.order !== undefined) return 1
            // Otherwise, sort by name
            return a.name.localeCompare(b.name)
          })
        }
        
        if (!item) {
          console.log(`API: Item with id "${itemId}" not found`);
          return NextResponse.json(
            { error: `Item with id "${itemId}" not found` },
            { status: 404 }
          );
        }
        
        console.log(`API: Found item "${item.name}" with ${item.specifications?.length || 0} specifications`);
        return NextResponse.json(item);
      } catch (error: any) {
        console.error('API Error fetching item:', error);
        return NextResponse.json(
          { error: error?.message || 'Failed to fetch item' },
          { status: 500 }
        );
      }
    }

    // If companyId is provided, filter by category if available
    if (companyId) {
      let whereClause: any = {
        companies: {
          some: { 
            companyId: companyId
          }
        }
      };
      
      // If category is also provided, filter by both company and category
      if (category) {
        const categoryRecord = await prisma.itemCategory.findFirst({
          where: { name: category }
        });
        
        if (categoryRecord) {
          whereClause.categoryId = categoryRecord.id;
        }
      }
      
      const items = await prisma.item.findMany({
        where: whereClause,
        select: { 
          id: true, 
          name: true,
          specifications: true,
        },
        orderBy: {
          name: 'asc'
        }
      });
      
      const filterMsg = category ? `for category "${category}" and ` : '';
      console.log(`API: Found ${items.length} items ${filterMsg}companyId "${companyId}"`);
      return NextResponse.json(items);
    }

    // If company name is provided (without category), get all items for that company
    if (company && !category) {
      const companyRecord = await prisma.company.findFirst({
        where: { name: company }
      });

      if (!companyRecord) {
        console.log(`Company "${company}" not found`);
        return NextResponse.json([]);
    }

    const items = await prisma.item.findMany({
      where: {
        companies: {
          some: { 
              companyId: companyRecord.id
            }
          }
        },
        select: { 
          id: true, 
          name: true,
          specifications: true,
        },
        orderBy: {
          name: 'asc'
        }
      });

      console.log(`API: Found ${items.length} items for company "${company}"`);
      return NextResponse.json(items);
    }

    // Otherwise, filter by category and company (backward compatibility)
    if (category && company) {
      const categoryRecord = await prisma.itemCategory.findFirst({
        where: { name: category }
      });

      const companyRecord = await prisma.company.findFirst({
        where: { name: company }
      });

      if (!categoryRecord || !companyRecord) {
        console.log(`Category "${category}" or Company "${company}" not found`);
        return NextResponse.json([]);
      }

      const items = await prisma.item.findMany({
        where: {
          categoryId: categoryRecord.id,
          companies: {
            some: { 
              companyId: companyRecord.id
            }
          }
      },
      select: { 
        id: true, 
        name: true,
        specifications: true,
      },
        orderBy: {
          name: 'asc'
        }
    });

      console.log(`API: Found ${items.length} items for category "${category}" and company "${company}"`);
    return NextResponse.json(items);
    }

    return NextResponse.json(
      { error: "Company or companyId parameter is required" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("❌ API Error fetching items:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch items" },
      { status: 500 }
    );
  }
}