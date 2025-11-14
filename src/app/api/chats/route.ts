import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const currentUser = getUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const chats = await prisma.chat.findMany({
      where: {
        OR: [
          { buyerId: currentUser.userId },
          { sellerId: currentUser.userId }
        ],
        blocked: false
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        listing: {
          select: {
            id: true,
            title: true
          }
        },
        deal: {
          select: {
            id: true,
            amount: true,
            status: true,
            isSuccess: true
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json({ chats })
  } catch (error: any) {
    console.error('Error fetching chats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

