import * as E from 'fp-ts/lib/Either'
import { getGlassdoorScraperMachine } from '@jkomyno/glassdoor-scraper-fsm'
import { ContextFromState } from '@jkomyno/glassdoor-scraper-fsm/lib/types'
import { OutputSuccessMessage, OutputFailureMessage } from '@jkomyno/common-entities/lib/glassdoor/kafka'
import { Producer as KafkaProducer, EachMessageHandler, Message } from 'kafkajs'
import { nanoid } from 'nanoid'
import { interpret } from 'xstate'
import { waitFor } from 'xstate/lib/waitFor'
import { match } from 'ts-pattern'
import { parseInputMessage } from './parseInputMessage'
import { AppConfig } from '../config/AppConfig'
import { logger } from '../logger'
import { serializeMessage } from './serializeMessage'

type ScraperJobParams = {
  config: AppConfig
  producer: KafkaProducer
  fsm: ReturnType<typeof getGlassdoorScraperMachine>
}

/**
 * Given an input message, start a Glassdoor scraping job with the authentication credentials provided in the message.
 *
 */
export function scraperJob({ producer, config, fsm }: ScraperJobParams): EachMessageHandler {
  return async (inputPayload) => {
    /**
     * Generate a unique message key for this job, to be used as a correlation ID for the Kafka messages.
     */
    const key = nanoid()
    logger.info({ key }, 'Running job with key...')

    /* Parse input Kafka message */
    const inputMessageEither = parseInputMessage(inputPayload)
    if (E.isLeft(inputMessageEither)) {
      const error = inputMessageEither.left
      logger.error({ error }, 'Failed to parse input message')
      return
    }
    const inputMessage = inputMessageEither.right

    /* Create a new xstate interpreter instance for `fsm` */
    const service = interpret(fsm).onTransition((state) => {
      logger.info({ state: state.value }, 'Transitioning to...')
      logger.info({ kind: state.context.kind }, '  context...')
    })
    const actor = service.start()

    /* Keep track of the time it takes to complete the scrape job */
    const chronoStart = process.hrtime.bigint()

    /* Kick off the finite-state machine, providing authentication details */
    service.send({
      type: 'START',
      auth: inputMessage.auth,
    })

    /**
     * Wait for the machine to reach a final state, or fail with a timeout error.
     * TODO (exercise): handle this potential timeout error.
     */
    const finalState = await waitFor(actor, (state) => state.matches('success') || state.matches('failure'), {
      timeout: config.FSM_JOB_TIMEOUT_MS,
    })

    /* The FSM has terminated its execution, end timer */
    const chronoEnd = process.hrtime.bigint()
    const chronoTimeMS = Number(chronoEnd - chronoStart) / 1e6

    /**
     * Once the FSM has reached a final state, send a Kafka message to the output topic.
     *
     * TODO (exercise): is it safe to immediately return `sendSuccessMessage` and
     * `sendFailureMessage` without `await`ing them?
     */
    const ctx = match(finalState)
      .when(
        (state) => state.matches('success'),
        (state) => {
          const ctx = state.context as ContextFromState<'success'>
          sendSuccessMessage({ ctx, chronoTimeMS, config, key, producer })
          return ctx
        },
      )
      .otherwise((state) => {
        const ctx = state.context as ContextFromState<'failure'>
        sendFailureMessage({ ctx, chronoTimeMS, config, key, producer })
        return ctx
      })

    /* release Playwright resources */
    await ctx.browser.dispose()

    /* explicitly mark the FSM as stopped, destroying every event listener */
    actor.stop()
  }
}

type SendSuccessMessageParams = {
  ctx: ContextFromState<'success'>
  chronoTimeMS: number
  config: AppConfig
  key: string
  producer: KafkaProducer
}

/**
 * Send a Kafka message to the success output topic containing the scraped data.
 */
async function sendSuccessMessage({ ctx, chronoTimeMS, config, key, producer }: SendSuccessMessageParams) {
  const outputTopic = config.KAFKA_OUTPUT_SUCCESS_TOPIC

  const { userData, resumeURLs } = ctx
  const value: OutputSuccessMessage = {
    payload: {
      userData,
      resumeURLs,
    },
    meta: {
      ms: chronoTimeMS,
    },
  }

  logger.info({ key, outputTopic, value }, 'Sending success message...')

  const message: Message = serializeMessage({ key, value })
  await producer.send({
    topic: outputTopic,
    messages: [message],
  })
  logger.info({ key, outputTopic, message }, 'Message sent')
}

type SendFailureMessageParams = {
  ctx: ContextFromState<'failure'>
  chronoTimeMS: number
  config: AppConfig
  key: string
  producer: KafkaProducer
}

/**
 * Send a Kafka message to the failure output topic containing details about the failure.
 */
async function sendFailureMessage({ ctx, chronoTimeMS, config, key, producer }: SendFailureMessageParams) {
  const outputTopic = config.KAFKA_OUTPUT_FAILURE_TOPIC

  const { reason } = ctx
  const value: OutputFailureMessage = {
    payload: {
      reason,
    },
    meta: {
      ms: chronoTimeMS,
    },
  }

  logger.info({ key, outputTopic, value }, 'Sending failure message...')

  const message: Message = serializeMessage({ key, value })
  await producer.send({
    topic: outputTopic,
    messages: [message],
  })
  logger.info({ key, outputTopic, message }, 'Failure message sent')
}
