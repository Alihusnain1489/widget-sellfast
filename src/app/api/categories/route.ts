import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    console.log('API: Fetching categories...')
    console.log('DATABASE_URL:', process.env.DATABASE_URL)
    
    // Check database connection
    if (!prisma) {
      console.error('Database client not initialized')
      return NextResponse.json(
        { error: 'Database connection failed', categories: [] },
        { status: 500 }
      )
    }

    // Test database connection
    try {
      await prisma.$connect()
      console.log('Database connected')
    } catch (connError: any) {
      console.error('Database connection error:', connError?.message)
      throw new Error(`Database connection failed: ${connError?.message}`)
    }

    // Fetch categories - Use ItemCategory (correct model name from Prisma schema)
    const categories = await prisma.itemCategory.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
      },
    })

    console.log(`API: Found ${categories.length} categories`)

    return NextResponse.json(
      { 
        categories,
        count: categories.length 
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
        },
      }
    )
  } catch (error: any) {
    console.error('❌ API Error in /api/categories:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    })

    return NextResponse.json(
      { 
        error: error?.message || 'Failed to fetch categories',
        categories: [],
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}