import { AuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import FacebookProvider from 'next-auth/providers/facebook'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './db'
import { comparePassword } from './auth'

interface ExtendedUser {
  id: string
  email?: string | null
  name?: string | null
  role?: string
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.password) {
          return null
        }

        const isValid = await comparePassword(credentials.password, user.password)

        if (!isValid) {
          return null
        }

        if (!user.isActive) {
          throw new Error('Account is disabled')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' || account?.provider === 'facebook') {
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: user.email },
              { providerId: account.providerAccountId }
            ]
          }
        })

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email || '',
              name: user.name || '',
              image: user.image,
              provider: account.provider,
              providerId: account.providerAccountId,
              emailVerified: true,
              role: 'USER',
              isActive: true
            }
          })
        } else {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              provider: account.provider,
              providerId: account.providerAccountId,
              image: user.image || existingUser.image,
            }
          })
        }
      }
      return true
    },
    async jwt({ token, user }: {
      token: any
      user?: ExtendedUser
    }) {
      if (user) {
        token.id = user.id
        token.role = user.role || 'USER'
      }
      
      // Fetch user role from database if not in token
      if (token.email && !token.role) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true, role: true }
          })
          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role
          }
        } catch (error) {
          console.error('JWT callback error:', error)
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
    signOut: '/',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key'
}