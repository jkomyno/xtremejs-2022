import { Readable } from 'node:stream'
import { machine } from './machine'
import * as glassdoor from './scrape-utils'
import type { ContextFromState } from './types'

export type GlassdoorScraperMachineConfig = {
  /**
   * Function that stores a readable stream into a server and returns a URL to the stored resource.
   */
  storeReadable: (readable: Readable) => Promise<string>
}

export function getGlassdoorScraperMachine(
  { storeReadable }: GlassdoorScraperMachineConfig,
) {
  return machine.withConfig({
    services: {
      initializeBrowser: (ctx) => glassdoor.initializeBrowser(ctx as ContextFromState<'init-browser'>),
      authenticate: (ctx) => glassdoor.authenticate(ctx as ContextFromState<'authenticate'>),
      retrieveUserData: (ctx) => glassdoor.retrieveUserData(ctx as ContextFromState<'authenticated'>),
      retrieveResumes: (ctx) => glassdoor.retrieveResumes(ctx as ContextFromState<'authenticated'>),
      storeResumes: (ctx) => glassdoor.storeResumes(storeReadable, ctx as ContextFromState<{ 'authenticated': { 'scrape-resumes': 'retrieved-resumes' } }>),
    },
  })
}
