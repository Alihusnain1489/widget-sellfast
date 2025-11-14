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

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const companyId = searchParams.get('companyId')

    const where: any = {}
    if (categoryId) {
      where.categoryId = categoryId
    }
    if (companyId) {
      where.companies = {
        some: {
          companyId
        }
      }
    }

    const items = await prisma.item.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        companies: {
          include: {
            company: true
          }
        },
        specifications: {
          include: {
            _count: {
              select: { listings: true }
            }
          }
        },
        _count: {
          select: { listings: true }
        }
      }
    })

    return NextResponse.json({ items })
  } catch (error: any) {
    console.error('Error fetching products:', error)
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
    console.log('POST /api/admin/products - Request body:', JSON.stringify(body, null, 2))
    
    const { 
      name, 
      categoryId, 
      companyId, 
      icon,
      selectedSpecs,
      specValues,
      overwrite,
      existingItemId
    } = body

    if (!name || !categoryId || !companyId) {
      return NextResponse.json(
        { error: 'Product name, category, and brand are required' },
        { status: 400 }
      )
    }

    // Check if item with same name exists
    const existingItem = await prisma.item.findUnique({
      where: { name },
      include: {
        category: true,
        companies: {
          include: {
            company: true
          }
        },
        specifications: true
      }
    })

    let item
    if (existingItem) {
      // If overwrite flag is set, update the existing item
      if (overwrite && existingItemId) {
        // Update existing item with new data
        item = await prisma.item.update({
          where: { id: existingItemId },
          data: {
            categoryId,
            icon: icon || null,
            companies: {
              deleteMany: {},
              create: {
                companyId
              }
            }
          },
          include: {
            category: true,
            companies: {
              include: {
                company: true
              }
            },
            specifications: true
          }
        })
      } else {
        // Return conflict response
        return NextResponse.json({ 
          item: existingItem,
          conflict: true,
          conflictType: 'name',
          message: 'Product with this name already exists'
        }, { status: 409 })
      }
    } else {
      // Create new item
      item = await prisma.item.create({
        data: {
          name,
          categoryId,
          icon: icon || null,
          companies: {
            create: {
              companyId
            }
          }
        },
        include: {
          category: true,
          companies: {
            include: {
              company: true
            }
          },
          specifications: true
        }
      })
    }
    
    console.log('Item created/updated:', item.id)

    // Handle specifications
    if (selectedSpecs && selectedSpecs.length > 0) {
      console.log(`Creating ${selectedSpecs.length} specifications for item ${item.id}`)
      
      // Delete existing specifications for this item
      await prisma.specification.deleteMany({
        where: { itemId: item.id }
      })

      // Sort specs by order before creating
      const sortedSpecs = [...selectedSpecs].sort((a: any, b: any) => {
        const orderA = a.order !== undefined && a.order !== null ? Number(a.order) : 999
        const orderB = b.order !== undefined && b.order !== null ? Number(b.order) : 999
        return orderA - orderB
      })

      // Create new specifications with values in order
      for (const spec of sortedSpecs) {
        try {
          const specData: any = {
            name: spec.name,
            valueType: spec.valueType || 'select',
            itemId: item.id,
            icon: spec.icon || null,
            options: null // Default to null, will be set if options exist
          }

          // Only add order if it's a valid number
          if (spec.order !== undefined && spec.order !== null && !isNaN(Number(spec.order))) {
            specData.order = Number(spec.order)
          }

          // Use selected values from specValues if available, otherwise use spec.options
          const selectedValues = specValues && specValues[spec.name] ? specValues[spec.name] : null
          
          if (selectedValues && Array.isArray(selectedValues) && selectedValues.length > 0) {
            // Use the selected values as options
            specData.options = JSON.stringify(selectedValues)
          } else if (spec.options) {
            // Fallback to spec.options if no values were selected
            if (Array.isArray(spec.options)) {
              specData.options = JSON.stringify(spec.options)
            } else if (typeof spec.options === 'string') {
              // Already stringified, use as is
              specData.options = spec.options
            }
          } else {
            // Ensure options is explicitly null if not provided
            specData.options = null
          }

          console.log(`Creating specification: ${spec.name}`, specData)
          
          await prisma.specification.create({
            data: specData
          })
          
          console.log(`Successfully created specification: ${spec.name}`)
        } catch (specError: any) {
          console.error(`Error creating specification "${spec.name}":`, specError)
          console.error('Spec error details:', {
            code: specError.code,
            message: specError.message,
            meta: specError.meta
          })
          // Continue with other specs even if one fails
          if (specError.code === 'P2002') {
            // Unique constraint violation - spec already exists, skip it
            console.log(`Specification "${spec.name}" already exists for this item, skipping`)
          } else {
            // Re-throw to stop the process
            throw new Error(`Failed to create specification "${spec.name}": ${specError.message}`)
          }
        }
      }
      
      console.log('All specifications created successfully')
    }

    // Store specification values if provided
    // Note: Specification values are typically stored when a listing is created
    // For admin products, we might want to store default values
    // This would require a new model or extending the existing schema

    console.log('Product created successfully:', item.id)
    return NextResponse.json({ item }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating product:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      meta: error.meta,
      name: error.name
    })
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Product name already exists', details: error.meta },
        { status: 400 }
      )
    }
    
    // Return more detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message || 'Internal server error'
      : 'Internal server error'
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          code: error.code,
          meta: error.meta,
          stack: error.stack
        } : undefined
      },
      { status: 500 }
    )
  }
}

