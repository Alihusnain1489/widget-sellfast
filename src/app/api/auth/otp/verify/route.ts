// src/app/api/otp/verify/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, email, code, type, name, username } = body

    // Validate input
    if (!code) {
      return NextResponse.json(
        { error: 'OTP code is required', field: 'otp' },
        { status: 400 }
      )
    }

    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Phone number or email is required', field: 'general' },
        { status: 400 }
      )
    }

    const identifier = phone || email
    const identifierType: 'phone' | 'email' = phone ? 'phone' : 'email'

    // Find the OTP
    const otp = await prisma.oTP.findFirst({
      where: {
        ...(phone ? { phone } : { email }),
        code,
        verified: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!otp) {
      return NextResponse.json(
        { error: 'Invalid OTP code', field: 'otp' },
        { status: 400 }
      )
    }

    // Check if OTP has expired
    if (new Date() > otp.expiresAt) {
      await prisma.oTP.delete({ where: { id: otp.id } })
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.', field: 'otp' },
        { status: 400 }
      )
    }

    // Mark OTP as verified
    await prisma.oTP.update({
      where: { id: otp.id },
      data: { verified: true },
    })

    // Handle different OTP types
    if (type === 'signup') {
      // Validate required fields for signup
      if (!name) {
        return NextResponse.json(
          { error: 'Name is required for signup', field: 'name' },
          { status: 400 }
        )
      }

      // Check if user already exists (double-check)
      const existingUser = await prisma.user.findFirst({
        where: phone ? { phone } : { email }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'User already exists', field: 'general' },
          { status: 400 }
        )
      }

      // Create user account
      const user = await prisma.user.create({
        data: {
          ...(phone ? { phone } : { email }),
          name,
          username: username || undefined,
          provider: identifierType,
          emailVerified: identifierType === 'email',
          phoneVerified: identifierType === 'phone',
          role: 'USER',
          isActive: true,
          coins: 0,
        },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          username: true,
          role: true,
          image: true,
          emailVerified: true,
          phoneVerified: true,
        }
      })

      // Clean up used OTP
      await prisma.oTP.deleteMany({
        where: phone ? { phone } : { email }
      })

      return NextResponse.json(
        { 
          message: 'Account created successfully',
          user,
          success: true
        },
        { status: 201 }
      )

    } else if (type === 'login') {
      // Find user
      const user = await prisma.user.findFirst({
        where: phone ? { phone } : { email },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          username: true,
          role: true,
          image: true,
          isActive: true,
          emailVerified: true,
          phoneVerified: true,
        }
      })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found', field: 'general' },
          { status: 404 }
        )
      }

      if (!user.isActive) {
        return NextResponse.json(
          { error: 'Account is deactivated. Please contact support.', field: 'general' },
          { status: 403 }
        )
      }

      // Update verification status if not already verified
      if ((identifierType === 'email' && !user.emailVerified) || 
          (identifierType === 'phone' && !user.phoneVerified)) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            [identifierType === 'email' ? 'emailVerified' : 'phoneVerified']: true
          }
        })
      }

      // Clean up used OTP
      await prisma.oTP.deleteMany({
        where: phone ? { phone } : { email }
      })

      return NextResponse.json(
        { 
          message: 'Login successful',
          user,
          success: true
        },
        { status: 200 }
      )

    } else if (type === 'reset') {
      // Find user for password reset
      const user = await prisma.user.findFirst({
        where: phone ? { phone } : { email }
      })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found', field: 'general' },
          { status: 404 }
        )
      }

      // Don't delete OTP yet - will be deleted after password is reset
      return NextResponse.json(
        { 
          message: 'OTP verified. You can now reset your password.',
          userId: user.id,
          verified: true,
          success: true
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { error: 'Invalid OTP type', field: 'general' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('Error verifying OTP:', error)
    
    return NextResponse.json(
      { error: 'Failed to verify OTP. Please try again.', field: 'general' },
      { status: 500 }
    )
  }
}