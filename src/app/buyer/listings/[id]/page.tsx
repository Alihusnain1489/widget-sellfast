'use client'

import { useState, useLayoutEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Listing {
  id: string
  title: string
  description: string
  price: number
  address: string
  latitude?: number
  longitude?: number
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
    coinsUsed: number
    userId: string
    user: {
      id: string
      name: string
    }
    createdAt: string
    status: string
  }>
}

export default function ListingDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const listingId = params.id as string
  
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [offerAmount, setOfferAmount] = useState<string>('')
  const [offerMessage, setOfferMessage] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

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
    if (user && listingId) {
      fetchListing()
    }
  }, [user, listingId])

  const fetchListing = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/listings/${listingId}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setListing(data.listing)
      } else {
        setError('Listing not found')
      }
    } catch (error) {
      console.error('Error fetching listing:', error)
      setError('Failed to load listing')
    } finally {
      setLoading(false)
    }
  }

  const calculateCoinsNeeded = (amount: number): number => {
    // Higher price = more coins
    // Formula: base coins + (amount * multiplier)
    const baseCoins = 10
    const multiplier = 0.1 // 10% of amount
    return Math.ceil(baseCoins + (amount * multiplier))
  }

  const handleMakeOffer = async () => {
    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      setError('Please enter a valid offer amount')
      return
    }

    const amount = parseFloat(offerAmount)
    const coinsNeeded = calculateCoinsNeeded(amount)

    if (user.coins < coinsNeeded) {
      setError(`Insufficient coins. You need ${coinsNeeded} coins but only have ${user.coins}.`)
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listingId,
          amount: amount,
          message: offerMessage,
          coinsUsed: coinsNeeded
        })
      })

      if (res.ok) {
        const data = await res.json()
        // Update user coins
        const updatedUser = { ...user, coins: user.coins - coinsNeeded }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setUser(updatedUser)
        setShowOfferModal(false)
        setOfferAmount('')
        setOfferMessage('')
        // Refresh listing to show new bid
        fetchListing()
        alert('Offer placed successfully!')
      } else {
        const errorData = await res.json()
        setError(errorData.error || 'Failed to place offer')
      }
    } catch (error: any) {
      console.error('Error placing offer:', error)
      setError('Failed to place offer. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F56A34] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading listing...</p>
        </div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Listing not found</p>
          <Link href="/buyer/listings" className="mt-4 text-blue-600 hover:text-blue-800">
            Back to Listings
          </Link>
        </div>
      </div>
    )
  }

  const coinsNeeded = offerAmount ? calculateCoinsNeeded(parseFloat(offerAmount)) : 0
  const userBid = listing.bids?.find(bid => bid.userId === user?.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href="/buyer/listings"
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Listings
        </Link>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Images */}
          {listing.images && listing.images.length > 0 && (
            <div className="w-full h-96 bg-gray-200 overflow-hidden">
              <img
                src={listing.images[0]}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{listing.title}</h1>
                <div className="flex items-center gap-4 text-gray-600">
                  <span className="flex items-center gap-2">
                    {listing.company.icon && <span>{listing.company.icon}</span>}
                    {listing.company.name}
                  </span>
                  {listing.category && (
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                      {listing.category.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-[#F56A34]">
                  ${listing.price.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Listed {new Date(listing.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Description</h2>
              <p className="text-gray-700">{listing.description}</p>
            </div>

            {/* Specifications */}
            {listing.specifications && listing.specifications.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-3">Specifications</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {listing.specifications.map((spec, idx) => (
                    <div key={idx} className="border rounded-lg p-3">
                      <div className="text-sm text-gray-600">{spec.specification.name}</div>
                      <div className="text-lg font-semibold">{spec.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Location</h2>
              <p className="text-gray-700">{listing.address}</p>
              {listing.latitude && listing.longitude && (
                <div className="mt-4 w-full h-64 bg-gray-200 rounded-lg">
                  {/* Map would go here */}
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Map View (Lat: {listing.latitude}, Lng: {listing.longitude})
                  </div>
                </div>
              )}
            </div>

            {/* Seller Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Seller</h2>
              <div className="flex items-center gap-3">
                {listing.user.image ? (
                  <img
                    src={listing.user.image}
                    alt={listing.user.name}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-gray-600">{listing.user.name.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <div className="font-semibold">{listing.user.name}</div>
                  <div className="text-sm text-gray-600">Member since {new Date(listing.createdAt).getFullYear()}</div>
                </div>
              </div>
            </div>

            {/* Offers Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  Offers ({listing.bids?.length || 0})
                </h2>
                {!userBid && (
                  <button
                    onClick={() => setShowOfferModal(true)}
                    className="px-6 py-2 bg-[#F56A34] text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Make an Offer
                  </button>
                )}
              </div>

              {listing.bids && listing.bids.length > 0 ? (
                <div className="space-y-3">
                  {listing.bids
                    .sort((a, b) => b.amount - a.amount)
                    .map(bid => (
                      <div
                        key={bid.id}
                        className={`p-4 border rounded-lg ${
                          bid.userId === user?.id ? 'border-[#F56A34] bg-orange-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-lg">${bid.amount.toFixed(2)}</div>
                            <div className="text-sm text-gray-600">
                              by {bid.user.name} • {new Date(bid.createdAt).toLocaleDateString()}
                            </div>
                            {bid.status === 'ACCEPTED' && (
                              <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                Accepted
                              </span>
                            )}
                          </div>
                          {bid.userId === user?.id && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Your Offer
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500">No offers yet. Be the first to make an offer!</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Make an Offer</h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Offer Amount ($) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                placeholder="Enter your offer"
              />
              {offerAmount && (
                <p className="mt-2 text-sm text-gray-600">
                  Coins required: <span className="font-semibold">{coinsNeeded}</span> 
                  (You have: {user?.coins || 0})
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message (Optional)
              </label>
              <textarea
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F56A34] focus:border-transparent"
                placeholder="Add a message to your offer..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleMakeOffer}
                disabled={submitting || !offerAmount || user?.coins < coinsNeeded}
                className="flex-1 px-4 py-2 bg-[#F56A34] text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Placing Offer...' : 'Place Offer'}
              </button>
              <button
                onClick={() => {
                  setShowOfferModal(false)
                  setOfferAmount('')
                  setOfferMessage('')
                  setError('')
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

