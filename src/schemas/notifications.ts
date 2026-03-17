import { z } from 'zod'

export const notificationsStateSchema = z.object({
  instantAlerts: z.boolean().default(true),
  emailAlerts: z.boolean().default(true),
  dailyDigest: z.boolean().default(false),
})

export type NotificationsState = z.infer<typeof notificationsStateSchema>
