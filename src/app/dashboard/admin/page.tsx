'use client'

import { useLayoutEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalListings: 0,
    pendingListings: 0,
    activeListings: 0,
    totalUsers: 0,
  })

  useLayoutEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          if (userData.role !== 'ADMIN') {
            router.push('/dashboard')
            return
          }
          setUser(userData)
          fetchStats()
        } catch (e) {
          router.push('/login?redirect=/dashboard/admin')
        }
      } else {
        router.push('/login?redirect=/dashboard/admin')
      }
      setLoading(false)
    }
    checkAuth()
  }, [router])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      
      // Fetch listings
      const listingsRes = await axios.get('/api/listings', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      })
      const allListings = listingsRes.data.listings || []
      
      setStats({
        totalListings: allListings.length,
        pendingListings: allListings.filter((l: any) => l.status === 'PENDING').length,
        activeListings: allListings.filter((l: any) => l.status === 'ACTIVE').length,
        totalUsers: 0, // Would need users API
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#F56A34] border-t-transparent"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ height: '100vh', overflow: 'auto' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage your SellFast platform</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Listings</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalListings}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Pending Approval</h3>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pendingListings}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Active Listings</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.activeListings}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalUsers}</p>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/dashboard/admin/listings"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-blue-500"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Listings</h3>
            <p className="text-sm text-gray-600">Approve, reject, or manage all listings</p>
          </Link>
          
          <Link
            href="/dashboard/admin/categories"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-green-500"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Categories</h3>
            <p className="text-sm text-gray-600">Manage product categories</p>
          </Link>
          
          <Link
            href="/dashboard/admin/brands"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-purple-500"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Brands</h3>
            <p className="text-sm text-gray-600">Manage brands and companies</p>
          </Link>
          
          <Link
            href="/dashboard/admin/items"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-orange-500"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Items/Models</h3>
            <p className="text-sm text-gray-600">Manage device models and items</p>
          </Link>
          
          <Link
            href="/dashboard/admin/specifications"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-red-500"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Specifications</h3>
            <p className="text-sm text-gray-600">Manage product specifications</p>
          </Link>
          
          <Link
            href="/dashboard/admin/users"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-indigo-500"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Users</h3>
            <p className="text-sm text-gray-600">Manage users and permissions</p>
          </Link>
        </div>
      </div>
    </div>
  )
}

