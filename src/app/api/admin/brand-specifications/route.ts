import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

// GET - Fetch brand specifications by companyId and optionally categoryId
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

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const categoryId = searchParams.get('categoryId')

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    const where: any = { companyId }
    if (categoryId) {
      where.categoryId = categoryId
    }

    const specs = await prisma.brandSpecification.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' }
      ],
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({ specifications: specs })
  } catch (error: any) {
    console.error('Error fetching brand specifications:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Create brand specification
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
    const { companyId, categoryId, name, valueType, options, icon, order, isRequired } = body

    if (!companyId || !name || !valueType) {
      return NextResponse.json(
        { error: 'Company ID, name, and value type are required' },
        { status: 400 }
      )
    }

    // Handle options - can be array or already stringified
    let optionsString: string | null = null
    if (options) {
      if (Array.isArray(options)) {
        optionsString = JSON.stringify(options)
      } else if (typeof options === 'string') {
        optionsString = options
      }
    }

    const specification = await prisma.brandSpecification.create({
      data: {
        companyId,
        categoryId: categoryId || null,
        name,
        valueType,
        options: optionsString,
        icon: icon || null,
        order: order !== undefined && order !== null ? Number(order) : null,
        isRequired: isRequired === true
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({ specification }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating brand specification:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Specification with this name already exists for this brand and category' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

