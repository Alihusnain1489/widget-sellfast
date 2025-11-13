import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import twilio from 'twilio'

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, email, type = 'signup' } = body

    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Phone number or email is required' },
        { status: 400 }
      )
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Check if user exists for login
    if (type === 'login') {
      if (phone) {
      const user = await prisma.user.findUnique({
        where: { phone }
      })

      if (!user) {
        return NextResponse.json(
          { error: 'No account found with this phone number' },
          { status: 404 }
        )
        }
      } else if (email) {
        const user = await prisma.user.findUnique({
          where: { email }
        })

        if (!user) {
          return NextResponse.json(
            { error: 'No account found with this email' },
            { status: 404 }
          )
        }
      }
    }

    // Store OTP in database
    await prisma.oTP.create({
      data: {
        phone: phone || null,
        email: email || null,
        code,
        type,
        expiresAt,
      }
    })

    // Send SMS (in production, uncomment this)
    if (phone) {
    // await client.messages.create({
    //   body: `Your SellFast verification code is: ${code}`,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phone
    // })
    }

    // Send Email OTP (in production, implement email service)
    if (email) {
      // TODO: Implement email sending service
      // await sendEmailOTP(email, code)
      console.log(`Email OTP for ${email}: ${code}`)
    }

    // For development, return the code
    return NextResponse.json({
      message: 'OTP sent successfully',
      code: process.env.NODE_ENV === 'development' ? code : undefined
    })
  } catch (error) {
    console.error('Error sending OTP:', error)
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    )
  }
}
