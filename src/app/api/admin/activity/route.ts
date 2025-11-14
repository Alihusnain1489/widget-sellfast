import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const currentUser = getUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: currentUser.userId }
    })

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all activities
    const [bids, deals, chats, messages, coinTransactions] = await Promise.all([
      prisma.bid.findMany({
        include: {
          user: { select: { id: true, name: true } },
          listing: { select: { id: true, title: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.deal.findMany({
        include: {
          user: { select: { id: true, name: true } },
          listing: { select: { id: true, title: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.chat.findMany({
        include: {
          buyer: { select: { id: true, name: true } },
          seller: { select: { id: true, name: true } },
          listing: { select: { id: true, title: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.chatMessage.findMany({
        include: {
          sender: { select: { id: true, name: true } },
          chat: {
            include: {
              listing: { select: { id: true, title: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 200
      }),
      prisma.coinTransaction.findMany({
        include: {
          user: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      })
    ])

    // Format activities
    const activities: any[] = []

    bids.forEach(bid => {
      activities.push({
        type: 'BID',
        id: bid.id,
        userId: bid.userId,
        userName: bid.user.name,
        description: `${bid.user.name} placed an offer of $${bid.amount} on "${bid.listing.title}"`,
        timestamp: bid.createdAt,
        details: {
          amount: bid.amount,
          status: bid.status,
          listingTitle: bid.listing.title
        }
      })
    })

    deals.forEach(deal => {
      activities.push({
        type: 'DEAL',
        id: deal.id,
        userId: deal.buyerId,
        userName: deal.user.name,
        description: `Deal created: ${deal.user.name} bought "${deal.listing.title}" for $${deal.amount}`,
        timestamp: deal.createdAt,
        details: {
          amount: deal.amount,
          status: deal.status,
          isSuccess: deal.isSuccess
        }
      })
    })

    chats.forEach(chat => {
      activities.push({
        type: 'CHAT',
        id: chat.id,
        userId: chat.buyerId,
        userName: `${chat.buyer.name} & ${chat.seller.name}`,
        description: `Chat created between ${chat.buyer.name} and ${chat.seller.name} for "${chat.listing.title}"`,
        timestamp: chat.createdAt,
        details: {
          blocked: chat.blocked,
          blockReason: chat.blockReason
        }
      })
    })

    messages.forEach(msg => {
      activities.push({
        type: 'MESSAGE',
        id: msg.id,
        userId: msg.senderId,
        userName: msg.sender.name,
        description: `${msg.sender.name} sent a message${msg.isBlocked ? ' (BLOCKED)' : ''}`,
        timestamp: msg.createdAt,
        details: {
          isBlocked: msg.isBlocked,
          blockReason: msg.blockReason,
          isLocation: msg.isLocation,
          listingTitle: msg.chat.listing.title
        }
      })
    })

    coinTransactions.forEach(transaction => {
      activities.push({
        type: 'COIN_TRANSACTION',
        id: transaction.id,
        userId: transaction.userId,
        userName: transaction.user.name,
        description: `${transaction.user.name} ${transaction.amount > 0 ? 'recharged' : 'spent'} ${Math.abs(transaction.amount)} coins`,
        timestamp: transaction.createdAt,
        details: {
          amount: transaction.amount,
          type: transaction.type,
          paymentMethod: transaction.paymentMethod
        }
      })
    })

    // Sort by timestamp
    activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    return NextResponse.json({ activities: activities.slice(0, 500) })
  } catch (error: any) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

