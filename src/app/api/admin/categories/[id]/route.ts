import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = getUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get current category
    const currentCategory = await prisma.itemCategory.findUnique({
      where: { id }
    })

    if (!currentCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, description, icon } = body

    // Update category - all categories can be edited
    const category = await prisma.itemCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon: icon || null }),
      }
    })

    return NextResponse.json({ category })
  } catch (error: any) {
    console.error('Error updating category:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = getUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if category exists
    const category = await prisma.itemCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { items: true }
        }
      }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Get transfer options from request body
    const body = await request.json().catch(() => ({}))
    const { transferTo, createNew, newName } = body

    let targetCategoryId = transferTo

    // If creating new category, create it first
    if (createNew && newName) {
      const newCategory = await prisma.itemCategory.create({
        data: { name: newName }
      })
      targetCategoryId = newCategory.id
    }

    // Transfer items to target category if transfer is requested
    if (category._count.items > 0 && targetCategoryId) {
      // Update all items to belong to the target category
      await prisma.item.updateMany({
        where: { categoryId: id },
        data: { categoryId: targetCategoryId }
      })
    } else if (category._count.items > 0 && !targetCategoryId) {
      // Force delete: Delete all related items and their relationships if no transfer
      // Get all items in this category
      const items = await prisma.item.findMany({
        where: { categoryId: id },
        include: {
          _count: {
            select: { listings: true, specifications: true }
          }
        }
      })

      // For each item, delete its listings, specifications, and item-company relationships
      for (const item of items) {
        // Delete all listings for this item
        if (item._count.listings > 0) {
          // Get all listing IDs
          const listings = await prisma.listing.findMany({
            where: { itemId: item.id },
            select: { id: true }
          })

          // Delete listing specifications first
          for (const listing of listings) {
            await prisma.listingSpecification.deleteMany({
              where: { listingId: listing.id }
            })
          }

          // Delete listings
          await prisma.listing.deleteMany({
            where: { itemId: item.id }
          })
        }

        // Delete specifications
        if (item._count.specifications > 0) {
          await prisma.specification.deleteMany({
            where: { itemId: item.id }
          })
        }

        // Delete item-company relationships
        await prisma.itemCompany.deleteMany({
          where: { itemId: item.id }
        })

        // Delete the item
        await prisma.item.delete({
          where: { id: item.id }
        })
      }
    }

    // Now delete the category
    await prisma.itemCategory.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: targetCategoryId 
        ? `Category deleted. ${category._count.items} item(s) transferred to target category.`
        : 'Category and all related data deleted successfully',
      deletedItems: targetCategoryId ? 0 : category._count.items,
      transferredItems: targetCategoryId ? category._count.items : 0
    })
  } catch (error: any) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

