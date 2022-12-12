import * as E from 'fp-ts/lib/Either'
import { flow, identity } from 'fp-ts/lib/function'
import { z } from 'zod'

export function parseZod<T>(Schema: z.ZodSchema<T, z.ZodTypeDef, Partial<T>>, input: unknown): E.Either<string, T> {
  return E.tryCatch(
    () => Schema.parse(input),
    flow(identity, (badConfig) => JSON.stringify(badConfig, null, 2)),
  )
}
