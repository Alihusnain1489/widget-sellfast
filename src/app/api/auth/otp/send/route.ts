// src/app/api/otp/send/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import twilio from 'twilio'

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, email, type } = body

    // Validate input
    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Phone number or email is required', field: 'general' },
        { status: 400 }
      )
    }

    if (!type || !['signup', 'login', 'reset'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid OTP type', field: 'general' },
        { status: 400 }
      )
    }

    // Determine which identifier we're using
    const identifier = phone || email
    const identifierType: 'phone' | 'email' = phone ? 'phone' : 'email'

    // Validate format
    if (identifierType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(identifier)) {
        return NextResponse.json(
          { error: 'Invalid email format', field: 'email' },
          { status: 400 }
        )
      }
    } else {
      const phoneRegex = /^\+?[1-9]\d{9,14}$/
      if (!phoneRegex.test(identifier)) {
        return NextResponse.json(
          { error: 'Invalid phone number format. Use format: +1234567890', field: 'phone' },
          { status: 400 }
        )
      }
    }

    // Check user existence based on OTP type
    if (type === 'signup') {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            phone ? { phone } : { email: null },
            email ? { email } : { phone: null }
          ].filter(condition => Object.values(condition).some(v => v !== null))
        }
      })

      if (existingUser) {
        return NextResponse.json(
          { 
            error: `User with this ${identifierType} already exists`,
            suggestion: 'Try logging in instead',
            field: identifierType
          },
          { status: 400 }
        )
      }
    } else if (type === 'login' || type === 'reset') {
      const existingUser = await prisma.user.findFirst({
        where: phone ? { phone } : { email }
      })

      if (!existingUser) {
        return NextResponse.json(
          { 
            error: `No account found with this ${identifierType}`,
            suggestion: type === 'login' ? 'Try signing up instead' : 'Please check your details',
            field: identifierType
          },
          { status: 404 }
        )
      }
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Delete old unverified OTPs for this identifier
    await prisma.oTP.deleteMany({
      where: phone ? { phone } : { email },
    })

    // Create new OTP
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await prisma.oTP.create({
      data: {
        ...(phone ? { phone } : { email }),
        code,
        type,
        expiresAt,
        verified: false
      }
    })

    // Send OTP based on type
    if (identifierType === 'phone' && twilioClient) {
      try {
        await twilioClient.messages.create({
          body: `Your SellFast verification code is: ${code}. Valid for 10 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone
        })
        console.log(`✓ SMS sent to ${phone}`)
      } catch (twilioError: any) {
        console.error('Twilio error:', twilioError.message)
        // Continue anyway - OTP is saved in database
      }
    } else if (identifierType === 'email') {
      // TODO: Implement email sending
      console.log(`✓ OTP for email ${email}: ${code} (Email sending not implemented)`)
    }

    return NextResponse.json({
      message: `OTP sent to your ${identifierType}`,
      // Only return code in development for testing
      ...(process.env.NODE_ENV === 'development' && { code, expiresIn: '10 minutes' })
    })
  } catch (error: any) {
    console.error('Error sending OTP:', error)
    return NextResponse.json(
      { error: 'Failed to send OTP. Please try again.', field: 'general' },
      { status: 500 }
    )
  }
}