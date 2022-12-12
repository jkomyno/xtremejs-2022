import { InputMessage } from '@jkomyno/common-entities/lib/glassdoor/kafka'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/lib/function'
import type { EachMessagePayload } from 'kafkajs'
import { parseZod } from '../util/parseZod'
import { toJSON } from '../util/toJSON'
import { logger } from '../logger'

export function parseInputMessage(payload: EachMessagePayload): E.Either<string, InputMessage> {
  const value = payload.message.value?.toString('utf-8')
  logger.info({ value }, 'Parsing input message...')

  return pipe(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    value!,
    toJSON<InputMessage>,
    E.chain((valueAsJSON) => parseZod(InputMessage, valueAsJSON)),
  )
}
