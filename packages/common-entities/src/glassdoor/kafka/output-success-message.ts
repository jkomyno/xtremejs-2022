import { z } from 'zod'
import { UserData } from '../user-data'

/**
 * Kafka message published by the Glassdoor scraper consumer on success.
 */
export const OutputSuccessMessage = z.object({
  payload: z.object({
    // the scraped user information
    userData: UserData,

    // the URLs of the scraped resumes
    resumeURLs: z.array(z.string()),
  }),
  meta: z.object({
    // how many milliseconds elapsed since the scraping job was started
    ms: z.number(),
  }),
})
export type OutputSuccessMessage = z.infer<typeof OutputSuccessMessage>
