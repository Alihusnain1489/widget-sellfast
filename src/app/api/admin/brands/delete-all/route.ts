import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

export async function DELETE(request: NextRequest) {
  try {
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

    // Get all brands with their counts
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: { items: true, listings: true }
        }
      }
    })

    const totalListings = companies.reduce((sum, c) => sum + (c._count.listings || 0), 0)
    const totalItems = companies.reduce((sum, c) => sum + (c._count.items || 0), 0)

    // Delete all listings and their related data
    if (totalListings > 0) {
      // Get all listing IDs
      const listings = await prisma.listing.findMany({
        where: {
          companyId: {
            in: companies.map(c => c.id)
          }
        },
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
        where: {
          companyId: {
            in: companies.map(c => c.id)
          }
        }
      })
    }

    // Delete item-company relationships
    await prisma.itemCompany.deleteMany({
      where: {
        companyId: {
          in: companies.map(c => c.id)
        }
      }
    })

    // Delete all brands
    await prisma.company.deleteMany({})

    return NextResponse.json({ 
      message: `All brands deleted successfully. ${companies.length} brand(s), ${totalListings} listing(s), and ${totalItems} item relationship(s) were removed.`,
      deletedBrands: companies.length,
      deletedListings: totalListings,
      deletedItemRelationships: totalItems
    })
  } catch (error: any) {
    console.error('Error deleting all brands:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

