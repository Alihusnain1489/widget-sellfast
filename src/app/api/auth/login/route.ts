import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { comparePassword, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  console.log('\n=== Login API Called ===')
  
  try {
    // Parse request body
    let body
    try {
      body = await request.json()
      console.log('Request body received:', { email: body.email, hasPassword: !!body.password })
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { email, username, password } = body

    // Validate input
    if ((!email && !username) || !password) {
      console.log('Missing email/username or password')
      return NextResponse.json(
        { error: 'Email/username and password are required' },
        { status: 400 }
      )
    }

    const identifier = username || email
    console.log('Searching for user:', identifier)

    // Find user by username or email
    let user
    try {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: username || undefined },
            { email: email || undefined }
          ]
        },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          password: true,
          role: true,
          isActive: true,
          provider: true
        }
      })
      
      console.log('Database query result:', {
        found: !!user,
        hasPassword: user?.password ? 'yes' : 'no',
        isActive: user?.isActive,
        role: user?.role
      })
    } catch (dbError: any) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { 
          error: 'Database error', 
          details: process.env.NODE_ENV === 'development' ? dbError?.message : undefined 
        },
        { status: 500 }
      )
    }

    // Check if user exists
    if (!user) {
      console.log('User not found')
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if user has a password (not OAuth-only user)
    if (!user.password) {
      console.log('User has no password (OAuth user)')
      return NextResponse.json(
        { error: 'Please use social login for this account' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('User account is disabled')
      return NextResponse.json(
        { error: 'Account is disabled. Please contact support.' },
        { status: 403 }
      )
    }

    // Verify password
    console.log('Verifying password...')
    let isValidPassword: boolean
    try {
      isValidPassword = await comparePassword(password, user.password)
      console.log('Password verification result:', isValidPassword)
    } catch (compareError: any) {
      console.error('Password comparison error:', compareError)
      return NextResponse.json(
        { 
          error: 'Authentication error', 
          details: process.env.NODE_ENV === 'development' ? compareError?.message : undefined 
        },
        { status: 500 }
      )
    }

    if (!isValidPassword) {
      console.log('Invalid password')
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate token
    console.log('Generating token...')
    let token: string
    try {
      token = generateToken(user.id)
      console.log('Token generated successfully')
    } catch (tokenError: any) {
      console.error('Token generation error:', tokenError)
      return NextResponse.json(
        { error: 'Failed to generate authentication token' },
        { status: 500 }
      )
    }

    console.log('Login successful for:', email, 'Role:', user.role)

    // Prepare response data
    const userData = {
      id: user.id,
      username: user.username || null,
      email: user.email || null,
      name: user.name,
      role: user.role || 'USER'
    }

    // Create response
    const response = NextResponse.json({
      message: 'Login successful',
      user: userData,
      token
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    })

    // Set cookie
    try {
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      })
      console.log('Token cookie set successfully')
    } catch (cookieError: any) {
      console.error('Cookie setting error:', cookieError)
      // Continue anyway - client can use token from response body
    }

    console.log('=== Login API Complete ===\n')
    return response

  } catch (error: any) {
    console.error('\n=== Login API Error ===')
    console.error('Error:', error)
    console.error('Stack:', error?.stack)
    console.error('========================\n')
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}