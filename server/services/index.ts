import UserService from './userService'
import config from '../config'
import { createRedisClient } from '../data/redisClient'
import '../data'
import CacheService from './cacheService'

export const services = () => {
  const cacheService = new CacheService(createRedisClient(), config.redis.cacheTimeout)
  const userService = new UserService(cacheService)

  return {
    userService,
    cacheService,
  }
}

export type Services = ReturnType<typeof services>

export { UserService }
