import { firefox } from 'playwright'
import type { Readable } from 'node:stream'
import type { ContextFromState, PlaywrightBrowserData, UserData } from './types'
import * as errors from './errors'

// maximum number of ms to wait for a Playwright selection / action to complete.
const PLAYWRIGHT_TIMEOUT = 10_000

/**
 * Initializes Playwright headless browser
 */
export async function initializeBrowser(_ctx: ContextFromState<'init-browser'>): Promise<PlaywrightBrowserData> {
  const instance = await firefox.launch()
  const context = await instance.newContext({
    locale: 'en-US',
    timezoneId: 'Europe/Berlin',
  })

  const dispose = async () => {
    await context.close()
    await instance.close()
  }

  return { instance, context, dispose }
}

/**
 * Performs email/password authentication
 */
export async function authenticate(ctx: ContextFromState<'authenticate'>) {
  const loginPage = await ctx.browser.context.newPage()

  /* dispose acquired resources before returning to the function caller */
  const toDispose = [loginPage.close] as Array<() => Promise<unknown>>
  const deferDispose = () => Promise.allSettled(toDispose)

  await loginPage.goto('https://www.glassdoor.com/index.htm')

  /* write and submit email */
  await loginPage.fill('form[name="emailForm"] input[id="inlineUserEmail"]', ctx.auth.email)
  await Promise.all([
    loginPage.waitForLoadState('networkidle', { timeout: PLAYWRIGHT_TIMEOUT }),
    loginPage.locator('form[name="emailForm"] button[type="submit"]').click(),
  ])

  // important: do not use quotes when using the text selector
  const isUserNotFound = await loginPage.isVisible('text=Create your account')
  if (isUserNotFound) {
    await deferDispose()
    return Promise.reject(Error(errors.USER_NOT_FOUND))
  }

  /* writes end submit password, waiting for the session to be updated */
  await loginPage.fill('form[name="authEmailForm"] input[id="inlineUserPassword"]', ctx.auth.password)
  await Promise.all([
    loginPage.waitForNavigation({ timeout: PLAYWRIGHT_TIMEOUT }),
    loginPage.locator('form[name="authEmailForm"] button[type="submit"]').click(),
  ]);

  const isPasswordIncorrect = await loginPage.isVisible('form[name="authEmailForm"] input[id="inlineUserPassword"]')
  if (isPasswordIncorrect) {
    await deferDispose()
    return Promise.reject(Error(errors.PASSWORD_INCORRECT))
  }

  return await deferDispose()
}

/**
 * Downloads resumes belonging to a user
 */
export async function retrieveResumes(ctx: ContextFromState<'authenticated'>): Promise<{ resumeReadables: Readable[] }> {
  const resumePage = await ctx.browser.context.newPage()
  await resumePage.goto('https://www.glassdoor.com/member/profile/resumes.htm')

  // wait for the lazy-loaded CV to be visible
  await resumePage.waitForSelector('div.resume', { timeout: PLAYWRIGHT_TIMEOUT });

  const resumeLinks = await resumePage.$$('div.resume div.resumeFileName > a')
  const downloadFns = resumeLinks.map(resumeLink => () => resumeLink.click())

  const resumeReadables = [] as Readable[]
  for (const downloadFn of downloadFns) {
    const [downloadResumeHandler] = await Promise.all([
      resumePage.waitForEvent('download'),
      downloadFn(),
    ])

    const resumeReadable = await downloadResumeHandler.createReadStream()
    if (resumeReadable) {
      resumeReadables.push(resumeReadable)
    }
  }

  await resumePage.close()

  return { resumeReadables }
}

/**
 * Forwards resumes to an object server, obtaining a list of URLs to the stored resumes
 */
export async function storeResumes(
  storeReadable: (readable: Readable) => Promise<string>,
  ctx: ContextFromState<{ 'authenticated': { 'scrape-resumes': 'retrieved-resumes' } }>,
): Promise<{ resumeURLs: string[] }> {
  const resumeURLs = await Promise.all(ctx.resumeReadables.map(storeReadable))
  return { resumeURLs }
}

export async function retrieveUserData(ctx: ContextFromState<'authenticated'>): Promise<{ userData: UserData }> {
  const profilePage = await ctx.browser.context.newPage()
  await profilePage.goto('https://www.glassdoor.com/member/profile/index.htm')
  await profilePage.waitForSelector('div[data-test="profileFirstNameSection"]', { timeout: PLAYWRIGHT_TIMEOUT });

  // retrieve user full name from the "Edit" modal
  await Promise.all([
    profilePage.waitForNavigation({ timeout: PLAYWRIGHT_TIMEOUT }),
    profilePage.locator('div[data-test="profileFirstNameSection"] a').click(),
  ])
  const userFirstName = await profilePage.inputValue('[data-test="profileModalFirstName"]', { timeout: PLAYWRIGHT_TIMEOUT })
  const userLastName = await profilePage.inputValue('[data-test="profileModalLastName"]')
  await profilePage.locator('span > svg.modal_closeIcon-svg').click()

  // retrieve user job title from the "Edit" modal
  await Promise.all([
    profilePage.waitForNavigation({ timeout: PLAYWRIGHT_TIMEOUT }),
    profilePage.locator('div[data-test="profileJobTitleSection"] a').click(),
  ])
  const userTitle = await profilePage.inputValue('[data-test="profileModalJobTitle"]')
  await profilePage.locator('span > svg.modal_closeIcon-svg').click()

  // retrieve user current company from the "Edit" modal
  await Promise.all([
    profilePage.waitForNavigation({ timeout: PLAYWRIGHT_TIMEOUT }),
    profilePage.locator('div[data-test="profileCompanyNameSection"] a').click(),
  ])
  const userCompany = await profilePage.inputValue('[data-test="profileModalCompanyName"]')
  await profilePage.locator('span > svg.modal_closeIcon-svg').click()

  // retrieve user location from the "Edit" modal
  await Promise.all([
    profilePage.waitForNavigation({ timeout: PLAYWRIGHT_TIMEOUT }),
    profilePage.locator('div[data-test="profileLocationSection"] a').click(),
  ])
  const userLocation = await profilePage.inputValue('[data-test="profileModalLocation"]')
  await profilePage.locator('span > svg.modal_closeIcon-svg').click()

  const userData: UserData = {
    firstname: userFirstName,
    lastname: userLastName,
    jobTitle: userTitle,
    currentCompany: userCompany,
    currentLocation: userLocation,
  }

  await profilePage.close()

  return { userData }
}
