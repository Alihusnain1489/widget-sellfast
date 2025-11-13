import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const body = await request.json()
    const { itemId, companyId, title, description, price, address, latitude, longitude, specifications, images } = body

    if (!itemId || !companyId || !title || !description || !address) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create listing with ACTIVE status by default for users
    const listing = await prisma.listing.create({
      data: {
        userId: user.userId,
        itemId,
        companyId,
        title,
        description,
        price: price ? parseFloat(price) : 0,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        status: 'PENDING', // Changed to PENDING for admin approval
        tempData: images && images.length > 0 ? { images } : null,
        specifications: {
          create: (specifications || []).map((spec: { specificationId: string; value: string }) => ({
            specificationId: spec.specificationId,
            value: spec.value
          }))
        }
      }
    })

    return NextResponse.json({ listing }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating listing:', error)
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

