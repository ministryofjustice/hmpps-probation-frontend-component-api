import { AuthenticationClient, InMemoryTokenStore, RedisTokenStore } from '@ministryofjustice/hmpps-auth-clients'
import UserService from './userService'
import config from '../config'
import logger from '../../logger'
import { createRedisClient, getRedisClient } from '../data/redisClient'
import '../data'
import CacheService from './cacheService'

export const services = () => {
  const cacheService = new CacheService(getRedisClient(), config.redis.cacheTimeout)
  const userService = new UserService(cacheService)
  const hmppsAuthClient = new AuthenticationClient(
    config.apis.hmppsAuth,
    logger,
    config.redis.enabled ? new RedisTokenStore(createRedisClient()) : new InMemoryTokenStore(),
  )

  return {
    userService,
    cacheService,
    hmppsAuthClient,
  }
}

export type Services = ReturnType<typeof services>

export { UserService }
