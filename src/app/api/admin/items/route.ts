import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    console.log('Admin API: Fetching items...')
    
    const currentUser = getUser(request)
    if (!currentUser) {
      console.error('Admin API: Unauthorized - no user token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId }
    })

    if (!user || user.role !== 'ADMIN') {
      console.error('Admin API: Forbidden - user is not admin', { userId: currentUser.userId, role: user?.role })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('Admin API: User authenticated as admin')

    const items = await prisma.item.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        companies: {
          include: {
            company: true
          }
        },
        _count: {
          select: { specifications: true, listings: true }
        }
      }
    })

    console.log(`Admin API: Found ${items.length} items`)

    return NextResponse.json({ items })
  } catch (error: any) {
    console.error('Admin API Error fetching items:', error?.message || error)
    console.error('Error stack:', error?.stack)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
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
    const { name, categoryId, companyIds, icon } = body

    if (!name || !categoryId) {
      return NextResponse.json(
        { error: 'Item name and category are required' },
        { status: 400 }
      )
    }

    // Check if item already exists
    const existingItem = await prisma.item.findUnique({
      where: { name },
      include: {
        category: true,
        companies: {
          include: {
            company: true
          }
        }
      }
    })

    if (existingItem) {
      return NextResponse.json({ 
        item: existingItem,
        conflict: true,
        conflictType: 'name',
        message: 'Item with this name already exists'
      }, { status: 409 })
    }

    // Create item
    const item = await prisma.item.create({
      data: {
        name,
        categoryId,
        icon: icon || null,
        companies: {
          create: (companyIds || []).map((companyId: string) => ({
            companyId
          }))
        }
      },
      include: {
        category: true,
        companies: {
          include: {
            company: true
          }
        }
      }
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating item:', error)
    if (error.code === 'P2002') {
      // Try to fetch existing item
      try {
        const body = await request.json().catch(() => ({}))
        if (body.name) {
          const existingItem = await prisma.item.findUnique({
            where: { name: body.name },
            include: {
              category: true,
              companies: {
                include: {
                  company: true
                }
              }
            }
          })
          if (existingItem) {
            return NextResponse.json({ 
              item: existingItem,
              conflict: true,
              message: 'Item already exists'
            }, { status: 409 })
          }
        }
      } catch (fetchError) {
        console.error('Error fetching existing item:', fetchError)
      }
      return NextResponse.json(
        { error: 'Item name already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

