import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const currentUser = getUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      include: {
        customRole: true,
        _count: {
          select: {
            listings: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = getUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email, username, password, name, role, customRoleId, isActive } = body

    if ((!email && !username) || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields. Email or username, password, and name are required.' },
        { status: 400 }
      )
    }

    // Validate username format if provided
    if (username) {
      const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
      if (!usernameRegex.test(username)) {
        return NextResponse.json(
          { error: 'Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens' },
          { status: 400 }
        )
      }
    }

    const bcrypt = await import('bcryptjs')
    const hashedPassword = await bcrypt.default.hash(password, 10)

    // Check if user with email or username already exists
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email }
      })

      if (existingEmail) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        )
      }
    }

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

    const newUser = await prisma.user.create({
      data: {
        email: email || null,
        username: username || null,
        password: hashedPassword,
        name,
        role: role || 'USER',
        customRoleId: customRoleId || null,
        isActive: isActive !== undefined ? isActive : true,
        provider: 'credentials',
        emailVerified: false,
        phoneVerified: false,
        coins: 0
      }
    })

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating user:', error)
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    )
  }
}

