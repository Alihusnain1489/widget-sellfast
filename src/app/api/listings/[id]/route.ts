import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

// DELETE - Delete listing (user can delete their own, admin can delete any)
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

    const { id } = await params

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
      where: { listingId: id }
    })

    // Delete bids
    await prisma.bid.deleteMany({
      where: { listingId: id }
    })

    // Delete deals
    await prisma.deal.deleteMany({
      where: { listingId: id }
    })

    // Delete chats (if any)
    await prisma.chat.deleteMany({
      where: { listingId: id }
    })

    // Now delete the listing
    await prisma.listing.delete({
      where: { id }
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

