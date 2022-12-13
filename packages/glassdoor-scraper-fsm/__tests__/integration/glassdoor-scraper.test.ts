import { interpret, StateValue } from 'xstate'
import { waitFor } from 'xstate/lib/waitFor'
import { getGlassdoorScraperMachine } from '../../src/index'
import type { ContextFromState, ScraperContext } from '../../src/types'

describe('glassdoor scraper', () => {
  const actualAuth = {
    email: 'ravi.van.test@gmail.com',
    password: 'ravi.van.test@gmail.com',
  }

  describe('happy path', () => {
    const glassdoorScraperMachine = getGlassdoorScraperMachine({
      storeReadable: async (_readable) => {
        return Promise.resolve('file://resume.pdf')
      },
    })

    it('scrapes Glassdoor', async () => {
      const service = interpret(glassdoorScraperMachine)
      const actor = service.start()
      service.send({
        type: 'START',
        auth: actualAuth,
      })
  
      const finalState = await waitFor(actor, (state) => state.matches('success') || state.matches('failure'), {
        timeout: 120_000,
      })
      console.log('finalState.value', finalState.value)
      expect(finalState.matches('success')).toBe(true)

      const successCtx = finalState.context as ContextFromState<'success'>
      await successCtx.browser.dispose()

      expect(successCtx.userData).toMatchObject({
        firstname: 'Alberto',
        lastname: 'Schiabel',
        jobTitle: 'Open Source Software Engineer',
        currentCompany: 'Prisma.io',
        currentLocation: 'Venice (Italy)'
      })
      expect(successCtx.resumeURLs).toEqual(['file://resume.pdf', 'file://resume.pdf'])
    }, 120_000)
  })

  describe('partial happy path, storing resumes failed', () => {
    const glassdoorScraperMachine = getGlassdoorScraperMachine({
      storeReadable: async (_readable) => {
        return Promise.reject(new Error('Failed to store resume'))
      },
    })

    it('scrapes Glassdoor user data', async () => {
      const service = interpret(glassdoorScraperMachine)
      const actor = service.start()
      service.send({
        type: 'START',
        auth: actualAuth,
      })
  
      const finalState = await waitFor(actor, (state) => state.matches('success') || state.matches('failure'), {
        timeout: 120_000,
      })
      console.log('finalState.value', finalState.value)
      expect(finalState.matches('success')).toBe(true)

      const successCtx = finalState.context as ContextFromState<'success'>
      await successCtx.browser.dispose()

      const { browser: _, ...ctx } = successCtx
      console.log('ctx', ctx)

      expect(successCtx.userData).toMatchObject({
        firstname: 'Alberto',
        lastname: 'Schiabel',
        jobTitle: 'Open Source Software Engineer',
        currentCompany: 'Prisma.io',
        currentLocation: 'Venice (Italy)'
      })
      expect(successCtx.resumeURLs).toStrictEqual([])
    }, 120_000)
  })

  describe('authenticate', () => {
    const glassdoorScraperMachine = getGlassdoorScraperMachine({
      storeReadable: async (_readable) => {
        return Promise.resolve('file://resume.pdf')
      },
    })

    const fakeAuth = {
      email: 'xtremejs2022-random-user@gmail.com',
      password: 'abcd1234!'
    }

    it('should stop early on wrong user email', async () => {
      let ctx: ScraperContext = { kind: 'idle' }
      const stateSequence = [] as Array<StateValue>
      const service = interpret(glassdoorScraperMachine)
        .onTransition((state) => {
          stateSequence.push(state.value)
          ctx = state.context
        })
      
      const actor = service.start()
      service.send({
        type: 'START',
        auth: fakeAuth,
      })
  
      const failureState = await waitFor(actor, (state) => state.matches('failure'), {
        timeout: 60_000,
      })
      
      const failureCtx = failureState.context as ContextFromState<'failure'>
      await failureCtx.browser.dispose()

      expect(failureCtx.reason).toEqual('FAIL_AUTHENTICATING')
      expect(stateSequence).toEqual([
        'idle',
        'init-browser',
        'authenticate',
        'authenticate',
        'failure',
      ])
    }, 60_000)
  
    it('should stop early on wrong password', async () => {
      let ctx: ScraperContext = { kind: 'idle' }
      const stateSequence = [] as Array<StateValue>
      const service = interpret(glassdoorScraperMachine)
        .onTransition((state) => {
          stateSequence.push(state.value)
          ctx = state.context
        })
      
      const actor = service.start()
      service.send({
        type: 'START',
        auth: {
          email: actualAuth.email,
          password: fakeAuth.password,
        },
      })
  
      const failureState = await waitFor(actor, (state) => state.matches('failure'), {
        timeout: 60_000,
      })
      
      const failureCtx = failureState.context as ContextFromState<'failure'>
      await failureCtx.browser.dispose()

      expect(failureCtx.reason).toEqual('FAIL_AUTHENTICATING')
      expect(stateSequence).toEqual([
        'idle',
        'init-browser',
        'authenticate',
        'authenticate',
        'failure',
      ])
    }, 60_000)
  })
})
