'use client'

import { useState, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Listing {
  id: string
  title: string
  price: number
  status: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string | null
  }
  item: {
    name: string
    category: {
      name: string
    }
  }
  company: {
    name: string
  }
}

export default function AdminListingsPage() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)

  useLayoutEffect(() => {
    fetchListings()
  }, [statusFilter])

  const fetchListings = async () => {
    setLoading(true)
    try {
      const url = statusFilter === 'all' 
        ? '/api/admin/listings'
        : `/api/admin/listings?status=${statusFilter}`
      const res = await fetch(url, { cache: 'no-store' })
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'SOLD': return 'bg-blue-100 text-blue-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleToggleSelection = (listingId: string) => {
    const newSelected = new Set(selectedListings)
    if (newSelected.has(listingId)) {
      newSelected.delete(listingId)
    } else {
      newSelected.add(listingId)
    }
    setSelectedListings(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedListings.size === listings.length) {
      setSelectedListings(new Set())
    } else {
      setSelectedListings(new Set(listings.map(l => l.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedListings.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedListings.size} listing(s)? This action cannot be undone.`)) return

    const deletePromises = Array.from(selectedListings).map(id =>
      fetch(`/api/admin/listings/${id}`, { method: 'DELETE' }).catch(err => {
        console.error(`Error deleting listing ${id}:`, err)
        return null
      })
    )
    
    await Promise.all(deletePromises)
    setSelectedListings(new Set())
    fetchListings()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6 lg:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Listings</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Manage all user listings</p>
            </div>
            {listings.length > 0 && (
              <>
                <button
                  onClick={() => {
                    setSelectionMode(!selectionMode)
                    if (selectionMode) {
                      setSelectedListings(new Set())
                    }
                  }}
                  className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium"
                >
                  {selectionMode ? 'Cancel Select' : 'Select'}
                </button>
                {selectionMode && (
                  <button
                    onClick={handleSelectAll}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    {selectedListings.size === listings.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </>
            )}
          </div>
          {selectionMode && selectedListings.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete ({selectedListings.size})
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="SOLD">Sold</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F56A34]"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {selectionMode && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        <input
                          type="checkbox"
                          checked={selectedListings.size === listings.length && listings.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {listings.map((listing) => (
                    <tr 
                      key={listing.id}
                      className={selectedListings.has(listing.id) ? 'bg-blue-50' : ''}
                    >
                      {selectionMode && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedListings.has(listing.id)}
                            onChange={() => handleToggleSelection(listing.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{listing.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{listing.user.name}</div>
                        <div className="text-sm text-gray-500">{listing.user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{listing.item.name}</div>
                        <div className="text-sm text-gray-500">{listing.item.category.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{listing.company.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${listing.price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={listing.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value
                            try {
                              const res = await fetch(`/api/admin/listings/${listing.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: newStatus })
                              })
                              if (res.ok) {
                                fetchListings()
                              } else {
                                alert('Failed to update status')
                              }
                            } catch (error) {
                              console.error('Error updating status:', error)
                              alert('Error updating status')
                            }
                          }}
                          className={`px-2 py-1 text-xs font-semibold rounded-full border-0 ${getStatusColor(listing.status)} cursor-pointer`}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="SOLD">SOLD</option>
                          <option value="FAILED">FAILED</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(listing.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {!selectionMode && (
                          <button
                            onClick={async () => {
                              if (!confirm(`Are you sure you want to delete listing "${listing.title}"? This action cannot be undone.`)) return
                              
                              try {
                                const res = await fetch(`/api/admin/listings/${listing.id}`, {
                                  method: 'DELETE'
                                })
                                if (res.ok) {
                                  fetchListings()
                                } else {
                                  const data = await res.json()
                                  alert(data.error || 'Failed to delete listing')
                                }
                              } catch (error) {
                                console.error('Error deleting listing:', error)
                                alert('Error deleting listing')
                              }
                            }}
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {listings.length === 0 && (
                    <tr>
                      <td colSpan={selectionMode ? 9 : 8} className="px-6 py-4 text-center text-gray-500">
                        No listings found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

