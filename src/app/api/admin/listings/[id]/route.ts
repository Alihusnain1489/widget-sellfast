import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

// GET - Get single listing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
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
        }
      }
    })

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    return NextResponse.json({ listing })
  } catch (error) {
    console.error('Error fetching listing:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update listing status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses = ['PENDING', 'ACTIVE', 'SOLD', 'FAILED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: PENDING, ACTIVE, SOLD, FAILED' },
        { status: 400 }
      )
    }

    const listing = await prisma.listing.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        item: {
          include: {
            category: true
          }
        },
        company: true
      }
    })

    return NextResponse.json({ listing })
  } catch (error: any) {
    console.error('Error updating listing:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete listing
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if listing exists
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true
          }
        }
      }
    })

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    // Check if user is admin or owns the listing
    if (user.role !== 'ADMIN' && listing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own listings' },
        { status: 403 }
      )
    }

    // Delete related records first
    // Delete listing specifications
    await prisma.listingSpecification.deleteMany({
      where: { listingId: listing.id }
    })

    // Delete bids
    await prisma.bid.deleteMany({
      where: { listingId: listing.id }
    })

    // Delete deals
    await prisma.deal.deleteMany({
      where: { listingId: listing.id }
    })

    // Delete chats (if any)
    await prisma.chat.deleteMany({
      where: { listingId: listing.id }
    })

    // Now delete the listing
    await prisma.listing.delete({
      where: { id: listing.id }
    })

    return NextResponse.json({ message: 'Listing deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting listing:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
