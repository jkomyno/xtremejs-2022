import * as E from 'fp-ts/lib/Either'

export function toJSON<T extends Record<string, unknown>>(value: string): E.Either<string, T> {
  return E.tryCatch(
    () => JSON.parse(value) as T,
    (error) => (error as Error).message,
  )
}
