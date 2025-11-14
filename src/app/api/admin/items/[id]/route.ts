import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/middleware";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = getUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, categoryId, companyIds, icon } = body;

    // Update item
    const updateData: any = {};
    if (name) updateData.name = name;
    if (categoryId) updateData.categoryId = categoryId;
    if (icon !== undefined) updateData.icon = icon || null;

    const item = await prisma.item.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        companies: {
          include: {
            company: true,
          },
        },
      },
    });

    // Update companies if provided
    if (companyIds && Array.isArray(companyIds)) {
      // Delete existing associations
      // Delete existing companies
      await prisma.itemCompany.deleteMany({
        where: { itemId: id },
      });

      // Create new company relationships
      await Promise.all(
        companyIds.map((companyId) =>
          prisma.itemCompany.upsert({
            where: {
              itemId_companyId: {
                itemId: id,
                companyId,
              },
            },
            update: {},
            create: {
              itemId: id,
              companyId,
            },
          })
        )
      );

      // Fetch updated item
      const updatedItem = await prisma.item.findUnique({
        where: { id },
        include: {
          category: true,
          companies: {
            include: {
              company: true,
            },
          },
        },
      });

      return NextResponse.json({ item: updatedItem });
    }

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error("Error updating item:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = getUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if item has listings
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        category: true,
        _count: {
          select: { listings: true, specifications: true },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Get transfer options from request body
    const body = await request.json().catch(() => ({}));
    const { transferTo, createNew, newName } = body;

    let targetItemId = transferTo;

    // If creating new item, create it first
    if (createNew && newName) {
      const newItem = await prisma.item.create({
        data: {
          name: newName,
          categoryId: item.categoryId,
        },
      });
      targetItemId = newItem.id;

      // Transfer specifications to new item
      if (item._count.specifications > 0) {
        await prisma.specification.updateMany({
          where: { itemId: id },
          data: { itemId: targetItemId },
        });
      }
    } else if (item._count.specifications > 0 && targetItemId) {
      // Transfer specifications to target item
      await prisma.specification.updateMany({
        where: { itemId: id },
        data: { itemId: targetItemId },
      });
    }

    // Transfer listings to target item if transfer is requested
    if (item._count.listings > 0 && targetItemId) {
      // Update all listings to belong to the target item
      await prisma.listing.updateMany({
        where: { itemId: id },
        data: { itemId: targetItemId },
      });
    } else if (item._count.listings > 0 && !targetItemId) {
      // Force delete: Delete all related listings, specifications, and item-company relationships if no transfer
      // Delete all listings for this item
      // Get all listing IDs
      const listings = await prisma.listing.findMany({
        where: { itemId: id },
        select: { id: true },
      });

      // Delete listing specifications first
      for (const listing of listings) {
        await prisma.listingSpecification.deleteMany({
          where: { listingId: listing.id },
        });
      }

      // Delete listings
      await prisma.listing.deleteMany({
        where: { itemId: id },
      });
    }

    // Delete specifications if not transferred
    if (!targetItemId) {
      await prisma.specification.deleteMany({
        where: { itemId: id },
      });
    }

    // Delete item-company relationships
    await prisma.itemCompany.deleteMany({
      where: { itemId: id },
    });

    // Now delete the item
    await prisma.item.delete({
      where: { id },
    });

    return NextResponse.json({
      message: targetItemId
        ? `Item deleted. ${item._count.listings || 0} listing(s) and ${
            item._count.specifications || 0
          } specification(s) transferred to target item.`
        : "Item and all related data deleted successfully",
      deletedListings: targetItemId ? 0 : item._count.listings || 0,
      deletedSpecifications: targetItemId ? 0 : item._count.specifications || 0,
      transferredListings: targetItemId ? item._count.listings || 0 : 0,
      transferredSpecifications: targetItemId
        ? item._count.specifications || 0
        : 0,
    });
  } catch (error: any) {
    console.error("Error deleting item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
