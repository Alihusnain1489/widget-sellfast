'use client'

import { signIn } from 'next-auth/react'

interface AuthButtonProps {
  provider: 'google' | 'facebook'
  children: React.ReactNode
}

export default function AuthButton({ provider, children }: AuthButtonProps) {
  const handleClick = () => {
    signIn(provider, { callbackUrl: '/dashboard' })
  }

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 transition"
    >
      {children}
    </button>
  )
}

