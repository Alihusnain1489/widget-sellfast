// src/app/api/auth/forgot-password/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, phone } = body

    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Email or phone number is required' },
        { status: 400 }
      )
    }

    const identifier = email || phone
    const identifierType: 'email' | 'phone' = email ? 'email' : 'phone'

    // Find user
    const user = await prisma.user.findFirst({
      where: { [identifierType]: identifier }
    })

    if (!user) {
      // Don't reveal if user exists for security
      return NextResponse.json(
        { message: 'If an account exists, you will receive reset instructions.' },
        { status: 200 }
      )
    }

    if (identifierType === 'email') {
      // Email method: Generate token and send email
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // Delete old reset tokens
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id }
      })

      // Create new reset token
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt
        }
      })

      // TODO: Send email with reset link
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`
      console.log('Password reset URL:', resetUrl)
      
      // In production, send email here:
      // await sendPasswordResetEmail(user.email, resetUrl)

      return NextResponse.json(
        { message: 'Password reset link sent to your email' },
        { status: 200 }
      )
    } else {
      // Phone method: Send OTP via existing OTP system
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          type: 'reset'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send OTP')
      }

      return NextResponse.json(
        { message: 'Verification code sent to your phone' },
        { status: 200 }
      )
    }
  } catch (error: any) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Failed to process request. Please try again.' },
      { status: 500 }
    )
  }
}