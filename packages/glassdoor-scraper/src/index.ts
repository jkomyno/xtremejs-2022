/* eslint-disable no-multi-spaces */

import process from 'node:process'
import * as E from 'fp-ts/Either'
import { logger } from './logger'
import { subscribeAndScrape } from './scraper'
import { setup } from './setup/setup'

async function main() {
  const setupEither = await setup(process.env)()
  if (E.isLeft(setupEither)) {
    logger.error({ error: setupEither.left }, 'Setup error')
    process.exit(1)
  }

  const {
    config, // application configuration, read from the environment
    kafka, // kafka producers and consumers, ready to be used
    dispose, // function to be called when the server is shutting down
  } = setupEither.right

  logger.info(`Starting server ${config.APP_ID}`)

  /**
   * Handle promise rejections by treating them as uncaught exceptions.
   */
  process.on('unhandledRejection', <T>(unhandledRejection: Error, _: Promise<T>) => {
    logger.error({ unhandledRejection }, 'unhandledRejection')

    // send the control from 'unhandledRejection' handler to 'uncaughtException'
    throw unhandledRejection
  })

  /**
   * Handle all uncaught exceptions by attempting a graceful shutdown and forcefully
   * exit the process.
   * It is expected that some other service will re-attempt to spin this Node.js
   * server instance up after the shutdown.
   */
  process.on('uncaughtException', async (uncaughtException: Error) => {
    logger.error({ uncaughtException }, 'uncaughtException')

    try {
      await dispose()
    } catch (error) {
      logger.error({ error }, 'Failed to close connection to Kafka')
    } finally {
      process.exit(2)
    }
  })

  /**
   * Attempt a graceful shutdown when the user sends an interrupt signal to the console
   * (e.g., Ctrl+C).
   */
  for (const signal of ['SIGINT', 'SIGABRT'] as const) {
    process.once(signal, async () => {
      logger.info({ signal }, 'Closing server after receiving signal')
      await dispose()
      process.exit(0)
    })
  }

  /**
   * Start long running Kafka consume-and-produce tasks.
   */
  await subscribeAndScrape({ config, kafka })
}

main()
