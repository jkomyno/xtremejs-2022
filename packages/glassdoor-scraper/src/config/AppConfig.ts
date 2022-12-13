import { z } from 'zod'

export const AppConfig = z.object({
  // The unique name of the Node.js application.
  // Also used as the Kafka consumer group ID.
  APP_ID: z.string().min(1),

  // comma-separated list of Kafka brokers.
  KAFKA_BROKER_LIST: z.string().min(1).default('localhost:9092'),

  // Topic to which the Kafka consumer subscribes.
  KAFKA_INPUT_TOPIC: z.string().min(1).default('input-glassdoor'),

  // Topic to which the Kafka producer publishes messages when the scraper succeeds.
  KAFKA_OUTPUT_SUCCESS_TOPIC: z.string().min(1).default('output-success-glassdoor'),

  // Topic to which the Kafka producer publishes messages when the scraper fails.
  KAFKA_OUTPUT_FAILURE_TOPIC: z.string().min(1).default('output-success-glassdoor'),

  // The maximum amount of time to wait for the scraper to complete one job.
  FSM_JOB_TIMEOUT_MS: z.preprocess(
    (value) => parseInt((value as string) ?? '60_000', 10),
    z.number().min(1),
  ),

  // context in which the Node.js server is run. Default: 'development'.
  NODE_ENV: z
    .union([z.literal('development'), z.literal('production'), z.literal('test'), z.undefined()])
    .default('development'),
})
export type AppConfig = z.infer<typeof AppConfig>
