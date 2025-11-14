'use client'

import { useState, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function BuyerCoinsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showRechargeModal, setShowRechargeModal] = useState(false)
  const [rechargeAmount, setRechargeAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'credit_card' | 'debit_card'>('credit_card')
  const [submitting, setSubmitting] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])

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
      fetchTransactions()
      fetchUserCoins()
    }
  }, [user])

  const fetchUserCoins = async () => {
    try {
      const res = await fetch('/api/user/coins', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setUser({ ...user, coins: data.coins })
        localStorage.setItem('user', JSON.stringify({ ...user, coins: data.coins }))
      }
    } catch (error) {
      console.error('Error fetching coins:', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/user/coin-transactions', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions || [])
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const handleRecharge = async () => {
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/user/recharge-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(rechargeAmount),
          paymentMethod: paymentMethod
        })
      })

      if (res.ok) {
        const data = await res.json()
        setUser({ ...user, coins: data.newBalance })
        localStorage.setItem('user', JSON.stringify({ ...user, coins: data.newBalance }))
        setShowRechargeModal(false)
        setRechargeAmount('')
        fetchTransactions()
        alert('Coins recharged successfully!')
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'Failed to recharge coins')
      }
    } catch (error) {
      console.error('Error recharging coins:', error)
      alert('Failed to recharge coins. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <Link
            href="/buyer/listings"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Listings
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">My Coins</h1>
        </div>

        {/* Coins Balance Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-blue-100 mb-1">Available Coins</p>
              <p className="text-4xl font-bold">{user?.coins || 0}</p>
            </div>
            <button
              onClick={() => setShowRechargeModal(true)}
              className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Recharge Coins
            </button>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map(transaction => (
                <div
                  key={transaction.id}
                  className="flex justify-between items-center p-4 border rounded-lg"
                >
                  <div>
                    <div className="font-semibold">
                      {transaction.type === 'RECHARGE' ? 'Coin Recharge' : 
                       transaction.type === 'BID_PLACED' ? 'Bid Placed' :
                       transaction.type === 'BID_REFUND' ? 'Bid Refunded' : 'Transaction'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {transaction.description || 'No description'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className={`text-lg font-semibold ${
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)} coins
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No transactions yet</p>
          )}
        </div>
      </div>

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Recharge Coins</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount ($) *
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter amount"
              />
              <p className="mt-2 text-sm text-gray-600">
                You will receive {rechargeAmount ? (parseFloat(rechargeAmount) * 10).toFixed(0) : 0} coins
                (1$ = 10 coins)
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method *
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="credit_card"
                    checked={paymentMethod === 'credit_card'}
                    onChange={() => setPaymentMethod('credit_card')}
                    className="mr-3"
                  />
                  <span>Credit Card</span>
                </label>
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="debit_card"
                    checked={paymentMethod === 'debit_card'}
                    onChange={() => setPaymentMethod('debit_card')}
                    className="mr-3"
                  />
                  <span>Debit Card</span>
                </label>
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank"
                    checked={paymentMethod === 'bank'}
                    onChange={() => setPaymentMethod('bank')}
                    className="mr-3"
                  />
                  <span>Bank Transfer</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRecharge}
                disabled={submitting || !rechargeAmount}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Processing...' : 'Recharge'}
              </button>
              <button
                onClick={() => {
                  setShowRechargeModal(false)
                  setRechargeAmount('')
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

