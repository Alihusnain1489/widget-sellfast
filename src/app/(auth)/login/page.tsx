'use client'

import { useState, useLayoutEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  useLayoutEffect(() => {
    const msg = searchParams.get('message')
    if (msg) setMessage(msg)
  }, [searchParams])

  const addDebugInfo = (info: string) => {
    console.log(info)
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`])
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setDebugInfo([])
    setLoading(true)

    try {
      addDebugInfo('Starting login process...')
      addDebugInfo(`Email: ${formData.email}`)
      addDebugInfo(`API URL: ${window.location.origin}/api/auth/login`)
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
        credentials: 'include'
      })

      addDebugInfo(`Response status: ${response.status} ${response.statusText}`)

      let data: any
      const contentType = response.headers.get('content-type')
      addDebugInfo(`Response content-type: ${contentType}`)

      if (contentType?.includes('application/json')) {
        try {
          data = await response.json()
          addDebugInfo(`Response data: ${JSON.stringify(data)}`)
        } catch (parseError: any) {
          addDebugInfo(`JSON parse error: ${parseError.message}`)
          setError('Server returned invalid response. Please check server logs.')
          setLoading(false)
          return
        }
      } else {
        const text = await response.text()
        addDebugInfo(`Non-JSON response: ${text.substring(0, 200)}`)
        setError('Server returned unexpected response format.')
        setLoading(false)
        return
      }

      if (!response.ok) {
        addDebugInfo(`Login failed: ${data.error || 'Unknown error'}`)
        setError(data.error || data.details || 'Login failed. Please check your credentials.')
        setLoading(false)
        return
      }

      if (!data.user) {
        addDebugInfo('No user data in response')
        setError('Login failed. No user data received.')
        setLoading(false)
        return
      }

      addDebugInfo(`Login successful! User: ${data.user.email}, Role: ${data.user.role}`)

      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(data.user))
      addDebugInfo('User data stored in localStorage')

      // Redirect based on role or redirect parameter
      const redirectParam = searchParams.get('redirect')
      const redirectPath = redirectParam || (data.user.role === 'ADMIN' ? '/admin' : '/dashboard')
      addDebugInfo(`Redirecting to: ${redirectPath}`)
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      router.push(redirectPath)
      router.refresh()
    } catch (err: any) {
      addDebugInfo(`Network error: ${err.message}`)
      console.error('Login error:', err)
      setError(`Network error: ${err.message}. Please check if the server is running.`)
      setLoading(false)
    }
  }

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!otpSent) {
      setLoading(true)
      try {
        const response = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: formData.phone,
            type: 'login'
          })
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Failed to send OTP')
          setLoading(false)
          return
        }

        setOtpSent(true)
        setMessage('OTP sent to your phone number')
        setLoading(false)
      } catch (err) {
        setError('Network error. Please try again.')
        setLoading(false)
      }
    } else {
      setLoading(true)
      try {
        const response = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: formData.phone,
            code: otpCode,
            type: 'login'
          })
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Invalid OTP')
          setLoading(false)
          return
        }

        if (data.user.role === 'ADMIN') {
          router.push('/admin')
        } else {
          router.push('/dashboard')
        }
      } catch (err) {
        setError('Network error. Please try again.')
        setLoading(false)
      }
    }
  }

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    try {
      setLoading(true)
      setError('')
      await signIn(provider, { 
        callbackUrl: `/dashboard?oauth=${provider}`,
        redirect: true 
      })
    } catch (error) {
      setError(`Failed to login with ${provider}`)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Desktop: Split screen layout */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:min-h-screen">
        {/* Left side - Branding */}
        <div className="relative bg-gradient-to-br from-orange-500 via-[#F56A34] to-orange-600 p-12 flex flex-col justify-between text-white overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z"/>
                </svg>
              </div>
              SellFast
            </Link>
          </div>

          <div className="relative z-10 space-y-6">
            <h1 className="text-5xl font-bold leading-tight">
              Welcome back to<br />your marketplace
            </h1>
            <p className="text-xl text-white/90 max-w-md">
              Connect with buyers and sellers in your community. List items, discover great deals, and grow your business.
            </p>
            <div className="flex gap-8 pt-8">
              <div>
                <div className="text-4xl font-bold">10K+</div>
                <div className="text-white/80">Active Users</div>
              </div>
              <div>
                <div className="text-4xl font-bold">50K+</div>
                <div className="text-white/80">Items Sold</div>
              </div>
              <div>
                <div className="text-4xl font-bold">98%</div>
                <div className="text-white/80">Satisfaction</div>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-sm text-white/70">
            © 2024 SellFast. All rights reserved.
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="flex items-center justify-center p-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign in to your account</h2>
              <p className="text-gray-600">Enter your credentials to access your dashboard</p>
            </div>

            <div className="space-y-6">
              {/* OAuth Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleOAuthLogin('google')}
                  disabled={loading}
                  className="flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 group"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Google</span>
                </button>

                <button
                  onClick={() => handleOAuthLogin('facebook')}
                  disabled={loading}
                  className="flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 group"
                >
                  <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Facebook</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
                </div>
              </div>

              {/* Messages */}
              {message && (
                <div className="bg-green-50 border-l-4 border-green-400 text-green-700 px-4 py-3 rounded-r text-sm">
                  {message}
                </div>
              )}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-r text-sm">
                  {error}
                </div>
              )}

              {/* Debug Info */}
              {debugInfo.length > 0 && (
                <details className="bg-gray-50 border border-gray-200 rounded-lg text-xs">
                  <summary className="px-4 py-3 cursor-pointer font-medium text-gray-700">Debug Information</summary>
                  <div className="px-4 py-3 space-y-1 max-h-48 overflow-y-auto border-t border-gray-200">
                    {debugInfo.map((info, i) => (
                      <div key={i} className="text-gray-600 font-mono text-xs">{info}</div>
                    ))}
                  </div>
                </details>
              )}

              {/* Login Method Toggle */}
              <div className="inline-flex rounded-xl bg-gray-100 p-1 w-full">
                <button
                  type="button"
                  onClick={() => setLoginMethod('email')}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                    loginMethod === 'email'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('phone')}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                    loginMethod === 'phone'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Phone
                </button>
              </div>

              {/* Form */}
              <form onSubmit={loginMethod === 'email' ? handleEmailLogin : handlePhoneLogin} className="space-y-5">
                {loginMethod === 'email' ? (
                  <>
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                        Email address
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="admin@sellfast.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          required
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-24"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-orange-600 hover:text-orange-700 font-semibold"
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Link href="/forgot-password" className="text-sm text-orange-600 hover:text-orange-700 font-semibold">
                        Forgot password?
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
                        Phone Number
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="+1234567890"
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    {otpSent && (
                      <div>
                        <label htmlFor="otp" className="block text-sm font-semibold text-gray-900 mb-2">
                          Enter OTP
                        </label>
                        <input
                          id="otp"
                          name="otp"
                          type="text"
                          placeholder="123456"
                          required
                          maxLength={6}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center text-2xl tracking-widest font-semibold"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                    )}
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-orange-500 to-[#F56A34] text-white py-3.5 rounded-xl font-semibold hover:from-orange-600 hover:to-[#ff7f50] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Signing in...
                    </span>
                  ) : otpSent ? 'Verify OTP' : 'Sign in'}
                </button>
              </form>

              <p className="text-xs text-center text-gray-500">
                By continuing, you agree to SellFast's{' '}
                <Link href="/terms" className="text-orange-600 hover:underline font-medium">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-orange-600 hover:underline font-medium">Privacy Policy</Link>
              </p>
            </div>

            <div className="mt-8 text-center">
              <p className="text-gray-600">
                New to SellFast?{' '}
                <Link href="/signup" className="text-orange-600 font-semibold hover:text-orange-700">
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden min-h-screen flex flex-col">
        {/* Mobile Header */}
        <div className="orange-gradient text-white px-6 py-8">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold mb-6">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z"/>
              </svg>
            </div>
            SellFast
          </Link>
          <h1 className="text-2xl font-bold mb-2">Welcome back!</h1>
          <p className="text-white/90">Sign in to continue to your account</p>
        </div>

        {/* Mobile Form */}
        <div className="flex-1 bg-white px-6 py-8 -mt-6 rounded-t-3xl">
          <div className="space-y-6">
            {/* OAuth Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleOAuthLogin('google')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-sm font-semibold text-gray-700">Continue with Google</span>
              </button>

              <button
                onClick={() => handleOAuthLogin('facebook')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-sm font-semibold text-gray-700">Continue with Facebook</span>
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">Or</span>
              </div>
            </div>

            {/* Messages */}
            {message && (
              <div className="bg-green-50 border-l-4 border-green-400 text-green-700 px-4 py-3 rounded-r text-sm">
                {message}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-r text-sm">
                {error}
              </div>
            )}

            {/* Debug Info */}
            {debugInfo.length > 0 && (
              <details className="bg-gray-50 border border-gray-200 rounded-lg text-xs">
                <summary className="px-4 py-3 cursor-pointer font-medium text-gray-700">Debug Information</summary>
                <div className="px-4 py-3 space-y-1 max-h-48 overflow-y-auto border-t border-gray-200">
                  {debugInfo.map((info, i) => (
                    <div key={i} className="text-gray-600 font-mono text-xs">{info}</div>
                  ))}
                </div>
              </details>
            )}

            {/* Login Method Toggle */}
            <div className="inline-flex rounded-xl bg-gray-100 p-1 w-full">
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  loginMethod === 'email'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('phone')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  loginMethod === 'phone'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Phone
              </button>
            </div>

            {/* Form */}
            <form onSubmit={loginMethod === 'email' ? handleEmailLogin : handlePhoneLogin} className="space-y-5">
              {loginMethod === 'email' ? (
                <>
                  <div>
                    <label htmlFor="email-mobile" className="block text-sm font-semibold text-gray-900 mb-2">
                      Email address
                    </label>
                    <input
                      id="email-mobile"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="admin@sellfast.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="password-mobile" className="block text-sm font-semibold text-gray-900 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password-mobile"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-20"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
                      Forgot password?
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="phone-mobile" className="block text-sm font-semibold text-gray-900 mb-2">
                      Phone Number
                    </label>
                    <input
                      id="phone-mobile"
                      name="phone"
                      type="tel"
                      placeholder="+1234567890"
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  {otpSent && (
                    <div>
                      <label htmlFor="otp-mobile" className="block text-sm font-semibold text-gray-900 mb-2">
                        Enter OTP
                      </label>
                      <input
                        id="otp-mobile"
                        name="otp"
                        type="text"
                        placeholder="123456"
                        required
                        maxLength={6}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center text-2xl tracking-widest font-semibold"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  )}
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-[#F56A34] text-white py-4 rounded-xl font-semibold hover:from-orange-600 hover:to-[#ff7f50] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Signing in...
                  </span>
                ) : otpSent ? 'Verify OTP' : 'Sign in'}
              </button>
            </form>

            <p className="text-xs text-center text-gray-500">
              By continuing, you agree to SellFast's{' '}
              <Link href="/terms" className="text-orange-600 hover:underline font-medium">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-orange-600 hover:underline font-medium">Privacy Policy</Link>
            </p>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              New to SellFast?{' '}
              <Link href="/signup" className="text-blue-600 font-semibold hover:text-blue-700">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}