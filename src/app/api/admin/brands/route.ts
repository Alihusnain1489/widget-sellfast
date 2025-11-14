import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

// Helper function to generate unique slug
async function generateUniqueSlug(baseName: string, providedSlug?: string | null): Promise<string> {
  // If a slug is provided and valid, try to use it
  if (providedSlug && providedSlug.trim() !== '') {
    const cleanSlug = providedSlug.trim()
    const existing = await prisma.company.findUnique({
      where: { slug: cleanSlug }
    })
    if (!existing) {
      return cleanSlug
    }
  }
  
  // Generate from name
  let baseSlug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  let slug = baseSlug
  let counter = 1
  
  while (await prisma.company.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`
    counter++
  }
  
  return slug
}

export async function GET(request: NextRequest) {
  try {
    console.log('Admin API: Fetching brands...')
    
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

    const companies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { items: true, listings: true }
        }
      }
    })

    console.log(`Admin API: Found ${companies.length} brands/companies`)

    return NextResponse.json({ companies })
  } catch (error: any) {
    console.error('Admin API Error fetching brands:', error?.message || error)
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
    const { name, icon, slug, origin, website, notes } = body

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Brand name is required' },
        { status: 400 }
      )
    }

    // Check if brand already exists by name
    const existingCompanyByName = await prisma.company.findUnique({
      where: { name: name.trim() }
    })

    if (existingCompanyByName) {
      return NextResponse.json({ 
        company: existingCompanyByName,
        conflict: true,
        conflictType: 'name',
        message: 'Brand with this name already exists'
      }, { status: 409 })
    }

    // Generate a unique slug (handles both provided and auto-generated slugs)
    const uniqueSlug = await generateUniqueSlug(name, slug)

    // Create new brand
    const company = await prisma.company.create({
      data: { 
        name: name.trim(),
        icon: icon || null,
        slug: uniqueSlug,
        origin: origin || null,
        website: website || null,
        notes: notes || null
      }
    })

    return NextResponse.json({ company }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating brand:', error)
    
    // Handle unique constraint violations as fallback
    if (error.code === 'P2002') {
      const target = error.meta?.target
      const targetField = Array.isArray(target) ? target[0] : target
      const targetString = String(targetField || '')
      
      const isSlugConstraint = targetString.toLowerCase().includes('slug')
      const isNameConstraint = targetString.toLowerCase().includes('name')
      
      return NextResponse.json(
        { 
          error: isSlugConstraint 
            ? 'Brand with this slug already exists' 
            : isNameConstraint 
              ? 'Brand with this name already exists'
              : 'Brand already exists',
          conflict: true,
          conflictType: isSlugConstraint ? 'slug' : 'name'
        },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}