import { z } from 'zod'

/**
 * Kafka message published by the Glassdoor scraper consumer on failure.
 */
export const OutputFailureMessage = z.object({
  payload: z.object({
    // the reason why the scraping job failed
    reason: z.string(),
  }),
  meta: z.object({
    // how many milliseconds elapsed since the scraping job was started
    ms: z.number(),
  }),
})
export type OutputFailureMessage = z.infer<typeof OutputFailureMessage>
