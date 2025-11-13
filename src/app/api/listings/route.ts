import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')

    const where: any = {}
    if (status) {
      where.status = status
    }
    if (userId) {
      where.userId = userId
    }

    const listings = await prisma.listing.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        item: {
          include: {
            category: true
          }
        },
        company: true,
        specifications: {
          include: {
            specification: true
          }
        },
        bids: {
          select: {
            id: true,
            amount: true,
            userId: true,
            createdAt: true,
            status: true
          },
          orderBy: {
            amount: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Format listings with images from tempData
    const formattedListings = listings.map(listing => ({
      ...listing,
      category: listing.item.category,
      images: listing.tempData && typeof listing.tempData === 'object' && 'images' in listing.tempData
        ? (listing.tempData as any).images || []
        : []
    }))

    return NextResponse.json({ listings: formattedListings })
  } catch (error: any) {
    console.error('Error fetching listings:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

