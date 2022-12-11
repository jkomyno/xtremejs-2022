import type { Readable } from 'node:stream'
import type { BrowserContext, Browser } from 'playwright'
import type { UserData } from '@jkomyno/common-entities'

export type { UserData }

/**
 * Authentication credentials for Glassdoor.
 */
export type UserAuth = {
  email: string
  password: string
}

/**
 * Playwright-related browser resources and destructor.
 */
export type PlaywrightBrowserData = {
  // the actual browser instance, e.g., firefox.
  instance: Browser

  // the browser context, e.g., a new browser session that doesn't share cookies with other sessions.
  context: BrowserContext
  
  // Function to release the resources acquired by Playwright.
  dispose: () => Promise<void>
}

export type ScraperContext = {
  kind: ScraperTypestate['value']
  auth?: UserAuth
  browser?: PlaywrightBrowserData
  resumeReadables?: Readable[]
  resumeURLs?: string[]
  userData?: UserData
  reason?: string
}

/**
 * The context data stored in the state machine.
 * The actual type may change at each state transition.
 */
export type ScraperTypestate =
  /* The scraper hasn't started yet. */
  | {
      value: 'idle'
      context: ScraperContext
    }

  /* State responsible for initializing the headless browser (with Playwright) */
  | {
      value: 'init-browser'
      context: ScraperContext & {
        auth: UserAuth
      }
    }

  /* State responsible for authenticating to the website to scrape (Glassdoor) */
  | {
      value: 'authenticate'
      context: ScraperContext & {
        auth: UserAuth
        browser: PlaywrightBrowserData
      }
    }

  /* Parallel state the aggregates every scraping action that requires authentication */
  | {
      value: 'authenticated'
      context: ScraperContext & {
        auth?: never
        browser: PlaywrightBrowserData
      }
    }

  /* State responsible for retrieving info about the logged user, e.g. their name and current company */
  | {
      value: {
        authenticated: 'retrieve-user-data'
      }
      context: ScraperContext & {
        browser: PlaywrightBrowserData
        userData: UserData
      }
    }

  /* State responsible for downloading the uploaded resumes in memory */
  | {
      value: {
        authenticated: {
          'scrape-resumes': 'retrieved-resumes'
        }
      }
      context: ScraperContext & {
        browser: PlaywrightBrowserData
        resumeReadables: Readable[]
      }
    }

  /* State responsible for storing the retrieved resumes in a solid storage */
  | {
      value: {
        authenticated: {
          'scrape-resumes': 'stored-resumes'
        }
      }
      context: ScraperContext & {
        browser: PlaywrightBrowserData
        resumeURLs: string[]
      }
    }
  
  /* Final state that indicates the overall scraping pipeline was successful */
  | {
      value: 'success'
      context: ScraperContext & {
        browser: PlaywrightBrowserData
        resumeURLs: string[]
        userData: UserData
      }
    }

  /* Final state that indicates the overall scraping pipeline was interrupted by some error */
  | {
    value: 'failure'
    context: ScraperContext & {
      browser: PlaywrightBrowserData
      reason: string
    }
  }

/**
 * Given a valid state value, returns the context type for that state.
 */
export type ContextFromState<StateValue extends ScraperTypestate['value']> = Extract<ScraperTypestate, { value: StateValue }>['context']

/**
 * The events that can be sent to the state machine.
 */
export type ScraperEvent =
  | {
    type: 'START',
    auth: UserAuth
  }
  | {
    type: 'done.invoke.scraper.init-browser:invocation[0]',
    data: PlaywrightBrowserData,
  }
  | {
    type: 'FAIL_INIT_BROWSER',
  }
  | {
    type: 'done.invoke.scraper.authenticate:invocation[0]',
  }
  | {
    type: 'FAIL_AUTHENTICATING',
  }
  | {
    type: 'done.invoke.scraper.authenticated.scrape-user-data.retrieve-user-data:invocation[0]',
    data: { userData: UserData },
  }
  | {
    type: 'FAIL_RETRIEVING_USER_DATA',
  }
  | {
    type: 'done.invoke.scraper.authenticated.scrape-resumes.retrieve-resumes:invocation[0]',
    data: { resumeReadables: Readable[] },
  }
  | {
    type: 'FAIL_RETRIEVING_RESUMES',
  }
  | {
    type: 'done.invoke.scraper.authenticated.scrape-resumes.store-resumes:invocation[0]',
    data: { resumeURLs: string[] },
  }
  | {
    type: 'FAIL_STORING_RESUMES',
  }

