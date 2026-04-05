// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request Drive access to store messages
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/drive.file', // Create/read files created by app
          ].join(' '),
          access_type: 'offline',  // Get refresh token
          prompt: 'consent',       // Always show consent to get refresh_token
        },
      },
    }),
  ],

  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        session.user.role = (user as any).role
        session.user.plan = (user as any).plan
      }
      return session
    },

    async signIn({ user, account }) {
      // Update last login time
      if (user.email) {
        await prisma.user.update({
          where: { email: user.email },
          data: { 
            lastLoginAt: new Date(),
            switchLastCheckin: new Date(), // Reset dead man's switch on login
          },
        }).catch(() => {}) // Ignore if user doesn't exist yet (first sign in)
      }

      // Log the check-in
      if (user.id) {
        await prisma.switchLog.create({
          data: {
            userId: user.id,
            event: 'CHECKIN',
            details: 'Signed in via Google',
          },
        }).catch(() => {})
      }

      return true
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  events: {
    async createUser({ user }) {
      // New user registered - create their Google Drive folder
      console.log(`New user registered: ${user.email}`)
    },
  },
}

// Extend next-auth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: 'USER' | 'ADMIN'
      plan: 'FREE' | 'BASIC' | 'PREMIUM'
    }
  }
}
