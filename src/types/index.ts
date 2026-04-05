// src/types/index.ts
import { User, Message, Recipient, Keyholder, SwitchLog } from '@prisma/client'

export type UserWithMessages = User & {
  messages: (Message & { recipients: Recipient[] })[]
  keyholders: Keyholder[]
  _count?: { messages: number }
}

export type MessageWithRecipients = Message & {
  recipients: Recipient[]
  user?: { name: string | null; email: string | null }
}

export type DashboardStats = {
  totalUsers: number
  activeUsers: number
  totalMessages: number
  sentMessages: number
  triggeredSwitches: number
  newUsersThisMonth: number
}

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

// Form types
export type CreateMessageForm = {
  title: string
  content: string
  triggerType: 'SWITCH' | 'DATE' | 'KEYHOLDER'
  scheduledAt?: string
  recipients: {
    name: string
    email?: string
    phone?: string
    channel: 'EMAIL' | 'WHATSAPP' | 'SMS'
  }[]
}

export type SwitchSettingsForm = {
  enabled: boolean
  intervalDays: number
}
