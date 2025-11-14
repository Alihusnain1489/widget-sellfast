'use client'

import { useState, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Stats {
  totalListings: number
  activeListings: number
  pendingListings: number
  soldListings: number
  totalUsers: number
  totalProducts: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    totalListings: 0,
    activeListings: 0,
    pendingListings: 0,
    soldListings: 0,
    totalUsers: 0,
    totalProducts: 0
  })
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useLayoutEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [listingsRes, statsRes] = await Promise.all([
        fetch('/api/admin/listings', { cache: 'no-store' }),
        fetch('/api/admin/stats', { cache: 'no-store' })
      ])

      if (listingsRes.ok) {
        const data = await listingsRes.json()
        setListings(data.listings || [])
      }

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700'
      case 'PENDING': return 'bg-yellow-100 text-yellow-700'
      case 'SOLD': return 'bg-blue-100 text-blue-700'
      case 'FAILED': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#F56A34] border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalListings}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-green-600 mb-1">Active</p>
            <p className="text-2xl font-bold text-gray-900">{stats.activeListings}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-yellow-600 mb-1">Pending</p>
            <p className="text-2xl font-bold text-gray-900">{stats.pendingListings}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-blue-600 mb-1">Sold</p>
            <p className="text-2xl font-bold text-gray-900">{stats.soldListings}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">Users</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">Products</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
          </div>
        </div>

        {/* Recent Listings */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Listings</h2>
            <Link href="/admin/listings" className="text-sm text-[#F56A34] hover:text-orange-600">
              View All →
            </Link>
          </div>
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50 text-xs">
                <tr>
                  <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-500">Title</th>
                  <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-500 hidden sm:table-cell">User</th>
                  <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-500">Price</th>
                  <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-500">Status</th>
                  <th className="px-2 sm:px-4 py-2 text-left font-medium text-gray-500 hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {listings.slice(0, 10).map((listing) => (
                  <tr key={listing.id} className="hover:bg-gray-50">
                    <td className="px-2 sm:px-4 py-3">
                      <div className="text-xs sm:text-sm font-medium text-gray-900">{listing.title}</div>
                      <div className="text-xs text-gray-500">{listing.item?.name}</div>
                    </td>
                    <td className="px-2 sm:px-4 py-3 hidden sm:table-cell">
                      <div className="text-xs sm:text-sm text-gray-900">{listing.user?.name}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[120px]">{listing.user?.email}</div>
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-gray-900">
                      ${listing.price}
                    </td>
                    <td className="px-2 sm:px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(listing.status)}`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                      {new Date(listing.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {listings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                      No listings found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}