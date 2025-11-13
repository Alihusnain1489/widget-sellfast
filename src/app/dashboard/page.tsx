'use client'

import { useLayoutEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { PERMISSIONS, ROLE_PERMISSIONS, hasPermission } from '@/lib/permissions'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    pendingListings: 0,
    totalUsers: 0,
  })
  const [userPermissions, setUserPermissions] = useState<string[]>([])

  useLayoutEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          setUser(userData)
          
          // Get user permissions
          const permissions = getUserPermissions(userData)
          setUserPermissions(permissions)
          
          fetchListings(userData.id, userData.role)
          if (userData.role === 'ADMIN') {
            fetchStats()
          }
        } catch (e) {
          console.error('Error parsing user data:', e)
          router.push('/login?redirect=/dashboard')
        }
      } else {
        router.push('/login?redirect=/dashboard')
      }
      setLoading(false)
    }
    checkAuth()
  }, [router])

  const getUserPermissions = (userData: any): string[] => {
    let permissions: string[] = []
    
    // Get permissions from custom role
    if (userData.customRole?.permissions) {
      try {
        permissions = JSON.parse(userData.customRole.permissions)
      } catch (e) {
        console.error('Error parsing custom role permissions:', e)
      }
    }
    
    // Get direct permissions
    if (userData.permissions) {
      try {
        const directPermissions = JSON.parse(userData.permissions)
        permissions = [...permissions, ...directPermissions]
      } catch (e) {
        console.error('Error parsing user permissions:', e)
      }
    }
    
    // If no custom permissions, use role defaults
    if (permissions.length === 0 && userData.role) {
      permissions = ROLE_PERMISSIONS[userData.role as keyof typeof ROLE_PERMISSIONS] || []
    }
    
    return [...new Set(permissions)]
  }

  const fetchListings = async (userId: string, role: string) => {
    try {
      const token = localStorage.getItem('token')
      const url = role === 'ADMIN' 
        ? '/api/listings' 
        : `/api/listings?userId=${userId}`
      
      const res = await axios.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      })

      const allListings = res.data.listings || []
      setListings(allListings)
      
      setStats(prev => ({
        ...prev,
        totalListings: allListings.length,
        activeListings: allListings.filter((l: any) => l.status === 'ACTIVE').length,
        pendingListings: allListings.filter((l: any) => l.status === 'PENDING').length,
      }))
    } catch (error) {
      console.error('Error fetching listings:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const usersRes = await axios.get('/api/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      })
      
      setStats(prev => ({
        ...prev,
        totalUsers: usersRes.data.users?.length || 0,
      }))
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#F56A34] border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50" style={{ height: '100vh', overflow: 'auto' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back, {user.name || user.email}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Listings</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalListings}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Active Listings</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.activeListings}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Pending Listings</h3>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pendingListings}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link
            href="/widget"
            className="bg-[#F56A34] text-white rounded-lg p-4 hover:bg-[#E55A24] transition-colors text-center font-medium"
          >
            Create New Listing
          </Link>
          {user.role === 'ADMIN' && (
            <Link
              href="/dashboard/admin"
              className="bg-gray-900 text-white rounded-lg p-4 hover:bg-gray-800 transition-colors text-center font-medium"
            >
              Admin Panel
            </Link>
          )}
          <Link
            href="/dashboard/listings"
            className="bg-white border-2 border-gray-300 text-gray-700 rounded-lg p-4 hover:bg-gray-50 transition-colors text-center font-medium"
          >
            My Listings
          </Link>
          <Link
            href="/dashboard/profile"
            className="bg-white border-2 border-gray-300 text-gray-700 rounded-lg p-4 hover:bg-gray-50 transition-colors text-center font-medium"
          >
            My Profile
          </Link>
        </div>

        {/* Recent Listings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Listings</h2>
          </div>
          <div className="p-6">
            {listings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No listings yet. Create your first listing!</p>
                <Link
                  href="/widget"
                  className="mt-4 inline-block bg-[#F56A34] text-white px-6 py-2 rounded-lg hover:bg-[#E55A24] transition-colors"
                >
                  Create Listing
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {listings.slice(0, 5).map((listing: any) => (
                  <div key={listing.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{listing.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {listing.item?.category?.name} • {listing.company?.name} • {listing.item?.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Status: <span className={`font-medium ${
                            listing.status === 'ACTIVE' ? 'text-green-600' :
                            listing.status === 'PENDING' ? 'text-yellow-600' :
                            'text-gray-600'
                          }`}>
                            {listing.status}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{new Date(listing.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

