import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request)
    const roles = await prisma.customRole.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ roles })
  } catch (error: any) {
    console.error('Error fetching roles:', error)
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    requireAdmin(request)
    const body = await request.json()
    const { name, description, permissions, isActive } = body

    if (!name || !permissions) {
      return NextResponse.json(
        { error: 'Name and permissions are required' },
        { status: 400 }
      )
    }

    // Check if role already exists
    const existingRole = await prisma.customRole.findUnique({
      where: { name },
    })

    if (existingRole) {
      return NextResponse.json(
        { error: 'Role with this name already exists' },
        { status: 400 }
      )
    }

    const role = await prisma.customRole.create({
      data: {
        name,
        description: description || null,
        permissions: typeof permissions === 'string' ? permissions : JSON.stringify(permissions),
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    return NextResponse.json({ role }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating role:', error)
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

