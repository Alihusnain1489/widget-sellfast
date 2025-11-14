import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

// GET - Fetch all category specifications or by categoryId
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
    const categoryId = searchParams.get('categoryId')

    if (categoryId) {
      const specs = await prisma.categorySpecification.findMany({
        where: { categoryId },
        orderBy: [
          { order: 'asc' },
          { createdAt: 'asc' }
        ],
        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
      return NextResponse.json({ specifications: specs })
    }

    const allSpecs = await prisma.categorySpecification.findMany({
      orderBy: [
        { categoryId: 'asc' },
        { order: 'asc' },
        { createdAt: 'asc' }
      ],
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({ specifications: allSpecs })
  } catch (error: any) {
    console.error('Error fetching category specifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new category specification
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
    const { categoryId, name, valueType, options, icon, order, isRequired } = body

    if (!categoryId || !name || !valueType) {
      return NextResponse.json(
        { error: 'Category ID, name, and value type are required' },
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

    const specification = await prisma.categorySpecification.create({
      data: {
        categoryId,
        name,
        valueType,
        options: optionsString,
        icon: icon || null,
        order: order !== undefined && order !== null ? Number(order) : null,
        isRequired: isRequired === true
      },
      include: {
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
    console.error('Error creating category specification:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Specification with this name already exists for this category' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// PUT - Update multiple category specifications (bulk update)
export async function PUT(request: NextRequest) {
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
    const { categoryId, specifications } = body

    if (!categoryId || !Array.isArray(specifications)) {
      return NextResponse.json(
        { error: 'Category ID and specifications array are required' },
        { status: 400 }
      )
    }

    // Delete existing specifications for this category
    await prisma.categorySpecification.deleteMany({
      where: { categoryId }
    })

    // Create new specifications
    const createdSpecs = []
    for (const spec of specifications) {
      try {
        let optionsString: string | null = null
        if (spec.options !== null && spec.options !== undefined) {
          if (Array.isArray(spec.options)) {
            optionsString = JSON.stringify(spec.options)
          } else if (typeof spec.options === 'string') {
            // Check if it's already a valid JSON string
            try {
              JSON.parse(spec.options)
              optionsString = spec.options
            } catch {
              // If not valid JSON, treat as a single value
              optionsString = JSON.stringify([spec.options])
            }
          }
        }

        if (!spec.name || !spec.valueType) {
          console.error('Missing required fields:', spec)
          continue
        }

        const created = await prisma.categorySpecification.create({
          data: {
            categoryId,
            name: spec.name.trim(),
            valueType: spec.valueType || 'select',
            options: optionsString,
            icon: spec.icon || null,
            order: spec.order !== undefined && spec.order !== null ? Number(spec.order) : null,
            isRequired: spec.isRequired === true
          }
        })
        createdSpecs.push(created)
      } catch (specError: any) {
        console.error(`Error creating specification "${spec.name}":`, specError)
        // Continue with other specs even if one fails
        if (specError.code === 'P2002') {
          console.error(`Duplicate specification: ${spec.name}`)
        }
      }
    }

    if (createdSpecs.length === 0 && specifications.length > 0) {
      return NextResponse.json(
        { error: 'Failed to create any specifications. Check console for details.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ specifications: createdSpecs })
  } catch (error: any) {
    console.error('Error updating category specifications:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

