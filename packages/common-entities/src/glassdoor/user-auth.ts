import { z } from 'zod'

/**
 * Authentication credentials for Glassdoor.
 */
export const UserAuth = z.object({
  email: z.string().min(4).email(),
  password: z.string().min(4),
})
export type UserAuth = z.infer<typeof UserAuth>
