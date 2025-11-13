import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Database URL configuration for MongoDB Atlas
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set!')
  console.error('Please set DATABASE_URL in your .env.local file with your MongoDB Atlas connection string.')
  throw new Error('DATABASE_URL is required')
}

// Log database connection info
if (process.env.NODE_ENV === 'development') {
  const dbUrl = process.env.DATABASE_URL
  // Mask password in logs
  const maskedUrl = dbUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
  console.log('Database Provider: MongoDB Atlas')
  console.log('Database URL:', maskedUrl)
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

