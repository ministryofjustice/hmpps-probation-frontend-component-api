import { createClient } from 'redis'

import logger from '../../logger'
import config from '../config'

export type RedisClient = ReturnType<typeof createClient>

const url =
  config.redis.tls_enabled === 'true'
    ? `rediss://${config.redis.host}:${config.redis.port}`
    : `redis://${config.redis.host}:${config.redis.port}`

let sharedRedisClient: RedisClient | null = null

/**
 * Internal factory function that creates a new Redis client instance.
 * Used by getRedisClient() to initialize the singleton and by tests that need fresh instances.
 */
export const createRedisClient = (): RedisClient => {
  const client = createClient({
    url,
    password: config.redis.password,
    socket: {
      reconnectStrategy: (attempts: number) => {
        // Exponential back off: 20ms, 40ms, 80ms..., capped to retry every 30 seconds
        const nextDelay = Math.min(2 ** attempts * 20, 30000)
        logger.info(`Retry Redis connection attempt: ${attempts}, next attempt in: ${nextDelay}ms`)
        return nextDelay
      },
    },
  })

  if (process.env.NODE_ENV === 'test') {
    client.unref()
  }

  client.on('error', (e: Error) => logger.error('Redis client error', e))

  return client
}

/**
 * Returns a singleton Redis client instance.
 * Lazily initializes the client on first call and reuses it for all subsequent calls.
 * This ensures a single, unified connection across the application's data factory layer.
 */
export const getRedisClient = (): RedisClient => {
  if (!sharedRedisClient) {
    sharedRedisClient = createRedisClient()
  }
  return sharedRedisClient
}

/**
 * Resets the shared Redis client instance.
 * Used primarily for testing purposes to allow injection of mock clients or fresh instances.
 */
export const resetRedisClient = (): void => {
  sharedRedisClient = null
}
