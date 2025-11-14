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

    const body = await request.json()
    const { name, valueType, options, icon, type } = body

    // Determine if it's an item or category specification
    const itemSpec = await prisma.specification.findUnique({ where: { id } })
    const categorySpec = await prisma.categorySpecification.findUnique({ where: { id } })

    if (!itemSpec && !categorySpec) {
      return NextResponse.json(
        { error: 'Specification not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (name) updateData.name = name
    if (valueType) updateData.valueType = valueType
    if (options !== undefined) {
      // Parse options if it's a string
      let parsedOptions = options
      if (typeof options === 'string' && options.trim()) {
        try {
          parsedOptions = JSON.parse(options)
        } catch (e) {
          parsedOptions = options.split(',').map((opt: string) => opt.trim()).filter(Boolean)
        }
      }
      updateData.options = parsedOptions ? JSON.stringify(parsedOptions) : null
    }
    if (icon !== undefined) updateData.icon = icon || null

    if (itemSpec) {
      // Update item specification
      const specification = await prisma.specification.update({
        where: { id },
        data: updateData,
        include: {
          item: {
            include: {
              category: true
            }
          }
        }
      })
      return NextResponse.json({ 
        specification: {
          ...specification,
          type: 'item'
        }
      })
    } else {
      // Update category specification
      const specification = await prisma.categorySpecification.update({
        where: { id },
        data: updateData,
        include: {
          category: true
        }
      })
      return NextResponse.json({ 
        specification: {
          ...specification,
          type: 'category',
          item: null
        }
      })
    }
  } catch (error: any) {
    console.error('Error updating specification:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Specification not found' },
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

    // Check if it's an item or category specification
    const itemSpec = await prisma.specification.findUnique({
      where: { id },
      include: {
        item: true,
        _count: {
          select: { listings: true }
        }
      }
    })

    const categorySpec = await prisma.categorySpecification.findUnique({
      where: { id }
    })

    if (!itemSpec && !categorySpec) {
      return NextResponse.json(
        { error: 'Specification not found' },
        { status: 404 }
      )
    }

    // Get transfer options from request body
    const body = await request.json().catch(() => ({}))
    const { transferTo } = body

    if (itemSpec) {
      // Handle item specification deletion
      let targetSpecId = transferTo

      // Transfer listing specifications to target specification if transfer is requested
      if (itemSpec._count.listings > 0 && targetSpecId) {
        // Update all listing specifications to use the target specification
        await prisma.listingSpecification.updateMany({
          where: { specificationId: id },
          data: { specificationId: targetSpecId }
        })
      } else if (itemSpec._count.listings > 0 && !targetSpecId) {
        // Force delete: Delete all related listing specifications if no transfer
        await prisma.listingSpecification.deleteMany({
          where: { specificationId: id }
        })
      }

      // Now delete the specification
      await prisma.specification.delete({
        where: { id }
      })

      return NextResponse.json({ 
        message: targetSpecId
          ? `Specification deleted. ${itemSpec._count.listings || 0} listing value(s) transferred to target specification.`
          : 'Specification and all related data deleted successfully',
        deletedListings: targetSpecId ? 0 : (itemSpec._count.listings || 0),
        transferredListings: targetSpecId ? (itemSpec._count.listings || 0) : 0
      })
    } else {
      // Handle category specification deletion (no listings to transfer)
      await prisma.categorySpecification.delete({
        where: { id }
      })

      return NextResponse.json({ 
        message: 'Category specification deleted successfully'
      })
    }
  } catch (error: any) {
    console.error('Error deleting specification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

