import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, username, phone, otpCode, action } = body

    // Action: 'send-otp' or 'verify-and-create'
    if (action === 'send-otp') {
      // Step 1: Validate and send OTP
      if (!email || !password || !name) {
        return NextResponse.json(
          { 
            error: 'Missing required fields. Please provide name, email, and password.',
            field: 'general'
          },
          { status: 400 }
        )
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { 
            error: 'Invalid email format',
            field: 'email'
          },
          { status: 400 }
        )
      }

      // Validate password length
      if (password.length < 6) {
        return NextResponse.json(
          { 
            error: 'Password must be at least 6 characters long',
            field: 'password'
          },
          { status: 400 }
        )
      }

      // Validate username format if provided
      if (username) {
        const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
        if (!usernameRegex.test(username)) {
          return NextResponse.json(
            { 
              error: 'Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens',
              field: 'username'
            },
            { status: 400 }
          )
        }

        // Check if username already exists
        const existingUsername = await prisma.user.findUnique({
          where: { username }
        })

        if (existingUsername) {
          return NextResponse.json(
            { 
              error: 'Username already taken',
              field: 'username',
              suggestion: 'Please choose another username.'
            },
            { status: 400 }
          )
        }
      }

      // Check if user with email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return NextResponse.json(
          { 
            error: 'User with this email already exists',
            field: 'email',
            suggestion: 'Please use a different email or try logging in.'
          },
          { status: 400 }
        )
      }

      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      // Delete old OTPs for this email
      await prisma.oTP.deleteMany({
        where: { email }
      })

      // Store OTP in database
      await prisma.oTP.create({
        data: {
          email,
          code,
          type: 'signup',
          expiresAt,
        }
      })

      // TODO: Send email OTP (implement email service)
      console.log(`Email OTP for ${email}: ${code}`)

      return NextResponse.json({
        message: 'OTP sent successfully',
        code: process.env.NODE_ENV === 'development' ? code : undefined
      })
    } else if (action === 'verify-and-create') {
      // Step 2: Verify OTP and create account
      if (!email || !password || !name || !otpCode) {
        return NextResponse.json(
          { 
            error: 'Missing required fields',
            field: 'general'
          },
          { status: 400 }
        )
      }

      // Find valid OTP
      const otpRecord = await prisma.oTP.findFirst({
        where: {
          email,
          code: otpCode,
          type: 'signup',
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
          { 
            error: 'Invalid or expired OTP',
            field: 'otp'
          },
          { status: 400 }
        )
      }

      // Mark OTP as verified
      await prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { verified: true }
      })

      // Check if username already exists (double check)
      if (username) {
        const existingUsername = await prisma.user.findUnique({
          where: { username }
        })

        if (existingUsername) {
          return NextResponse.json(
            { 
              error: 'Username already taken',
              field: 'username',
              suggestion: 'Please choose another username.'
            },
            { status: 400 }
          )
        }
      }

      // Check if user already exists (double check)
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return NextResponse.json(
          { 
            error: 'User with this email already exists',
            field: 'email'
          },
          { status: 400 }
        )
      }

      // Hash password
      const hashedPassword = await hashPassword(password)

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          username: username || null,
          phone: phone || null,
          password: hashedPassword,
          name,
          provider: 'credentials',
          emailVerified: true, // Verified via OTP
          phoneVerified: false,
          role: 'USER',
          isActive: true,
          coins: 0
        },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          image: true
        }
      })

      return NextResponse.json(
        { 
          message: 'User created successfully', 
          userId: user.id,
          user: user
        },
        { status: 201 }
      )
    } else {
      return NextResponse.json(
        { 
          error: 'Invalid action. Use "send-otp" or "verify-and-create"',
          field: 'general'
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Signup error:', error)
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'general'
      let errorMessage = 'This value already exists'
      
      if (field === 'email') {
        errorMessage = 'User with this email already exists'
      } else if (field === 'username') {
        errorMessage = 'Username already taken'
      } else if (field === 'phone') {
        errorMessage = 'Phone number already registered'
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          field: field
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error. Please try again later.',
        field: 'general'
      },
      { status: 500 }
    )
  }
}

