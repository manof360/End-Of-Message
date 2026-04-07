// src/lib/auth.ts
import { NextAuthOptions, DefaultSession } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { Account, User } from 'next-auth'
import { prisma } from './prisma'

// Extend User type to include custom fields
declare module 'next-auth' {
  interface User {
    role?: 'USER' | 'ADMIN'
    plan?: 'FREE' | 'BASIC' | 'PREMIUM'
  }

  interface Session extends DefaultSession {
    user: {
      id: string
      role: 'USER' | 'ADMIN'
      plan: 'FREE' | 'BASIC' | 'PREMIUM'
    } & DefaultSession['user']
  }
}

const googleScopes = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.file',
].join(' ')

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: googleScopes,
          access_type: 'offline',
          prompt: 'consent',  // Always show consent to get refresh_token + Drive permission
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }: { user: User; account: Account | null }) {
      if (user?.id && account) {
        try {
          // Save account data including scope and tokens
          if (account.provider === 'google' && account.scope) {
            // Scope might be space-separated or comma-separated
            const normalizedScope = account.scope.replace(/,/g, ' ')
            
            // Update account with scope if not already saved
            const existingAccount = await prisma.account.findFirst({
              where: {
                userId: user.id,
                provider: 'google',
              },
            })

            if (existingAccount && !existingAccount.scope) {
              await prisma.account.update({
                where: { id: existingAccount.id },
                data: { scope: normalizedScope },
              })
            }
          }

          // Reset dead man's switch on every login
          await prisma.user.update({
            where: { id: user.id },
            data: {
              lastLoginAt: new Date(),
              switchLastCheckin: new Date(),
              switchStatus: 'ACTIVE',
            },
          })

          await prisma.switchLog.create({
            data: { 
              userId: user.id, 
              event: 'CHECKIN', 
              details: 'Signed in via Google' 
            },
          })
        } catch (error) {
          console.error('[Auth] Error in signIn callback:', error)
          // Don't block sign-in on callback error
        }
      }
      return true
    },

    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        session.user.role = (user as any).role ?? 'USER'
        session.user.plan = (user as any).plan ?? 'FREE'
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60,
  },
}
