import pino from 'pino'

// In development, we want pretty logs with colors.
export const logger =
  process.env.NODE_ENV === 'production'
    ? pino({
        level: 'error',
      })
    : pino({
        level: 'debug',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
      })
