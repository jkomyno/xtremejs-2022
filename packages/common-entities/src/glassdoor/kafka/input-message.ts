import { z } from 'zod'
import { UserAuth } from '../user-auth'

/**
 * Kafka message received by the Glassdoor scraper consumer.
 */
export const InputMessage = z.object({
  auth: UserAuth,
})
export type InputMessage = z.infer<typeof InputMessage>
