import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get bid with listing
    const bid = await prisma.bid.findUnique({
      where: { id },
      include: {
        listing: true,
        user: true
      }
    })

    if (!bid) {
      return NextResponse.json({ error: 'Bid not found' }, { status: 404 })
    }

    // Check if user is the listing owner
    if (bid.listing.userId !== currentUser.userId) {
      return NextResponse.json(
        { error: 'Only listing owner can accept offers' },
        { status: 403 }
      )
    }

    // Check if bid is still pending
    if (bid.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Bid is not pending' },
        { status: 400 }
      )
    }

    // Check if bid has expired (48 hours)
    if (bid.expiresAt && new Date() > bid.expiresAt) {
      // Mark as expired
      await prisma.bid.update({
        where: { id },
        data: { status: 'EXPIRED' }
      })
      return NextResponse.json(
        { error: 'This offer has expired' },
        { status: 400 }
      )
    }

    // Accept bid and create deal
    const result = await prisma.$transaction(async (tx) => {
      // Update bid status
      await tx.bid.update({
        where: { id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date()
        }
      })

      // Reject all other pending bids for this listing
      await tx.bid.updateMany({
        where: {
          listingId: bid.listingId,
          id: { not: id },
          status: 'PENDING'
        },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date()
        }
      })

      // Refund coins to rejected bidders
      const rejectedBids = await tx.bid.findMany({
        where: {
          listingId: bid.listingId,
          id: { not: id },
          status: 'REJECTED'
        }
      })

      for (const rejectedBid of rejectedBids) {
        await tx.user.update({
          where: { id: rejectedBid.userId },
          data: {
            coins: {
              increment: rejectedBid.coinsUsed
            }
          }
        })

        await tx.coinTransaction.create({
          data: {
            userId: rejectedBid.userId,
            amount: rejectedBid.coinsUsed,
            type: 'BID_REFUND',
            description: `Refund for rejected offer on listing ${bid.listing.title}`,
            status: 'COMPLETED'
          }
        })
      }

      // Create deal
      const deal = await tx.deal.create({
        data: {
          sellerId: bid.listing.userId,
          buyerId: bid.userId,
          listingId: bid.listingId,
          bidId: id,
          amount: bid.amount,
          status: 'IN_PROGRESS'
        }
      })

      // Create chat
      const chat = await tx.chat.create({
        data: {
          dealId: deal.id,
          buyerId: bid.userId,
          sellerId: bid.listing.userId,
          listingId: bid.listingId
        }
      })

      // Update listing status
      await tx.listing.update({
        where: { id: bid.listingId },
        data: { status: 'SOLD' }
      })

      return { deal, chat }
    })

    return NextResponse.json({
      success: true,
      deal: result.deal,
      chat: result.chat
    })
  } catch (error: any) {
    console.error('Error accepting bid:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

