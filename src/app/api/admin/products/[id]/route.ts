import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

export async function GET(
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

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        category: true,
        companies: {
          include: {
            company: true
          }
        },
        specifications: {
          orderBy: { name: 'asc' }
        }
      }
    })

    if (!item) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ item })
  } catch (error: any) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const { 
      name, 
      categoryId, 
      companyId, 
      icon,
      selectedSpecs,
      specValues 
    } = body

    // Update item
    const item = await prisma.item.update({
      where: { id },
      data: {
        name: name || undefined,
        categoryId: categoryId || undefined,
        icon: icon !== undefined ? icon : undefined,
        companies: companyId ? {
          deleteMany: {},
          create: {
            companyId
          }
        } : undefined
      },
      include: {
        category: true,
        companies: {
          include: {
            company: true
          }
        },
        specifications: true
      }
    })

    // Handle specifications
    if (selectedSpecs && selectedSpecs.length > 0) {
      // Delete existing specifications for this item
      await prisma.specification.deleteMany({
        where: { itemId: item.id }
      })

      // Create new specifications
      for (const spec of selectedSpecs) {
        const specData: any = {
          name: spec.name,
          valueType: spec.valueType || 'text',
          itemId: item.id,
          icon: spec.icon || null,
          options: null
        }

        // Use selected values from specValues if available, otherwise use spec.options
        const selectedValues = specValues && specValues[spec.name] ? specValues[spec.name] : null
        
        if (selectedValues && Array.isArray(selectedValues) && selectedValues.length > 0) {
          // Use the selected values as options
          specData.options = JSON.stringify(selectedValues)
        } else if (spec.options && spec.options.length > 0) {
          // Fallback to spec.options if no values were selected
          if (Array.isArray(spec.options)) {
            specData.options = JSON.stringify(spec.options)
          } else if (typeof spec.options === 'string') {
            specData.options = spec.options
          }
        }

        await prisma.specification.create({
          data: specData
        })
      }
    }

    return NextResponse.json({ item })
  } catch (error: any) {
    console.error('Error updating product:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      meta: error?.meta
    })
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message || 'Unknown error' },
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

    // Check if item has listings
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        _count: {
          select: { listings: true, specifications: true }
        }
      }
    })

    if (!item) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (item._count.listings > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete product with existing listings',
          hasListings: true,
          listingCount: item._count.listings
        },
        { status: 400 }
      )
    }

    // Delete specifications first
    await prisma.specification.deleteMany({
      where: { itemId: id }
    })

    // Delete item companies
    await prisma.itemCompany.deleteMany({
      where: { itemId: id }
    })

    // Delete item
    await prisma.item.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

