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
      if (user?.id && account && account.provider === 'google') {
        try {
          console.log('[Auth] signIn callback - Google account:', {
            userId: user.id,
            hasAccessToken: !!account.access_token,
            hasRefreshToken: !!account.refresh_token,
            hasScope: !!account.scope,
          })

          // **IMPORTANT**: Explicitly save/update the account with all tokens
          // PrismaAdapter creates it, but we need to ensure tokens are saved
          const normalizedScope = account.scope?.replace(/,/g, ' ') || ''

          // Upsert account to ensure it's saved with tokens
          const savedAccount = await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: 'google',
                providerAccountId: account.providerAccountId,
              },
            },
            update: {
              // Update tokens if they changed
              access_token: account.access_token,
              refresh_token: account.refresh_token ?? undefined,
              expires_at: account.expires_at,
              scope: normalizedScope,
              token_type: account.token_type,
              id_token: account.id_token,
              session_state: account.session_state,
            },
            create: {
              userId: user.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: normalizedScope,
              id_token: account.id_token,
              session_state: account.session_state,
            },
          })

          console.log('[Auth] Account saved successfully:', {
            accountId: savedAccount.id,
            hasAccessToken: !!savedAccount.access_token,
            hasRefreshToken: !!savedAccount.refresh_token,
            scope: savedAccount.scope,
          })

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
          // Don't block sign-in on callback error, but log it
          console.error('[Auth] Callback error details:', {
            message: (error as any)?.message,
            code: (error as any)?.code,
          })
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
