import { Readable } from 'node:stream'
import { machine } from '../../src/machine'
import type { ContextFromState, PlaywrightBrowserData, UserData } from '../../src/types'

describe('scraper', () => {
  const auth = {
    email: '',
    password: '',
  }

  it('should start in "idle"', () => {
    const idleState = machine.initialState
    expect(idleState.matches('idle')).toBe(true)
  })

  it('"idle" -> "failure": initializing headless browser failed', () => {
    const initBrowserState = machine.transition(machine.initialState, { type: 'START', auth })
    expect(initBrowserState.matches('init-browser')).toBe(true)

    const failureState = machine.transition(initBrowserState, { type: 'FAIL_INIT_BROWSER' })
    expect(failureState.matches('failure')).toBe(true)
    expect(failureState.context.reason).toBe('FAIL_INIT_BROWSER')
  })

  it('"idle" -> "failure": authenticating failed', () => {
    const initBrowserState = machine.transition(machine.initialState, { type: 'START', auth })
    expect(initBrowserState.matches('init-browser')).toBe(true)

    const authenticateState = machine.transition(initBrowserState, { type: 'done.invoke.scraper.init-browser:invocation[0]', data: {} as PlaywrightBrowserData })
    expect(authenticateState.matches('authenticate')).toBe(true)

    const failureState = machine.transition(authenticateState, { type: 'FAIL_AUTHENTICATING' })
    expect(failureState.matches('failure')).toBe(true)
    expect(failureState.context.reason).toBe('FAIL_AUTHENTICATING')
  })

  it('"idle" -> "failure": retrieving user data failed', () => {
    const initBrowserState = machine.transition(machine.initialState, { type: 'START', auth })
    expect(initBrowserState.matches('init-browser')).toBe(true)

    const authenticateState = machine.transition(initBrowserState, { type: 'done.invoke.scraper.init-browser:invocation[0]', data: {} as PlaywrightBrowserData })
    expect(authenticateState.matches('authenticate')).toBe(true)

    const authenticatedState = machine.transition(authenticateState, { type: 'done.invoke.scraper.authenticate:invocation[0]' })
    expect(authenticatedState.matches('authenticated')).toBe(true)

    /* "authenticated" is a parallel state, with nested states that can co-occur */

    const retrievedResumesState = machine.transition(authenticatedState, { type: 'done.invoke.scraper.authenticated.scrape-resumes.retrieve-resumes:invocation[0]', data: { resumeReadables: [] as Readable[] } })
    expect(retrievedResumesState.matches('authenticated')).toBe(true)

    const failureState = machine.transition(retrievedResumesState, { type: 'FAIL_RETRIEVING_USER_DATA' })
    expect(failureState.matches('failure')).toBe(true)
    expect(failureState.context.reason).toBe('FAIL_RETRIEVING_USER_DATA') 
  })

  it('"idle" -> "success": happy path', () => {
    const initBrowserState = machine.transition(machine.initialState, { type: 'START', auth })
    expect(initBrowserState.matches('init-browser')).toBe(true)

    const authenticateState = machine.transition(initBrowserState, { type: 'done.invoke.scraper.init-browser:invocation[0]', data: {} as PlaywrightBrowserData })
    expect(authenticateState.matches('authenticate')).toBe(true)

    const authenticatedState = machine.transition(authenticateState, { type: 'done.invoke.scraper.authenticate:invocation[0]' })
    expect(authenticatedState.matches('authenticated')).toBe(true)

    /* "authenticated" is a parallel state, with nested states that can co-occur */

    const retrievedResumesState = machine.transition(authenticatedState, { type: 'done.invoke.scraper.authenticated.scrape-resumes.retrieve-resumes:invocation[0]', data: { resumeReadables: [] as Readable[] } })
    expect(retrievedResumesState.matches('authenticated')).toBe(true)

    const retrievedUserDataState = machine.transition(retrievedResumesState, { type: 'done.invoke.scraper.authenticated.scrape-user-data.retrieve-user-data:invocation[0]', data: { userData: {} as UserData } })
    expect(retrievedUserDataState.matches('authenticated')).toBe(true)

    const storedResumesState = machine.transition(retrievedUserDataState, { type: 'done.invoke.scraper.authenticated.scrape-resumes.store-resumes:invocation[0]', data: { resumeURLs: [] as string[] } })
    expect(storedResumesState.matches('success')).toBe(true)
  })

  it('"idle" -> "success": partial happy path, storing resumes failed', () => {
    const initBrowserState = machine.transition(machine.initialState, { type: 'START', auth })
    expect(initBrowserState.matches('init-browser')).toBe(true)

    const authenticateState = machine.transition(initBrowserState, { type: 'done.invoke.scraper.init-browser:invocation[0]', data: {} as PlaywrightBrowserData })
    expect(authenticateState.matches('authenticate')).toBe(true)

    const authenticatedState = machine.transition(authenticateState, { type: 'done.invoke.scraper.authenticate:invocation[0]' })
    expect(authenticatedState.matches('authenticated')).toBe(true)

    /* "authenticated" is a parallel state, with nested states that can co-occur */

    const retrievedResumesState = machine.transition(authenticatedState, { type: 'done.invoke.scraper.authenticated.scrape-resumes.retrieve-resumes:invocation[0]', data: { resumeReadables: [] as Readable[] } })
    expect(retrievedResumesState.matches('authenticated')).toBe(true)

    const storedResumesState = machine.transition(retrievedResumesState, { type: 'error.platform.scraper.authenticated.scrape-resumes.store-resumes:invocation[0]', data: { resumeURLs: [] as string[] } })
    expect(storedResumesState.matches('authenticated')).toBe(true)

    const retrievedUserDataState = machine.transition(storedResumesState, { type: 'done.invoke.scraper.authenticated.scrape-user-data.retrieve-user-data:invocation[0]', data: { userData: {} as UserData } })
    expect(retrievedUserDataState.matches('success')).toBe(true)
  })
})
