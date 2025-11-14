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
    const { name, icon, slug, origin, website, notes } = body

    // Check if name or slug conflicts with another brand
    if (name) {
      const existingByName = await prisma.company.findFirst({
        where: {
          name,
          NOT: { id }
        }
      })
      if (existingByName) {
        return NextResponse.json(
          { error: 'Brand with this name already exists', conflict: true },
          { status: 409 }
        )
      }
    }

    if (slug) {
      const existingBySlug = await prisma.company.findFirst({
        where: {
          slug,
          NOT: { id }
        }
      })
      if (existingBySlug) {
        return NextResponse.json(
          { error: 'Brand with this slug already exists', conflict: true },
          { status: 409 }
        )
      }
    }

    const company = await prisma.company.update({
      where: { id },
      data: { 
        ...(name !== undefined && { name }),
        ...(icon !== undefined && { icon: icon || null }),
        ...(slug !== undefined && { slug: slug || null }),
        ...(origin !== undefined && { origin: origin || null }),
        ...(website !== undefined && { website: website || null }),
        ...(notes !== undefined && { notes: notes || null })
      }
    })

    return NextResponse.json({ company })
  } catch (error: any) {
    console.error('Error updating brand:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      )
    }
    if (error.code === 'P2002') {
      const targetField = error.meta?.target?.[0]
      return NextResponse.json(
        { error: `Brand with this ${targetField} already exists`, conflict: true },
        { status: 409 }
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

    // Check if brand has items or listings
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: { items: true, listings: true }
        }
      }
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      )
    }

    // Get transfer options from request body
    const body = await request.json().catch(() => ({}))
    const { transferTo, createNew, newName } = body

    let targetBrandId = transferTo

    // If creating new brand, create it first
    if (createNew && newName) {
      const newBrand = await prisma.company.create({
        data: { name: newName }
      })
      targetBrandId = newBrand.id
    }

    // Transfer listings to target brand if transfer is requested
    if (company._count.listings > 0 && targetBrandId) {
      // Update all listings to belong to the target brand
      await prisma.listing.updateMany({
        where: { companyId: id },
        data: { companyId: targetBrandId }
      })
    } else if (company._count.listings > 0 && !targetBrandId) {
      // Force delete: Delete all related listings and item-company relationships if no transfer
      // Delete all listings for this brand
      // Get all listing IDs
      const listings = await prisma.listing.findMany({
        where: { companyId: id },
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
        where: { companyId: id }
      })
    }

    // Delete item-company relationships for this brand
    await prisma.itemCompany.deleteMany({
      where: { companyId: id }
    })

    // Now delete the brand
    await prisma.company.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: targetBrandId
        ? `Brand deleted. ${company._count.listings || 0} listing(s) transferred to target brand.`
        : 'Brand and all related data deleted successfully',
      deletedListings: targetBrandId ? 0 : (company._count.listings || 0),
      transferredListings: targetBrandId ? (company._count.listings || 0) : 0
    })
  } catch (error: any) {
    console.error('Error deleting brand:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

