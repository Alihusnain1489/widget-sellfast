'use client'

import { useState, useLayoutEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Listing {
  id: string
  title: string
  description: string
  price: number
  address: string
  status: string
  createdAt: string
  user: {
    id: string
    name: string
    image?: string
  }
  item: {
    id: string
    name: string
    icon?: string
  }
  company: {
    id: string
    name: string
    icon?: string
  }
  category?: {
    id: string
    name: string
  }
  specifications?: Array<{
    specification: {
      name: string
      valueType: string
    }
    value: string
  }>
  images?: string[]
  bids?: Array<{
    id: string
    amount: number
    userId: string
    createdAt: string
  }>
}

export default function BuyerListingsPage() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  
  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterBrand, setFilterBrand] = useState<string>('')
  const [filterTime, setFilterTime] = useState<string>('') // 'today', 'week', 'month', 'all'
  const [filterPriceMin, setFilterPriceMin] = useState<string>('')
  const [filterPriceMax, setFilterPriceMax] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')

  useLayoutEffect(() => {
    const checkUser = () => {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          setUser(userData)
          if (userData.role !== 'BUYER') {
            router.push('/dashboard')
          }
        } catch (e) {
          console.error('Error parsing user data:', e)
          router.push('/login')
        }
      } else {
        router.push('/login')
      }
    }
    checkUser()
  }, [router])

  useLayoutEffect(() => {
    if (user) {
      fetchListings()
      fetchCategories()
      fetchBrands()
    }
  }, [user])

  const fetchListings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/listings?status=ACTIVE', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setListings(data.listings || [])
      }
    } catch (error) {
      console.error('Error fetching listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchBrands = async () => {
    try {
      const res = await fetch('/api/companies', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setBrands(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching brands:', error)
    }
  }

  const filteredListings = useMemo(() => {
    return listings.filter(listing => {
      // Category filter
      if (filterCategory && listing.category?.id !== filterCategory) {
        return false
      }

      // Brand filter
      if (filterBrand && listing.company?.id !== filterBrand) {
        return false
      }

      // Time filter
      if (filterTime) {
        const listingDate = new Date(listing.createdAt)
        const now = new Date()
        const diffTime = now.getTime() - listingDate.getTime()
        const diffDays = diffTime / (1000 * 60 * 60 * 24)

        if (filterTime === 'today' && diffDays >= 1) return false
        if (filterTime === 'week' && diffDays >= 7) return false
        if (filterTime === 'month' && diffDays >= 30) return false
      }

      // Price filter
      if (filterPriceMin && listing.price < parseFloat(filterPriceMin)) {
        return false
      }
      if (filterPriceMax && listing.price > parseFloat(filterPriceMax)) {
        return false
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesTitle = listing.title.toLowerCase().includes(searchLower)
        const matchesDescription = listing.description.toLowerCase().includes(searchLower)
        const matchesItem = listing.item.name.toLowerCase().includes(searchLower)
        const matchesBrand = listing.company.name.toLowerCase().includes(searchLower)
        if (!matchesTitle && !matchesDescription && !matchesItem && !matchesBrand) {
          return false
        }
      }

      return true
    })
  }, [listings, filterCategory, filterBrand, filterTime, filterPriceMin, filterPriceMax, searchTerm])

  const clearFilters = () => {
    setFilterCategory('')
    setFilterBrand('')
    setFilterTime('')
    setFilterPriceMin('')
    setFilterPriceMax('')
    setSearchTerm('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F56A34] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading listings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">All Listings</h1>
          <Link
            href="/buyer/coins"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            My Coins: {user?.coins || 0}
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <input
                type="text"
                placeholder="Search listings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div>
              <select
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
              >
                <option value="">All Brands</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </div>

            {/* Time Filter */}
            <div>
              <select
                value={filterTime}
                onChange={(e) => setFilterTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>

            {/* Price Range */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min Price"
                value={filterPriceMin}
                onChange={(e) => setFilterPriceMin(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Max Price"
                value={filterPriceMax}
                onChange={(e) => setFilterPriceMax(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
              />
            </div>
          </div>

          {(filterCategory || filterBrand || filterTime || filterPriceMin || filterPriceMax || searchTerm) && (
            <div className="mt-4">
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map(listing => (
            <Link
              key={listing.id}
              href={`/buyer/listings/${listing.id}`}
              className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow overflow-hidden"
            >
              {listing.images && listing.images.length > 0 && (
                <div className="w-full h-48 bg-gray-200 overflow-hidden">
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{listing.title}</h3>
                <div className="flex items-center gap-2 mb-2">
                  {listing.company.icon && (
                    <span className="text-xl">{listing.company.icon}</span>
                  )}
                  <span className="text-sm text-gray-600">{listing.company.name}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">
                    {new Date(listing.createdAt).toLocaleDateString()}
                  </span>
                  {listing.bids && listing.bids.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {listing.bids.length} offer(s)
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[#F56A34]">
                    ${listing.price.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-500">{listing.address}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredListings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No listings found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}

