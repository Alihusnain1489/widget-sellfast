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
    const body = await request.json()
    const { isSuccess } = body

    if (typeof isSuccess !== 'boolean') {
      return NextResponse.json(
        { error: 'isSuccess must be a boolean' },
        { status: 400 }
      )
    }

    // Get deal
    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        listing: true
      }
    })

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Check if user is part of this deal
    if (deal.buyerId !== currentUser.userId && deal.sellerId !== currentUser.userId) {
      return NextResponse.json(
        { error: 'You are not part of this deal' },
        { status: 403 }
      )
    }

    // Update deal
    const updatedDeal = await prisma.deal.update({
      where: { id },
      data: {
        isSuccess,
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })

    return NextResponse.json({ deal: updatedDeal })
  } catch (error: any) {
    console.error('Error completing deal:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

