import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    console.log('Admin API: Fetching specifications...')
    
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

    const itemId = request.nextUrl.searchParams.get('itemId')
    const categoryId = request.nextUrl.searchParams.get('categoryId')

    // Fetch item-based specifications
    const itemWhere: any = {}
    if (itemId) {
      itemWhere.itemId = itemId
    }

    const itemSpecs = await prisma.specification.findMany({
      where: itemWhere,
      include: {
        item: {
          include: {
            category: true,
            companies: {
              include: {
                company: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Fetch category-based specifications
    const categoryWhere: any = {}
    if (categoryId) {
      categoryWhere.categoryId = categoryId
    }

    const categorySpecs = await prisma.categorySpecification.findMany({
      where: categoryWhere,
      include: {
        category: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Combine and format specifications
    const specifications = [
      ...itemSpecs.map(spec => ({
        ...spec,
        type: 'item' as const
      })),
      ...categorySpecs.map(spec => ({
        ...spec,
        type: 'category' as const,
        item: null
      }))
    ]

    console.log(`Admin API: Found ${specifications.length} specifications (${itemSpecs.length} item, ${categorySpecs.length} category)`)

    return NextResponse.json({ specifications })
  } catch (error: any) {
    console.error('Admin API Error fetching specifications:', error?.message || error)
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
  let type: string | undefined // Declare outside try block
  
  try {
    // Use the same authentication pattern as GET
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
    const { name, valueType, options, itemId, categoryId, icon, order, isRequired } = body
    type = body.type // Assign to outer variable

    // Validate required fields
    if (!name || !valueType) {
      return NextResponse.json(
        { error: 'Name and value type are required' },
        { status: 400 }
      )
    }

    if (type === 'item' && !itemId) {
      return NextResponse.json(
        { error: 'Item is required for item specifications' },
        { status: 400 }
      )
    }

    if (type === 'category' && !categoryId) {
      return NextResponse.json(
        { error: 'Category is required for category specifications' },
        { status: 400 }
      )
    }

    // Parse options if it's a string
    let parsedOptions = options
    if (typeof options === 'string' && options.trim()) {
      try {
        parsedOptions = JSON.parse(options)
      } catch (e) {
        // If it's not valid JSON, treat as array
        parsedOptions = options.split(',').map((opt: string) => opt.trim()).filter(Boolean)
      }
    }

    if (type === 'category') {
      // Create category specification
      const specification = await prisma.categorySpecification.create({
        data: {
          name,
          valueType,
          options: parsedOptions ? JSON.stringify(parsedOptions) : null,
          categoryId,
          icon: icon || null,
          order: order || 0,
          isRequired: isRequired || false
        },
        include: {
          category: true
        }
      })

      return NextResponse.json({ 
        specification: {
          ...specification,
          type: 'category',
          item: null
        }
      }, { status: 201 })
    } else {
      // Create item specification
      const specification = await prisma.specification.create({
        data: {
          name,
          valueType,
          options: parsedOptions ? JSON.stringify(parsedOptions) : null,
          itemId,
          icon: icon || null,
          order: order || 0
        },
        include: {
          item: {
            include: {
              category: true
            }
          }
        }
      })

      return NextResponse.json({ 
        specification: {
          ...specification,
          type: 'item'
        }
      }, { status: 201 })
    }
  } catch (error: any) {
    console.error('Error creating specification:', error)
    if (error.code === 'P2002') {
      const errorMsg = type === 'category'
        ? 'Specification with this name already exists for this category'
        : 'Specification with this name already exists for this item'
      return NextResponse.json(
        { error: errorMsg },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create specification' },
      { status: 500 }
    )
  }
}
