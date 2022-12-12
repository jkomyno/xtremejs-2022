import { getGlassdoorScraperMachine } from '@jkomyno/glassdoor-scraper-fsm'
import { Producer as KafkaProducer, Consumer as KafkaConsumer } from 'kafkajs'
import { AppConfig } from '../config/AppConfig'
import { logger } from '../logger'
import { scraperJob } from './scraperJob'

type SubscribeAndScrapeParams = {
  config: AppConfig
  kafka: {
    producer: KafkaProducer
    consumer: KafkaConsumer
  }
}

export async function subscribeAndScrape({ kafka, config }: SubscribeAndScrapeParams) {
  const inputTopic = config.KAFKA_INPUT_TOPIC
  logger.info({ inputTopic }, 'subscribing to input topic...')

  // Get the state machine definition that will be used to scrape Glassdoor
  const glassdoorScraperMachine = getGlassdoorScraperMachine({
    storeReadable: async (_readable) => {
      // TODO: in production, store the resumes in an Object storage like S3
      return Promise.resolve('file://resume.pdf')
    },
  })

  // Tell Kafka to prepare the consumer for receiving messages from the given input topic
  await kafka.consumer.subscribe({
    topic: inputTopic,
  })

  // Start a long-running process that will pull and consume messages from the input Kafka topic
  await kafka.consumer.run({
    eachMessage: scraperJob({ producer: kafka.producer, config, fsm: glassdoorScraperMachine }),
  })
}
