import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

// PATCH - Update a single category specification
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    const { name, valueType, options, icon, order, isRequired } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (valueType !== undefined) updateData.valueType = valueType
    if (icon !== undefined) updateData.icon = icon || null
    if (order !== undefined) updateData.order = order !== null ? Number(order) : null
    if (isRequired !== undefined) updateData.isRequired = isRequired === true

    if (options !== undefined) {
      if (options === null) {
        updateData.options = null
      } else if (Array.isArray(options)) {
        updateData.options = JSON.stringify(options)
      } else if (typeof options === 'string') {
        updateData.options = options
      }
    }

    const specification = await prisma.categorySpecification.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({ specification })
  } catch (error: any) {
    console.error('Error updating category specification:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Specification not found' },
        { status: 404 }
      )
    }
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

// DELETE - Delete a category specification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    await prisma.categorySpecification.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting category specification:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Specification not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

