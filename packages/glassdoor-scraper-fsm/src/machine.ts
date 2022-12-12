import { send, assign, createMachine } from 'xstate'
import type { ScraperContext, ScraperEvent, ScraperTypestate } from './types'

/**
 * Defines a finite state machine (FSM) for scraping Glassdoor.
 * - `idle`: The initial state. The FSM will transition to `init-browser` when the `START` event is received.
 * - `init-browser`: The FSM will initialize a headless browser and transition to `authenticate` when the browser is ready.
 *   - On error: The FSM will transition to `failure` via the `FAIL_INIT_BROWSER` event.
 * - `authenticate`: The FSM will authenticate the user and transition to `authenticated` when the authentication is successful.
 *   - On error: The FSM will transition to `failure` via the `FAIL_AUTHENTICATING` event.
 * - `authenticated`: Parallel state where several scraping tasks are performed concurrently once authenticated.
 *   - `scrape-user-data`: The FSM will scrape user's information like their name and current company.
 *     - On error: The FSM will transition to `failure` via the `FAIL_RETRIEVING_USER_DATA` event.
 *   - `scrape-resumes`: Pipeline in which the FSM scrapes and stores user resumes.
 *     - `retrieve-resumes`: The FSM will retrieve the list of resumes and transition to `scrape-resume` when the list is ready.
 *      - On error: The FSM will transition to `failure` via the `FAIL_RETRIEVING_RESUMES` event.
 *    - `scrape-resumes`: The FSM will scrape a resume and transition to `store-resumes` when the resume is scraped.
 *     - On error: The FSM will transition to `failure` via the `FAIL_SCRAPE_RESUME` event.
 * - `failure`: The FSM will transition to `failure` when some fatal error occurs, indicating the reason for the error.
 * - `success`: The FSM will transition to `success` when no fatal error occurs.
 */
export const machine = createMachine<ScraperContext, ScraperEvent, ScraperTypestate>({
  context: {
    kind: 'idle',
  },
  predictableActionArguments: true,
  id: 'scraper',
  initial: 'idle',
  states: {
    idle: {
      on: {
        START: {
          target: 'init-browser',
          actions: assign({
            kind: (_ctx) => 'init-browser',
            auth: (_ctx, event) => event.auth,
          }),
        },
      },
    },
    'init-browser': {
      invoke: {
        src: 'initializeBrowser',
        onDone: {
          target: 'authenticate',
          actions: assign({
            kind: (_ctx) => 'authenticate',
            browser: (_ctx, event) => event.data,
          }),
        },
        onError: {
          actions: send('FAIL_INIT_BROWSER'),
        },
      },
      on: {
        FAIL_INIT_BROWSER: {
          target: 'failure',
          actions: assign({
            reason: (_ctx) => 'FAIL_INIT_BROWSER',
          }),
        },
      },
    },
    authenticate: {
      invoke: {
        src: 'authenticate',
        onDone: {
          target: 'authenticated',
          actions: assign({
            kind: (_ctx) => 'authenticated',
            auth: (_ctx) => undefined,
          }),
        },
        onError: {
          actions: send('FAIL_AUTHENTICATING'),
        },
      },
      on: {
        FAIL_AUTHENTICATING: {
          target: 'failure',
          actions: assign({
            reason: (_ctx) => 'FAIL_AUTHENTICATING',
          }),
        },
      },
    },
    authenticated: {
      type: 'parallel',
      states: {
        'scrape-user-data': {
          initial: 'retrieve-user-data',
          states: {
            'retrieve-user-data': {
              invoke: {
                src: 'retrieveUserData',
                onDone: {
                  target: 'user-data-retrieved',
                  actions: assign({
                    kind: (_ctx) => ({
                      authenticated: 'retrieve-user-data',
                    }),
                    userData: (_ctx, event) => event.data.userData,
                  }),
                },
                onError: {
                  actions: send('FAIL_RETRIEVING_USER_DATA'),
                },
              },
            },
            'user-data-retrieved': {
              type: 'final',
            },
          },
        },
        'scrape-resumes': {
          initial: 'retrieve-resumes',
          states: {
            'retrieve-resumes': {
              invoke: {
                src: 'retrieveResumes',
                onDone: {
                  target: 'store-resumes',
                  actions: assign({
                    kind: (_ctx) => ({
                      authenticated: {
                        'scrape-resumes': 'retrieved-resumes',
                      },
                    }),
                    resumeReadables: (_ctx, event) => event.data.resumeReadables,
                  }),
                },
                onError: {
                  actions: send('FAIL_RETRIEVING_RESUMES'),
                },
              },
            },
            'store-resumes': {
              invoke: {
                src: 'storeResumes',
                onDone: {
                  target: 'stored-resumes',
                  actions: assign({
                    kind: (_ctx) => ({
                      authenticated: {
                        'scrape-resumes': 'stored-resumes',
                      },
                    }),
                    resumeURLs: (_ctx, event) => event.data.resumeURLs,
                    resumeReadables: (_ctx) => undefined,
                  }),
                },
                onError: {
                  actions: send('FAIL_STORING_RESUMES'),
                },
              },
            },
            'stored-resumes': {
              type: 'final',
            },
          },
        },
      },
      on: {
        FAIL_RETRIEVING_USER_DATA: {
          target: 'failure',
          actions: assign({
            reason: (_ctx) => 'FAIL_RETRIEVING_USER_DATA',
          }),
        },
        FAIL_RETRIEVING_RESUMES: {
          target: 'success',
        },
        FAIL_STORING_RESUMES: {
          target: 'success',
          actions: assign({
            resumeURLs: (_ctx) => [],
          }),
        },
      },
      onDone: {
        target: 'success',
      },
    },
    success: {
      type: 'final',
    },
    failure: {
      type: 'final',
    },
  },
})
