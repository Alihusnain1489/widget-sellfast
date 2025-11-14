'use client'

import { useState, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DEFAULT_ICONS, getDefaultIcon } from '@/lib/default-icons'

interface Category {
  id: string
  name: string
  description: string | null
  icon: string | null
}

// Map category names to default icon names
const getCategoryIconName = (categoryName: string): string => {
  const name = categoryName.toLowerCase()
  
  // Map common category names to icon names
  if (name.includes('laptop')) return 'laptop'
  if (name.includes('mobile') || name.includes('phone') || name.includes('smartphone')) return 'mobile'
  if (name.includes('tablet') || name.includes('ipad')) return 'tablet'
  if (name.includes('watch')) return 'watch'
  if (name.includes('monitor') || name.includes('led') || name.includes('display') || name.includes('screen')) return 'monitor'
  if (name.includes('desktop') || name.includes('pc')) return 'desktop'
  if (name.includes('headphone') || name.includes('earphone')) return 'headphones'
  if (name.includes('camera')) return 'camera'
  if (name.includes('gaming') || name.includes('console')) return 'cpu'
  if (name.includes('memory') || name.includes('ram')) return 'memory'
  if (name.includes('storage') || name.includes('ssd') || name.includes('hdd')) return 'storage'
  if (name.includes('battery')) return 'battery'
  if (name.includes('keyboard')) return 'keyboard'
  
  // Default fallback
  return 'laptop'
}

export default function CategoryBrowse() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useLayoutEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      console.log('🔄 Fetching categories from /api/categories...')
      const res = await fetch('/api/categories', {
        cache: 'no-store', // Ensure fresh data
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('❌ API error:', res.status, errorData)
        throw new Error(errorData.error || 'Failed to fetch categories')
      }
      
      const data = await res.json()
      console.log('✅ Categories received:', data.categories?.length || 0, 'categories')
      console.log('📋 Categories data:', data)
      
      if (data.categories && Array.isArray(data.categories)) {
        setCategories(data.categories)
      } else {
        console.warn('⚠️ Invalid categories format:', data)
        setCategories([])
      }
    } catch (error: any) {
      console.error('❌ Error fetching categories:', error?.message || error)
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryClick = (category: Category) => {
    // Navigate to listing creation with category pre-selected
    router.push(`/dashboard/create-listing?category=${encodeURIComponent(category.name)}`)
  }

  if (loading) {
    return (
      <section id="category" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F56A34] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading categories...</p>
          </div>
        </div>
      </section>
    )
  }

  // Helper function to render default icon based on category name
  const renderIcon = (categoryName: string) => {
    // Always use default icons based on category name (ignore database icon)
    const iconName = getCategoryIconName(categoryName)
    const defaultIcon = getDefaultIcon(iconName)
    
    if (defaultIcon && defaultIcon.svg) {
      // Extract path data from SVG string
      const pathMatch = defaultIcon.svg.match(/d="([^"]+)"/)
      const pathData = pathMatch ? pathMatch[1] : ''
      
      if (pathData) {
        return (
          <svg 
            className="w-18 h-18 text-[#F56A34]" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              d={pathData}
            />
          </svg>
        )
      }
    }
    
    // Fallback if icon not found - use laptop icon
    return (
      <svg 
        className="w-18 h-18 text-[#F56A34]" 
        fill="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          d="M20 18c1.1 0 1.99-.9 1.99-2L22 5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2H0c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2h-4zM4 5h16v11H4V5z"
        />
      </svg>
    )
  }

  return (
    <section id="category" className="py-12 md:py-16 bg-gray-50 min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Browse by Category
          </h2>
          <p className="text-base md:text-lg text-gray-600">
            Find the device you're looking for
          </p>
        </div>

        {categories.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className="bg-white rounded-xl p-10 border-2 border-gray-200 hover:border-[#F56A34] hover:shadow-lg transition-all duration-200 flex flex-col items-center justify-center gap-3 group min-w-[120px] max-w-[140px]"
              >
                <div className="mb-2 group-hover:scale-110 transition-transform flex items-center justify-center">
                  {renderIcon(category.name)}
                </div>
                <h3 className="font-semibold text-gray-900 text-md text-center leading-tight">
                  {category.name}
                </h3>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">No categories available yet.</p>
            <p className="text-gray-400 text-sm mt-2">Categories will appear here once added by an admin.</p>
          </div>
        )}
      </div>
    </section>
  )
}

