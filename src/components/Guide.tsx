'use client'

import { useLayoutEffect, useState } from 'react'
import Link from 'next/link'

export default function Guide() {
  const [user, setUser] = useState<any>(null)

  useLayoutEffect(() => {
    // Check if user is signed in
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }

    // Listen for storage changes (e.g., login/logout in another tab)
    const handleStorageChange = () => {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser))
        } catch (e) {
          setUser(null)
        }
      } else {
        setUser(null)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    // Also check periodically for same-tab changes
    const interval = setInterval(() => {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          if (JSON.stringify(userData) !== JSON.stringify(user)) {
            setUser(userData)
          }
        } catch (e) {
          if (user) setUser(null)
        }
      } else {
        if (user) setUser(null)
      }
    }, 1000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [user])

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          
          {/* For Sellers */}
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-6">
                <svg className="w-8 h-8 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                For Sellers
              </h2>
              <p className="text-xl text-gray-600">
                Simple steps to sell your device
              </p>
            </div>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-orange-500 text-white rounded-full font-bold text-lg">
                    1
                  </div>
                </div>
                <div>
                  <h3 className="text-xl md:text-xl font-bold text-gray-900 mb-2">
                    Choose Device
                  </h3>
                  <p className="text-base md:text-lg text-gray-600">
                    Select your device brand and model from our comprehensive list
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-orange-500 text-white rounded-full font-bold text-lg">
                    2
                  </div>
                </div>
                <div>
                  <h3 className="text-xl md:text-xl font-bold text-gray-900 mb-2">
                    Add Details
                  </h3>
                  <p className="text-base md:text-lg text-gray-600">
                    Provide specifications, condition, and set your asking price
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-orange-500 text-white rounded-full font-bold text-lg">
                    3
                  </div>
                </div>
                <div>
                  <h3 className="text-xl md:text-xl font-bold text-gray-900 mb-2">
                    Get Best Offers
                  </h3>
                  <p className="text-base md:text-lg text-gray-600">
                    Receive competitive offers based on market value and device condition
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-orange-500 text-white rounded-full font-bold text-lg">
                    4
                  </div>
                </div>
                <div>
                  <h3 className="text-xl md:text-xl font-bold text-gray-900 mb-2">
                    Complete Sale
                  </h3>
                  <p className="text-base md:text-lg text-gray-600">
                    Accept the best offer and connect with buyer through secure chat
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Box */}
            {!user && (
              <div className="bg-orange-50 rounded-2xl p-5 border-2 border-orange-100">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 bg-orange-500 text-white rounded-full">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">
                      Ready to sell?
                    </h3>
                    <p className="text-sm md:text-base text-orange-600">
                      Create a listing in just a few simple steps
                    </p>
                  </div>
                  <Link 
                    href="/signup"
                    className="flex-shrink-0 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white text-base font-semibold rounded-lg transition-colors duration-200 text-center"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            )}
            {user && (
              <div className="bg-green-50 rounded-2xl p-5 border-2 border-green-100">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-500 text-white rounded-full">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">
                      Ready to sell, {user.name}?
                    </h3>
                    <p className="text-sm md:text-base text-green-600">
                      Create a listing in just a few simple steps
                    </p>
                  </div>
                  <Link 
                    href="/dashboard/create-listing"
                    className="flex-shrink-0 px-6 py-3 bg-green-500 hover:bg-green-600 text-white text-base font-semibold rounded-lg transition-colors duration-200 text-center"
                  >
                    Create Listing
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* For Buyers */}
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                For Buyers
              </h2>
              <p className="text-xl text-gray-600">
                Smart bidding system for best deals
              </p>
            </div>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full font-bold text-lg">
                    1
                  </div>
                </div>
                <div>
                  <h3 className="text-xl md:text-xl font-bold text-gray-900 mb-2">
                    Browse Devices
                  </h3>
                  <p className="text-base md:text-lg text-gray-600">
                    Explore verified listings with detailed specifications and photos
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full font-bold text-lg">
                    2
                  </div>
                </div>
                <div>
                  <h3 className="text-xl md:text-xl font-bold text-gray-900 mb-2">
                    Place Smart Bids
                  </h3>
                  <p className="text-base md:text-lg text-gray-600">
                    Use our intelligent bidding system to compete for the best devices
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full font-bold text-lg">
                    3
                  </div>
                </div>
                <div>
                  <h3 className="text-xl md:text-xl font-bold text-gray-900 mb-2">
                    Win Auctions
                  </h3>
                  <p className="text-base md:text-lg text-gray-600">
                    Get notified when you win and secure your purchase
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full font-bold text-lg">
                    4
                  </div>
                </div>
                <div>
                  <h3 className="text-xl md:text-xl font-bold text-gray-900 mb-2">
                    Secure Purchase
                  </h3>
                  <p className="text-base md:text-lg text-gray-600">
                    Complete payment and arrange delivery through our secure platform
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )};