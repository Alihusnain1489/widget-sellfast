import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/middleware'

// GET - Fetch common specifications
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

    // Fetch all category specifications to get common ones
    const allSpecs = await prisma.categorySpecification.findMany({
      select: {
        name: true,
        valueType: true,
        options: true,
        icon: true
      },
      distinct: ['name']
    })

    // Group by name and get most common options
    const specMap = new Map<string, { name: string; valueType: string; options?: string | string[]; icon?: string }>()
    
    allSpecs.forEach(spec => {
      if (!specMap.has(spec.name)) {
        let options: string[] = []
        if (spec.options) {
          try {
            options = typeof spec.options === 'string' ? JSON.parse(spec.options) : spec.options
          } catch {
            // Ignore parse errors
          }
        }
        specMap.set(spec.name, {
          name: spec.name,
          valueType: spec.valueType,
          options: options.length > 0 ? options : undefined,
          icon: spec.icon || undefined
        })
      }
    })

    const commonSpecs = Array.from(specMap.values())

    // Add fallback common specs if none found
    if (commonSpecs.length === 0) {
      return NextResponse.json({
        commonSpecs: [
          { name: 'RAM', valueType: 'select', options: ['4GB', '6GB', '8GB', '12GB', '16GB', '32GB', '64GB'] },
          { name: 'Storage (SSD)', valueType: 'select', options: ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB', '4TB'] },
          { name: 'Storage (HDD)', valueType: 'select', options: ['500GB', '1TB', '2TB', '4TB', '8TB'] },
          { name: 'Processor', valueType: 'select', options: [] },
          { name: 'Screen Size', valueType: 'select', options: [] },
          { name: 'Weight', valueType: 'select', options: [] },
          { name: 'Battery Life', valueType: 'select', options: [] },
          { name: 'Graphics Card', valueType: 'select', options: [] },
          { name: 'Operating System', valueType: 'select', options: [] },
          { name: 'Display Resolution', valueType: 'select', options: [] },
          { name: 'Camera', valueType: 'select', options: [] },
          { name: 'Front Camera', valueType: 'select', options: [] },
          { name: 'Connectivity', valueType: 'select', options: [] },
          { name: 'Network', valueType: 'select', options: [] },
          { name: 'SIM Card', valueType: 'select', options: [] },
          { name: 'Storage Type', valueType: 'select', options: [] },
          { name: 'Display Type', valueType: 'select', options: [] },
          { name: 'Refresh Rate', valueType: 'select', options: [] },
          { name: 'Color', valueType: 'select', options: [] },
          { name: 'Warranty', valueType: 'select', options: [] },
          { name: 'Condition', valueType: 'select', options: [] }
        ]
      })
    }

    return NextResponse.json({ commonSpecs })
  } catch (error: any) {
    console.error('Error fetching common specs:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

