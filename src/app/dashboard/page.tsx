'use client'

import { useLayoutEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { User, List, History, Plus, Home, Settings, LogOut } from 'lucide-react'

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status: sessionStatus } = useSession({
    required: false,
    onUnauthenticated: () => {
      // Don't redirect, just use localStorage auth
    }
  })
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'current' | 'past' | 'mobile-menu'>('current')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)

  useLayoutEffect(() => {
    // Check if this is an OAuth callback
    const oauthProvider = searchParams.get('oauth')
    
    // Only use NextAuth session if it's loaded and has a user
    if (sessionStatus === 'authenticated' && session?.user) {
      // Sync OAuth session with localStorage
      syncOAuthUser(session.user.email!)
    } else {
      // AuthGuard handles authentication, we just need to get user data
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser))
        } catch (error) {
          console.error('Error parsing user data:', error)
        }
      }
    }
    fetchListings()
  }, [session, sessionStatus, searchParams])

  const syncOAuthUser = async (email: string) => {
    try {
      const response = await fetch(`/api/auth/user?email=${encodeURIComponent(email)}`)
      const data = await response.json()
      
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
        setUser(data.user)
        // Remove oauth query param if present
        if (searchParams.get('oauth')) {
          router.replace('/dashboard')
        }
      }
    } catch (error) {
      console.error('Error syncing OAuth user:', error)
    }
  }

  const fetchListings = async () => {
    try {
      const response = await fetch('/api/listings/my-listings')
      const data = await response.json()
      setListings(data.listings || [])
    } catch (error) {
      console.error('Error fetching listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const currentListings = listings.filter(l => l.status === 'ACTIVE' || l.status === 'PENDING')
  const pastListings = listings.filter(l => l.status === 'SOLD' || l.status === 'FAILED')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'SOLD': return 'bg-blue-100 text-blue-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      localStorage.removeItem('user')
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
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
    const currentList = activeTab === 'current' ? currentListings : pastListings
    if (selectedListings.size === currentList.length) {
      setSelectedListings(new Set())
    } else {
      setSelectedListings(new Set(currentList.map(l => l.id)))
    }
  }

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchListings()
        // Remove from selection if selected
        const newSelected = new Set(selectedListings)
        newSelected.delete(listingId)
        setSelectedListings(newSelected)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete listing')
      }
    } catch (error) {
      console.error('Error deleting listing:', error)
      alert('Error deleting listing')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedListings.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedListings.size} listing(s)? This action cannot be undone.`)) return

    const deletePromises = Array.from(selectedListings).map(id =>
      fetch(`/api/listings/${id}`, { method: 'DELETE' }).catch(err => {
        console.error(`Error deleting listing ${id}:`, err)
        return null
      })
    )
    
    await Promise.all(deletePromises)
    setSelectedListings(new Set())
    fetchListings()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 shadow-sm min-h-screen">
        <div className="p-6 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 w-8 h-8 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-gray-900">SellFast</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Home className="w-5 h-5" />
            Home
          </Link>
          
          <Link
            href="/dashboard/profile"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-700 hover:bg-gray-100"
          >
            <User className="w-5 h-5" />
            My Profile
          </Link>
          
          <button
            onClick={() => setActiveTab('current')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'current'
                ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <List className="w-5 h-5" />
            <span className="flex-1 text-left">Current Listings</span>
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">
              {currentListings.length}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('past')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'past'
                ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="flex-1 text-left">Past Listings</span>
            <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-1 rounded-full">
              {pastListings.length}
            </span>
          </button>
          
          <Link
            href="/dashboard/create-listing"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg mt-4"
          >
            <Plus className="w-5 h-5" />
            Create New Listing
          </Link>
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-white p-2 rounded-lg shadow-md border border-gray-200"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl z-50" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 w-8 h-8 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">S</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">SellFast</span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <Home className="w-5 h-5" />
                Home
              </Link>
              <Link
                href="/dashboard/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <User className="w-5 h-5" />
                My Profile
              </Link>
              <button
                onClick={() => { setActiveTab('current'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <List className="w-5 h-5" />
                <span className="flex-1 text-left">Current Listings</span>
                <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">
                  {currentListings.length}
                </span>
              </button>
              <button
                onClick={() => { setActiveTab('past'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <History className="w-5 h-5" />
                <span className="flex-1 text-left">Past Listings</span>
                <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-1 rounded-full">
                  {pastListings.length}
                </span>
              </button>
              <Link
                href="/dashboard/create-listing"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 mt-4"
              >
                <Plus className="w-5 h-5" />
                Create New Listing
              </Link>
            </nav>

            <div className="p-4 border-t border-gray-200 space-y-2">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="w-5 h-5" />
                Settings
              </button>
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm">
            {/* Content */}
            <div className="p-6">
            {activeTab === 'current' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                  <h2 className="text-2xl font-bold">Current Listings</h2>
                  {currentListings.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectionMode(!selectionMode)
                          if (selectionMode) {
                            setSelectedListings(new Set())
                          }
                        }}
                        className="px-3 py-1.5 text-xs sm:text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium"
                      >
                        {selectionMode ? 'Cancel Select' : 'Select'}
                      </button>
                      {selectionMode && (
                        <button
                          onClick={handleSelectAll}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          {selectedListings.size === currentListings.length ? 'Deselect All' : 'Select All'}
                        </button>
                      )}
                      {selectionMode && selectedListings.size > 0 && (
                        <button
                          onClick={handleBulkDelete}
                          className="px-3 py-2 text-xs sm:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          Delete ({selectedListings.size})
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {currentListings.length === 0 ? (
                  <p className="text-gray-600">No current listings</p>
                ) : (
                  <div className="space-y-4">
                    {currentListings.map((listing) => (
                      <div 
                        key={listing.id} 
                        className={`border rounded-lg p-4 transition-all ${
                          selectionMode && selectedListings.has(listing.id) 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            {selectionMode && (
                              <input
                                type="checkbox"
                                checked={selectedListings.has(listing.id)}
                                onChange={() => handleToggleSelection(listing.id)}
                                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            )}
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{listing.title}</h3>
                              <p className="text-gray-600">{listing.item.name} - {listing.company.name}</p>
                              <p className="text-xl font-bold text-blue-600">${listing.price}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(listing.status)}`}>
                              {listing.status}
                            </span>
                            {!selectionMode && (
                              <button
                                onClick={() => handleDeleteListing(listing.id)}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                title="Delete listing"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'past' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                  <h2 className="text-2xl font-bold">Past Listings</h2>
                  {pastListings.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectionMode(!selectionMode)
                          if (selectionMode) {
                            setSelectedListings(new Set())
                          }
                        }}
                        className="px-3 py-1.5 text-xs sm:text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium"
                      >
                        {selectionMode ? 'Cancel Select' : 'Select'}
                      </button>
                      {selectionMode && (
                        <button
                          onClick={handleSelectAll}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          {selectedListings.size === pastListings.length ? 'Deselect All' : 'Select All'}
                        </button>
                      )}
                      {selectionMode && selectedListings.size > 0 && (
                        <button
                          onClick={handleBulkDelete}
                          className="px-3 py-2 text-xs sm:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          Delete ({selectedListings.size})
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {pastListings.length === 0 ? (
                  <p className="text-gray-600">No past listings</p>
                ) : (
                  <div className="space-y-4">
                    {pastListings.map((listing) => (
                      <div 
                        key={listing.id} 
                        className={`border rounded-lg p-4 transition-all ${
                          selectionMode && selectedListings.has(listing.id) 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            {selectionMode && (
                              <input
                                type="checkbox"
                                checked={selectedListings.has(listing.id)}
                                onChange={() => handleToggleSelection(listing.id)}
                                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            )}
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{listing.title}</h3>
                              <p className="text-gray-600">{listing.item.name} - {listing.company.name}</p>
                              <p className="text-xl font-bold text-blue-600">${listing.price}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(listing.status)}`}>
                              {listing.status}
                            </span>
                            {!selectionMode && (
                              <button
                                onClick={() => handleDeleteListing(listing.id)}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                title="Delete listing"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}

