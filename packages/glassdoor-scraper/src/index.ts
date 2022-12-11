import { getGlassdoorScraperMachine } from '@jkomyno/glassdoor-scraper-fsm'
import { ContextFromState } from '@jkomyno/glassdoor-scraper-fsm/lib/types'
import { interpret } from 'xstate'
import { waitFor } from 'xstate/lib/waitFor'
import { match } from 'ts-pattern'

async function main() {
  const glassdoorScraperMachine = getGlassdoorScraperMachine({
    storeReadable: async (_readable) => {
      // TODO: in production, store the resumes in an Object storage like S3
      return Promise.resolve('file://resume.pdf')
    },
  })

  const service = interpret(glassdoorScraperMachine)
    .onTransition((state) => {
      console.log('Transitioning to ', state.value)
      console.log('  context', state.context.kind)
    })
  const actor = service.start()

  const chronoStart = process.hrtime.bigint()

  /* Kick off the finite-state machine, providing authentication details */
  service.send({
    type: 'START',
    auth: {
      email: 'ravi.van.test@gmail.com',
      password: 'ravi.van.test@gmail.com',
    },
  })

  /**
   * Wait for the machine to reach a final state, or fail with a timeout error.
   */
  const finalState = await waitFor(actor, (state) => state.matches('success') || state.matches('failure'), {
    timeout: 60_000,
  })

  const chronoEnd = process.hrtime.bigint()
  const chronoTime = Number(chronoEnd - chronoStart) / 1e6
  console.log(`Process took ${chronoTime} ms`)

  console.log('finalState.value', finalState.value)

  const ctx = match(finalState)
    .when((state) => state.value === 'success', (state) => {
      console.log('SUCCESS final state')
      const ctx = state.context as ContextFromState<'success'>

      const { browser: _, ...rest } = ctx
      console.log('  context', rest)

      return ctx
    })
    .when((state) => state.value === 'failure', (state) => {
      console.log('FAILURE final state')
      const ctx = state.context as ContextFromState<'failure'>
      return ctx
    })
    .otherwise((state) => {
      console.log('UNKNOWN final state')
      const ctx = state.context as ContextFromState<'authenticate'>
      return ctx
    })

  // release Playwright resources
  await ctx.browser.dispose()

  // explicitly mark the FSM as stopped
  actor.stop()
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
