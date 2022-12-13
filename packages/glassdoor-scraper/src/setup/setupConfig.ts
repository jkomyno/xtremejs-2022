import { ZodSchema, ZodTypeDef } from 'zod'
import * as E from 'fp-ts/Either'
import { parseZod } from '../util/parseZod'

/**
 * Closure that sets up the application configuration variables.
 * In case of parsing errors, fail early in an Either.left context.
 */
export function setupConfig<AppConfigT extends Record<string, unknown>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AppConfig: ZodSchema<AppConfigT, ZodTypeDef, any>,
) {
  return (environment: Record<string, string | undefined>): E.Either<string, AppConfigT> =>
    parseZod(AppConfig, environment)
}
