import { z } from 'zod'

export const createOrderSchema = z.object({
    plan: z.enum(['MONTHLY', 'ANNUAL']),
})

export const cancelSubscriptionSchema = z.object({
    reason: z.string().max(500).optional(),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>
