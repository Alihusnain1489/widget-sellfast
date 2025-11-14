'use client'

import { useState, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Bid {
  id: string
  amount: number
  coinsUsed: number
  message?: string
  status: string
  expiresAt?: string
  createdAt: string
  user: {
    id: string
    name: string
    image?: string
  }
  listing: {
    id: string
    title: string
  }
}

export default function MyOffersPage() {
  const router = useRouter()
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')

  useLayoutEffect(() => {
    const checkUser = () => {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          setUser(userData)
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
      fetchOffers()
    }
  }, [user])

  const fetchOffers = async () => {
    try {
      setLoading(true)
      // Fetch listings for current user
      const listingsRes = await fetch('/api/listings?userId=' + user.id, { cache: 'no-store' })
      if (listingsRes.ok) {
        const listingsData = await listingsRes.json()
        const listingIds = listingsData.listings.map((l: any) => l.id)
        
        // Fetch bids for these listings
        const bidsRes = await fetch('/api/bids', { cache: 'no-store' })
        if (bidsRes.ok) {
          const bidsData = await bidsRes.json()
          const myListingBids = bidsData.bids.filter((bid: Bid) => 
            listingIds.includes(bid.listing.id)
          )
          setBids(myListingBids)
        }
      }
    } catch (error) {
      console.error('Error fetching offers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptOffer = async (bidId: string) => {
    if (!confirm('Are you sure you want to accept this offer? This will reject all other offers.')) {
      return
    }

    try {
      const res = await fetch(`/api/bids/${bidId}/accept`, {
        method: 'POST'
      })

      if (res.ok) {
        alert('Offer accepted! A chat has been created with the buyer.')
        fetchOffers()
        router.push('/dashboard/chats')
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'Failed to accept offer')
      }
    } catch (error) {
      console.error('Error accepting offer:', error)
      alert('Failed to accept offer. Please try again.')
    }
  }

  const getTimeRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}h ${minutes}m`
  }

  const filteredBids = filterStatus
    ? bids.filter(bid => bid.status === filterStatus)
    : bids

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F56A34] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading offers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Offers on My Listings</h1>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredBids.length > 0 ? (
            filteredBids.map(bid => (
              <div
                key={bid.id}
                className={`bg-white rounded-lg shadow-sm p-6 ${
                  bid.status === 'ACCEPTED' ? 'border-2 border-green-500' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {bid.user.image ? (
                        <img
                          src={bid.user.image}
                          alt={bid.user.name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-600">{bid.user.name.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-lg">{bid.user.name}</div>
                        <div className="text-sm text-gray-600">{bid.listing.title}</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-[#F56A34] mb-2">
                      ${bid.amount.toFixed(2)}
                    </div>
                    {bid.message && (
                      <p className="text-gray-700 mb-2">{bid.message}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Offered: {new Date(bid.createdAt).toLocaleString()}</span>
                      {bid.status === 'PENDING' && bid.expiresAt && (
                        <span className="text-orange-600">
                          Time remaining: {getTimeRemaining(bid.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      bid.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      bid.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                      bid.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {bid.status}
                    </span>
                    {bid.status === 'PENDING' && (
                      <button
                        onClick={() => handleAcceptOffer(bid.id)}
                        className="px-4 py-2 bg-[#F56A34] text-white rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        Accept Offer
                      </button>
                    )}
                    {bid.status === 'ACCEPTED' && (
                      <Link
                        href="/dashboard/chats"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Open Chat
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No offers found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

