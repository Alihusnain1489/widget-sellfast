'use client'

import { useState, useLayoutEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

interface FieldErrors {
  [key: string]: string
}

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    username: ''
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [signupMethod, setSignupMethod] = useState<'email' | 'phone'>('email')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Check if user is already signed in
  useLayoutEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        if (user) {
          // User is already signed in, redirect
          const redirectParam = searchParams.get('redirect')
          const redirectPath = redirectParam || '/dashboard'
          router.push(redirectPath)
        }
      } catch (e) {
        // Invalid user data, continue with signup
      }
    }
  }, [router, searchParams])

  const clearFieldError = (fieldName: string) => {
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    clearFieldError(field)
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    if (!otpSent) {
      // Step 1: Validate and send OTP
      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
        setFieldErrors({ general: 'All required fields must be filled' })
        return
      }

    if (formData.password !== formData.confirmPassword) {
        setFieldErrors({ confirmPassword: 'Passwords do not match' })
      return
    }

    if (formData.password.length < 6) {
        setFieldErrors({ password: 'Password must be at least 6 characters' })
        return
      }

      // Validate username format if provided
      if (formData.username) {
        const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
        if (!usernameRegex.test(formData.username)) {
          setFieldErrors({ username: 'Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens' })
          return
        }
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        setFieldErrors({ email: 'Invalid email format' })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'send-otp',
          name: formData.name,
          email: formData.email,
            password: formData.password,
            username: formData.username || undefined,
            phone: formData.phone || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
          // Handle field-specific errors
          if (data.field && data.field !== 'general') {
            const errorMessage = data.suggestion 
              ? `${data.error} ${data.suggestion}` 
              : data.error
            setFieldErrors({ [data.field]: errorMessage })
          } else {
            setFieldErrors({ general: data.error || 'Failed to send OTP' })
          }
        setLoading(false)
        return
      }

        setOtpSent(true)
        setFieldErrors({})
        setLoading(false)
      } catch (err) {
        setFieldErrors({ general: 'Network error. Please try again.' })
        setLoading(false)
      }
    } else {
      // Step 2: Verify OTP and create account
      if (!otpCode || otpCode.length !== 6) {
        setFieldErrors({ otp: 'Please enter a valid 6-digit OTP' })
        return
      }

      setLoading(true)

      try {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verify-and-create',
            name: formData.name,
            email: formData.email,
            password: formData.password,
            username: formData.username || undefined,
            phone: formData.phone || undefined,
            otpCode: otpCode
          })
        })

        const data = await response.json()

        if (!response.ok) {
          // Handle field-specific errors
          if (data.field && data.field !== 'general') {
            const errorMessage = data.suggestion 
              ? `${data.error} ${data.suggestion}` 
              : data.error
            setFieldErrors({ [data.field]: errorMessage })
          } else {
            setFieldErrors({ general: data.error || 'Invalid OTP or signup failed' })
          }
          setLoading(false)
          return
        }

        // Store user data
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user))
        }

      // Auto-login after signup
      try {
        const signInResult = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false
        })

        if (signInResult?.ok) {
            // Check for redirect parameter
            const redirectParam = searchParams.get('redirect')
            const redirectPath = redirectParam || '/dashboard'
            router.push(redirectPath)
        } else {
          router.push('/login?message=Account created successfully. Please sign in.')
        }
      } catch (err: any) {
        console.error('Auto-login error:', err)
        router.push('/login?message=Account created successfully. Please sign in.')
      }
    } catch (err) {
        setFieldErrors({ general: 'Network error. Please try again.' })
      setLoading(false)
      }
    }
  }

  const handlePhoneSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    if (!otpSent) {
      if (!formData.name) {
        setFieldErrors({ name: 'Name is required' })
        return
      }

      setLoading(true)
      try {
        const response = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: formData.phone,
            type: 'signup'
          })
        })

        const data = await response.json()

        if (!response.ok) {
          if (data.field) {
            setFieldErrors({ [data.field]: data.error })
          } else {
            setFieldErrors({ general: data.error || 'Failed to send OTP' })
          }
          setLoading(false)
          return
        }

        setOtpSent(true)
        setFieldErrors({})
        setLoading(false)
      } catch (err) {
        setFieldErrors({ general: 'Network error. Please try again.' })
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
            type: 'signup',
            name: formData.name
          })
        })

        const data = await response.json()

        if (!response.ok) {
          setFieldErrors({ otp: data.error || 'Invalid OTP' })
          setLoading(false)
          return
        }

        // Store user data if provided
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user))
        }

        // Check for redirect parameter
        const redirectParam = searchParams.get('redirect')
        const redirectPath = redirectParam || '/dashboard'
        router.push(redirectPath)
      } catch (err) {
        setFieldErrors({ general: 'Network error. Please try again.' })
        setLoading(false)
      }
    }
  }

  const handleOAuthSignup = async (provider: 'google' | 'facebook') => {
    try {
      setLoading(true)
      setFieldErrors({})
      await signIn(provider, { 
        callbackUrl: '/dashboard',
        redirect: true 
      })
    } catch (error: any) {
      console.error(`OAuth signup error (${provider}):`, error)
      setFieldErrors({ general: `Failed to signup with ${provider}. Please try again.` })
      setLoading(false)
    }
  }

  const InputField = ({ 
    id, 
    label, 
    type = 'text', 
    required = false, 
    value, 
    onChange, 
    placeholder,
    autoComplete,
    errorKey
  }: {
    id: string
    label: string
    type?: string
    required?: boolean
    value: string
    onChange: (value: string) => void
    placeholder?: string
    autoComplete?: string
    errorKey: string
  }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-900 mb-2">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
          fieldErrors[errorKey] ? 'border-red-500 bg-red-50' : 'border-gray-200'
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {fieldErrors[errorKey] && (
        <p className="text-red-600 text-sm mt-1.5 flex items-start gap-1">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          {fieldErrors[errorKey]}
        </p>
      )}
    </div>
  )

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
              Join thousands of<br />happy sellers
            </h1>
            <p className="text-xl text-white/90 max-w-md">
              Start your journey today. List your items, reach buyers instantly, and grow your business with SellFast's powerful marketplace tools.
            </p>
            
            {/* Features */}
            <div className="space-y-4 pt-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Lightning Fast</h3>
                  <p className="text-white/80">List items in seconds and reach buyers instantly</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Secure & Safe</h3>
                  <p className="text-white/80">Your data is protected with enterprise-grade security</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Growing Community</h3>
                  <p className="text-white/80">Join 10,000+ active buyers and sellers</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-sm text-white/70">
            © 2024 SellFast. All rights reserved.
          </div>
        </div>

        {/* Right side - Signup form */}
        <div className="flex items-center justify-center p-12 overflow-y-auto">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h2>
              <p className="text-gray-600">Start selling in minutes. It's free and easy!</p>
            </div>

            <div className="space-y-6">
              {/* OAuth Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleOAuthSignup('google')}
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
                  onClick={() => handleOAuthSignup('facebook')}
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

              {/* General Error Message */}
              {fieldErrors.general && (
                <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-r text-sm flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                  {fieldErrors.general}
                </div>
              )}

              {/* Signup Method Toggle */}
              <div className="inline-flex rounded-xl bg-gray-100 p-1 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setSignupMethod('email')
                    setFieldErrors({})
                  }}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                    signupMethod === 'email'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSignupMethod('phone')
                    setFieldErrors({})
                  }}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                    signupMethod === 'phone'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Phone
                </button>
              </div>

              {/* Form */}
              <form onSubmit={signupMethod === 'email' ? handleEmailSignup : handlePhoneSignup} className="space-y-5">
                {signupMethod === 'email' ? (
                  <>
                     {!otpSent ? (
                       <>
                         <InputField
                        id="name"
                           label="Full Name"
                        required
                        value={formData.name}
                           onChange={(value) => handleChange('name', value)}
                        placeholder="John Doe"
                           autoComplete="name"
                           errorKey="name"
                         />
                         
                         <InputField
                           id="username"
                           label="Username (Optional)"
                           value={formData.username}
                           onChange={(value) => handleChange('username', value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                           placeholder="johndoe"
                           autoComplete="username"
                           errorKey="username"
                         />

                         <InputField
                        id="email"
                           label="Email address"
                        type="email"
                        required
                        value={formData.email}
                           onChange={(value) => handleChange('email', value)}
                        placeholder="your@email.com"
                           autoComplete="email"
                           errorKey="email"
                         />

                         <InputField
                           id="phone-opt"
                           label="Phone (Optional)"
                           type="tel"
                           value={formData.phone}
                           onChange={(value) => handleChange('phone', value)}
                           placeholder="+1234567890"
                           autoComplete="tel"
                           errorKey="phone"
                         />

                    <div>
                      <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                               className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all pr-24 ${
                                 fieldErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-200'
                               }`}
                          value={formData.password}
                               onChange={(e) => handleChange('password', e.target.value)}
                          placeholder="At least 6 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-orange-600 hover:text-orange-700 font-semibold"
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                           {fieldErrors.password && (
                             <p className="text-red-600 text-sm mt-1.5 flex items-start gap-1">
                               <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                               </svg>
                               {fieldErrors.password}
                             </p>
                           )}
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900 mb-2">
                        Confirm Password
                      </label>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                             className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
                               fieldErrors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-200'
                             }`}
                        value={formData.confirmPassword}
                             onChange={(e) => handleChange('confirmPassword', e.target.value)}
                        placeholder="Re-enter your password"
                      />
                           {fieldErrors.confirmPassword && (
                             <p className="text-red-600 text-sm mt-1.5 flex items-start gap-1">
                               <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                               </svg>
                               {fieldErrors.confirmPassword}
                             </p>
                           )}
                    </div>
                  </>
                ) : (
                    <div>
                         <label htmlFor="otp" className="block text-sm font-semibold text-gray-900 mb-2">
                           Enter OTP sent to {formData.email}
                      </label>
                      <input
                           id="otp"
                           name="otp"
                        type="text"
                           placeholder="123456"
                        required
                           maxLength={6}
                           className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-center text-2xl tracking-widest font-semibold ${
                             fieldErrors.otp ? 'border-red-500 bg-red-50' : 'border-gray-200'
                           }`}
                           value={otpCode}
                           onChange={(e) => {
                             setOtpCode(e.target.value.replace(/\D/g, ''))
                             clearFieldError('otp')
                           }}
                         />
                         {fieldErrors.otp && (
                           <p className="text-red-600 text-sm mt-1.5 flex items-start gap-1">
                             <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                               <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                             </svg>
                             {fieldErrors.otp}
                           </p>
                         )}
                         <button
                           type="button"
                           onClick={() => {
                             setOtpSent(false)
                             setOtpCode('')
                             setFieldErrors({})
                           }}
                           className="mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium"
                         >
                           Change email
                         </button>
                       </div>
                     )}
                    </>
                  ) : (
                  <>
                    <InputField
                      id="name-phone"
                      label="Full Name"
                      required
                        value={formData.name}
                      onChange={(value) => handleChange('name', value)}
                        placeholder="John Doe"
                      errorKey="name"
                    />

                    <InputField
                        id="phone"
                      label="Phone Number"
                        type="tel"
                        required
                        value={formData.phone}
                      onChange={(value) => handleChange('phone', value)}
                      placeholder="+1234567890"
                      autoComplete="tel"
                      errorKey="phone"
                      />

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
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-center text-2xl tracking-widest font-semibold ${
                            fieldErrors.otp ? 'border-red-500 bg-red-50' : 'border-gray-200'
                          }`}
                          value={otpCode}
                          onChange={(e) => {
                            setOtpCode(e.target.value.replace(/\D/g, ''))
                            clearFieldError('otp')
                          }}
                        />
                        {fieldErrors.otp && (
                          <p className="text-red-600 text-sm mt-1.5 flex items-start gap-1">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                            </svg>
                            {fieldErrors.otp}
                          </p>
                        )}
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
                      {otpSent ? 'Verifying OTP...' : 'Sending OTP...'}
                    </span>
                  ) : signupMethod === 'email' && otpSent ? 'Verify OTP & Create Account' : signupMethod === 'phone' && otpSent ? 'Verify OTP & Join' : 'Send OTP & Continue'}
                </button>
              </form>

              <p className="text-xs text-center text-gray-500">
                By continuing, you agree to SellFast's{' '}
                <Link href="/terms" className="text-orange-600 hover:underline font-medium">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-orange-600 hover:underline font-medium">Privacy Policy</Link>
              </p>
            </div>

            <div className="mt-8 text-center space-y-4">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-orange-600 font-semibold hover:text-orange-700">
                  Sign in
                </Link>
              </p>
              <p className="text-sm text-gray-500">
                Looking for business solutions?{' '}
                <Link href="/business-help" className="text-orange-600 hover:underline font-medium">
                  Get help
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden min-h-screen flex flex-col">
        {/* Mobile Header */}
        <div className="bg-gradient-to-r from-orange-500 to-[#F56A34] text-white px-6 py-8">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold mb-6">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z"/>
              </svg>
            </div>
            SellFast
          </Link>
          <h1 className="text-2xl font-bold mb-2">Join SellFast today</h1>
          <p className="text-white/90">Start selling in minutes. It's free!</p>
        </div>

        {/* Mobile Form */}
        <div className="flex-1 bg-white px-6 py-8 -mt-6 rounded-t-3xl">
          <div className="space-y-6">
            {/* OAuth Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleOAuthSignup('google')}
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
                onClick={() => handleOAuthSignup('facebook')}
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

            {/* General Error Message */}
            {fieldErrors.general && (
              <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-r text-sm flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
                {fieldErrors.general}
              </div>
            )}

            {/* Signup Method Toggle */}
            <div className="inline-flex rounded-xl bg-gray-100 p-1 w-full">
              <button
                type="button"
                onClick={() => {
                  setSignupMethod('email')
                  setFieldErrors({})
                }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  signupMethod === 'email'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignupMethod('phone')
                  setFieldErrors({})
                }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  signupMethod === 'phone'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Phone
              </button>
            </div>

            {/* Form */}
            <form onSubmit={signupMethod === 'email' ? handleEmailSignup : handlePhoneSignup} className="space-y-5">
              {signupMethod === 'email' ? (
                <>
                  {!otpSent ? (
                    <>
                      <InputField
                      id="name-mobile"
                        label="Full Name"
                      required
                      value={formData.name}
                        onChange={(value) => handleChange('name', value)}
                      placeholder="John Doe"
                        autoComplete="name"
                        errorKey="name"
                      />
                      
                      <InputField
                        id="username-mobile"
                        label="Username (Optional)"
                        value={formData.username}
                        onChange={(value) => handleChange('username', value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                        placeholder="johndoe"
                        autoComplete="username"
                        errorKey="username"
                      />

                      <InputField
                      id="email-mobile"
                        label="Email address"
                      type="email"
                      required
                      value={formData.email}
                        onChange={(value) => handleChange('email', value)}
                      placeholder="your@email.com"
                        autoComplete="email"
                        errorKey="email"
                      />

                      <InputField
                        id="phone-mobile-opt"
                        label="Phone (Optional)"
                        type="tel"
                        value={formData.phone}
                        onChange={(value) => handleChange('phone', value)}
                        placeholder="+1234567890"
                        autoComplete="tel"
                        errorKey="phone"
                      />

                  <div>
                    <label htmlFor="password-mobile" className="block text-sm font-semibold text-gray-900 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password-mobile"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all pr-20 ${
                              fieldErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-200'
                            }`}
                        value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                        placeholder="At least 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-orange-600 hover:text-orange-700 font-semibold"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                        {fieldErrors.password && (
                          <p className="text-red-600 text-sm mt-1.5 flex items-start gap-1">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                            </svg>
                            {fieldErrors.password}
                          </p>
                        )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword-mobile" className="block text-sm font-semibold text-gray-900 mb-2">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword-mobile"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
                            fieldErrors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-200'
                          }`}
                      value={formData.confirmPassword}
                          onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      placeholder="Re-enter your password"
                    />
                        {fieldErrors.confirmPassword && (
                          <p className="text-red-600 text-sm mt-1.5 flex items-start gap-1">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                            </svg>
                            {fieldErrors.confirmPassword}
                          </p>
                        )}
                  </div>
                </>
              ) : (
                  <div>
                      <label htmlFor="otp-mobile" className="block text-sm font-semibold text-gray-900 mb-2">
                        Enter OTP sent to {formData.email}
                    </label>
                    <input
                        id="otp-mobile"
                        name="otp"
                      type="text"
                        placeholder="123456"
                      required
                        maxLength={6}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-center text-2xl tracking-widest font-semibold ${
                          fieldErrors.otp ? 'border-red-500 bg-red-50' : 'border-gray-200'
                        }`}
                        value={otpCode}
                        onChange={(e) => {
                          setOtpCode(e.target.value.replace(/\D/g, ''))
                          clearFieldError('otp')
                        }}
                      />
                      {fieldErrors.otp && (
                        <p className="text-red-600 text-sm mt-1.5 flex items-start gap-1">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                          </svg>
                          {fieldErrors.otp}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false)
                          setOtpCode('')
                          setFieldErrors({})
                        }}
                        className="mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium"
                      >
                        Change email
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <InputField
                    id="name-phone-mobile"
                    label="Full Name"
                    required
                      value={formData.name}
                    onChange={(value) => handleChange('name', value)}
                      placeholder="John Doe"
                    errorKey="name"
                  />

                  <InputField
                      id="phone-mobile"
                    label="Phone Number"
                      type="tel"
                      required
                      value={formData.phone}
                    onChange={(value) => handleChange('phone', value)}
                    placeholder="+1234567890"
                    autoComplete="tel"
                    errorKey="phone"
                    />

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
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-center text-2xl tracking-widest font-semibold ${
                          fieldErrors.otp ? 'border-red-500 bg-red-50' : 'border-gray-200'
                        }`}
                        value={otpCode}
                        onChange={(e) => {
                          setOtpCode(e.target.value.replace(/\D/g, ''))
                          clearFieldError('otp')
                        }}
                      />
                      {fieldErrors.otp && (
                        <p className="text-red-600 text-sm mt-1.5 flex items-start gap-1">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                          </svg>
                          {fieldErrors.otp}
                        </p>
                      )}
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
                    {otpSent ? 'Verifying OTP...' : 'Sending OTP...'}
                  </span>
                ) : signupMethod === 'email' && otpSent ? 'Verify OTP & Create Account' : signupMethod === 'phone' && otpSent ? 'Verify OTP & Join' : 'Send OTP & Continue'}
              </button>
            </form>

            <p className="text-xs text-center text-gray-500">
              By continuing, you agree to SellFast's{' '}
              <Link href="/terms" className="text-orange-600 hover:underline font-medium">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-orange-600 hover:underline font-medium">Privacy Policy</Link>
            </p>
          </div>

          <div className="mt-8 text-center space-y-4">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-orange-600 font-semibold hover:text-orange-700">
                Sign in
              </Link>
            </p>
            <p className="text-sm text-gray-500">
              Looking for business solutions?{' '}
              <Link href="/business-help" className="text-orange-600 hover:underline font-medium">
                Get help
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center">
          <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <SignupContent />
    </Suspense>
  )
}