import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const status = request.nextUrl.searchParams.get('status')

    let where: any = { userId: user.userId }
    if (status) {
      where.status = status
    }

    const listings = await prisma.listing.findMany({
      where,
      include: {
        item: {
          include: {
            category: true
          }
        },
        company: true,
        specifications: {
          include: {
            specification: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ listings })
  } catch (error: any) {
    console.error('Error fetching listings:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

