'use client'

import { useLayoutEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Link from 'next/link'

export default function MyListingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState<any[]>([])

  useLayoutEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          setUser(userData)
          fetchListings(userData.id)
        } catch (e) {
          router.push('/login?redirect=/dashboard/listings')
        }
      } else {
        router.push('/login?redirect=/dashboard/listings')
      }
      setLoading(false)
    }
    checkAuth()
  }, [router])

  const fetchListings = async (userId: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`/api/listings?userId=${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      })
      setListings(res.data.listings || [])
    } catch (error) {
      console.error('Error fetching listings:', error)
    }
  }

  const handleDelete = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return
    
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`/api/listings/${listingId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      })
      setListings(listings.filter(l => l.id !== listingId))
    } catch (error) {
      console.error('Error deleting listing:', error)
      alert('Failed to delete listing')
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Listings</h1>
            <p className="mt-2 text-gray-600">Manage your listings</p>
          </div>
          <Link
            href="/widget"
            className="bg-[#F56A34] text-white px-6 py-2 rounded-lg hover:bg-[#E55A24] transition-colors"
          >
            Create New Listing
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow">
          {listings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No listings yet.</p>
              <Link
                href="/widget"
                className="inline-block bg-[#F56A34] text-white px-6 py-2 rounded-lg hover:bg-[#E55A24] transition-colors"
              >
                Create Your First Listing
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {listings.map((listing: any) => (
                <div key={listing.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{listing.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {listing.item?.category?.name} • {listing.company?.name} • {listing.item?.name}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          listing.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          listing.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {listing.status}
                        </span>
                        <span className="text-xs text-gray-400">
                          Created: {new Date(listing.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(listing.id)}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

