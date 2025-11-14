import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    const currentUser = getUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId }
    })

    if (!user || user.role !== 'BUYER') {
      return NextResponse.json({ error: 'Only buyers can place offers' }, { status: 403 })
    }

    const body = await request.json()
    const { listingId, amount, message, coinsUsed } = body

    if (!listingId || !amount || !coinsUsed) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user has enough coins
    if (user.coins < coinsUsed) {
      return NextResponse.json(
        { error: 'Insufficient coins' },
        { status: 400 }
      )
    }

    // Check if listing exists and is active
    const listing = await prisma.listing.findUnique({
      where: { id: listingId }
    })

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    if (listing.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Listing is not active' },
        { status: 400 }
      )
    }

    // Check if user already has a pending bid on this listing
    const existingBid = await prisma.bid.findFirst({
      where: {
        userId: user.id,
        listingId: listingId,
        status: 'PENDING'
      }
    })

    if (existingBid) {
      return NextResponse.json(
        { error: 'You already have a pending offer on this listing' },
        { status: 400 }
      )
    }

    // Deduct coins and create bid
    const bid = await prisma.$transaction(async (tx) => {
      // Deduct coins
      await tx.user.update({
        where: { id: user.id },
        data: {
          coins: {
            decrement: coinsUsed
          }
        }
      })

      // Create coin transaction
      await tx.coinTransaction.create({
        data: {
          userId: user.id,
          amount: -coinsUsed,
          type: 'BID_PLACED',
          description: `Placed offer of $${amount} on listing ${listing.title}`,
          status: 'COMPLETED'
        }
      })

      // Create bid with 48-hour expiration
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 48)

      const newBid = await tx.bid.create({
        data: {
          userId: user.id,
          listingId: listingId,
          amount: parseFloat(amount),
          coinsUsed: coinsUsed,
          message: message || null,
          expiresAt: expiresAt,
          status: 'PENDING'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      return newBid
    })

    return NextResponse.json({ bid }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating bid:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const listingId = searchParams.get('listingId')
    const userId = searchParams.get('userId')

    const where: any = {}
    if (listingId) {
      where.listingId = listingId
    }
    if (userId) {
      where.userId = userId
    }

    const bids = await prisma.bid.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        },
        listing: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        amount: 'desc'
      }
    })

    return NextResponse.json({ bids })
  } catch (error: any) {
    console.error('Error fetching bids:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

