import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    const currentUser = getUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount, paymentMethod } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Calculate coins (1$ = 10 coins)
    const coinsToAdd = Math.floor(amount * 10)

    // In a real application, you would integrate with a payment gateway here
    // For now, we'll simulate a successful payment
    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const result = await prisma.$transaction(async (tx) => {
      // Update user coins
      const updatedUser = await tx.user.update({
        where: { id: currentUser.userId },
        data: {
          coins: {
            increment: coinsToAdd
          }
        },
        select: { coins: true }
      })

      // Create coin transaction
      await tx.coinTransaction.create({
        data: {
          userId: currentUser.userId,
          amount: coinsToAdd,
          type: 'RECHARGE',
          description: `Recharged ${coinsToAdd} coins via ${paymentMethod}`,
          paymentMethod: paymentMethod,
          paymentId: paymentId,
          status: 'COMPLETED'
        }
      })

      return updatedUser
    })

    return NextResponse.json({
      success: true,
      coinsAdded: coinsToAdd,
      newBalance: result.coins
    })
  } catch (error: any) {
    console.error('Error recharging coins:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

