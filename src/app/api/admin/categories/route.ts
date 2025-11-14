import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    console.log('Admin API: Fetching categories...')
    
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

    const categories = await prisma.itemCategory.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { items: true }
        }
      }
    })

    console.log(`Admin API: Found ${categories.length} categories`)

    return NextResponse.json({ categories })
  } catch (error: any) {
    console.error('Admin API Error fetching categories:', error?.message || error)
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
    const { name, description, icon } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Check if category already exists
    const existingCategory = await prisma.itemCategory.findUnique({
      where: { name }
    })

    if (existingCategory) {
      return NextResponse.json({ 
        category: existingCategory,
        conflict: true,
        conflictType: 'name',
        message: 'Category with this name already exists'
      }, { status: 409 })
    }

    const category = await prisma.itemCategory.create({
      data: {
        name,
        description: description || null,
        icon: icon || null,
      }
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating category:', error)
    if (error.code === 'P2002') {
      // Try to fetch existing category
      try {
        const body = await request.json().catch(() => ({}))
        if (body.name) {
          const existingCategory = await prisma.itemCategory.findUnique({
            where: { name: body.name }
          })
          if (existingCategory) {
            return NextResponse.json({ 
              category: existingCategory,
              conflict: true,
              message: 'Category already exists'
            }, { status: 409 })
          }
        }
      } catch (fetchError) {
        console.error('Error fetching existing category:', fetchError)
      }
      return NextResponse.json(
        { error: 'Category name already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

