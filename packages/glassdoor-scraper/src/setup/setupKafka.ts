import * as TE from 'fp-ts/lib/TaskEither'
import { identity } from 'fp-ts/lib/function'
import { Kafka, logLevel } from 'kafkajs'

type Config = {
  kafkaConfig: {
    brokers: string[]
    clientId: string
  }
  kafkaConsumerConfig: {
    groupId: string
  }
}

/**
 * Setup Kafka succeeding when the connection is established to both the Kafka producer and consumer,
 * returning a reference to both.
 * In case of errors, the async function fails early in an Either.left context.
 */
export function setupKafka({ kafkaConfig, kafkaConsumerConfig }: Config) {
  return TE.tryCatch(async () => {
    const kafka = new Kafka({
      logLevel: logLevel.INFO,
      retry: {
        initialRetryTime: 200,
        retries: 3,
      },
      ...kafkaConfig,
    })

    const producer = kafka.producer({
      allowAutoTopicCreation: true,
    })
    const consumer = kafka.consumer(kafkaConsumerConfig)

    await Promise.all([producer.connect(), consumer.connect()])

    /**
     * Function to be called when the server is shutting down.
     */
    async function dispose() {
      await consumer.disconnect()
      await producer.disconnect()
    }

    return { producer, consumer, dispose }
  }, identity)
}
