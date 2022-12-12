import type { Message } from 'kafkajs'

type SerializeMessageParams = {
  key: string
  value: Record<string, unknown>
}

export function serializeMessage({ key, value }: SerializeMessageParams): Message {
  const message: Message = {
    key,
    value: JSON.stringify(value, null, 2),
  }
  return message
}
