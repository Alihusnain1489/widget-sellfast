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

export async function requireAdmin(request: NextRequest) {
  const user = getUser(request)
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  // Check if user is admin
  const { prisma } = await import('@/lib/db')
  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { role: true },
  })
  
  if (!dbUser || dbUser.role !== 'ADMIN') {
    throw new Error('Forbidden')
  }
  
  return user
}

