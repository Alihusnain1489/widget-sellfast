import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

// AI function to detect mobile numbers (simple regex for now)
function detectMobileNumber(text: string): boolean {
  // Patterns for mobile numbers (various formats)
  const patterns = [
    /\b\d{10}\b/, // 10 digits
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // US format
    /\b\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/, // International
    /\b\d{4}[-.\s]?\d{3}[-.\s]?\d{3}\b/, // Other formats
  ]
  
  return patterns.some(pattern => pattern.test(text))
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify user is part of this chat
    const chat = await prisma.chat.findFirst({
      where: {
        id,
        OR: [
          { buyerId: currentUser.userId },
          { sellerId: currentUser.userId }
        ]
      }
    })

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    const messages = await prisma.chatMessage.findMany({
      where: { chatId: id },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ messages })
  } catch (error: any) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const { message, latitude, longitude, isLocation } = body

    // Verify user is part of this chat
    const chat = await prisma.chat.findFirst({
      where: {
        id,
        OR: [
          { buyerId: currentUser.userId },
          { sellerId: currentUser.userId }
        ],
        blocked: false
      }
    })

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    let isBlocked = false
    let blockReason: string | null = null

    // AI monitoring: Check for mobile numbers in text messages
    if (!isLocation && message) {
      if (detectMobileNumber(message)) {
        isBlocked = true
        blockReason = 'Mobile number sharing is not allowed'
        
        // Block the chat
        await prisma.chat.update({
          where: { id },
          data: {
            blocked: true,
            blockReason: 'Mobile number sharing detected'
          }
        })
      }
    }

    const newMessage = await prisma.chatMessage.create({
      data: {
        chatId: id,
        senderId: currentUser.userId,
        message: isLocation ? null : message,
        latitude: latitude || null,
        longitude: longitude || null,
        isLocation: isLocation || false,
        isBlocked,
        blockReason
      }
    })

    // Update chat's updatedAt
    await prisma.chat.update({
      where: { id },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json({ message: newMessage }, { status: 201 })
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

