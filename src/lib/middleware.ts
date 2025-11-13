import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './auth'

export function getUser(request: NextRequest): { userId: string } | null {
  const token = request.cookies.get('token')?.value
  if (!token) return null
  return verifyToken(token)
}

export function requireAuth(request: NextRequest): { userId: string } {
  const user = getUser(request)
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export function requireAdmin(request: NextRequest) {
  const user = getUser(request)
  if (!user) {
    throw new Error('Unauthorized')
  }
  // We'll check if user is admin in the actual API route
  return user
}

