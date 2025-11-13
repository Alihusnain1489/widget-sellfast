import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateToken, hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, email, code, type = 'signup', name, username, password } = body

    if ((!phone && !email) || !code) {
      return NextResponse.json(
        { error: 'Phone/email and code are required' },
        { status: 400 }
      )
    }

    // Find valid OTP
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        ...(phone ? { phone } : { email }),
        code,
        type,
        expiresAt: {
          gt: new Date()
        },
        verified: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      )
    }

    // Mark OTP as verified
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { verified: true }
    })

    if (type === 'signup') {
      if (!name) {
        return NextResponse.json(
          { error: 'Name is required for signup' },
          { status: 400 }
        )
      }

      if (email && (!username || !password)) {
        return NextResponse.json(
          { error: 'Username and password are required for email signup' },
          { status: 400 }
        )
      }

      // Check if username already exists
      if (username) {
        const existingUsername = await prisma.user.findUnique({
          where: { username }
        })

        if (existingUsername) {
          return NextResponse.json(
            { error: 'Username already taken. Please choose another.' },
            { status: 400 }
          )
        }
      }

      // Check if user already exists
      if (phone) {
      const existingUser = await prisma.user.findUnique({
        where: { phone }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'User already exists with this phone number' },
          { status: 400 }
        )
      }
      }

      if (email) {
        const existingUser = await prisma.user.findUnique({
          where: { email }
        })

        if (existingUser) {
          return NextResponse.json(
            { error: 'User already exists with this email' },
            { status: 400 }
          )
        }
      }

      // Hash password if provided
      const hashedPassword = password ? await hashPassword(password) : null

      // Create new user
      const user = await prisma.user.create({
        data: {
          username: username || null,
          email: email || null,
          phone: phone || null,
          password: hashedPassword,
          name,
          provider: email ? 'credentials' : 'phone',
          emailVerified: email ? true : false,
          phoneVerified: phone ? true : false,
          role: 'USER',
          isActive: true,
          coins: 0
        }
      })

      const token = generateToken(user.id)

      return NextResponse.json({
        message: 'Account created successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          name: user.name,
          role: user.role
        },
        token
      })
    } else {
      // Login
      const user = phone 
        ? await prisma.user.findUnique({ where: { phone } })
        : await prisma.user.findUnique({ where: { email: email! } })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      const token = generateToken(user.id)

      return NextResponse.json({
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          name: user.name,
          role: user.role
        },
        token
      })
    }
  } catch (error: any) {
    console.error('Error verifying OTP:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Username, email, or phone already exists' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    )
  }
}
