import * as TE from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/function'
import { Producer as KafkaProducer, Consumer as KafkaConsumer } from 'kafkajs'
import { setupConfig } from './setupConfig'
import { AppConfig } from '../config/AppConfig'
import { setupKafka } from './setupKafka'

export type Setup = {
  config: AppConfig
  kafka: {
    producer: KafkaProducer
    consumer: KafkaConsumer
  }
  dispose: () => Promise<void>
}

export function setup(environment: Record<string, string | undefined>): TE.TaskEither<unknown, Setup> {
  return pipe(
    TE.Do,
    TE.bind('config', () => pipe(setupConfig(AppConfig)(environment), TE.fromEither)),
    TE.bind('kafka', ({ config }) => {
      return setupKafka({
        kafkaConfig: {
          clientId: config.APP_ID,
          brokers: config.KAFKA_BROKER_LIST.split(','),
        },
        kafkaConsumerConfig: {
          groupId: config.APP_ID,
        },
      })
    }),
    TE.bind('dispose', ({ kafka }) => TE.right(kafka.dispose)),
  )
}
