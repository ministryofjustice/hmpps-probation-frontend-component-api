import { RedisClient } from '../data/redisClient'
import CacheService from './cacheService'

const loggerError = jest.fn()
jest.mock('../../logger', () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => loggerError(...args),
  },
}))

const redisClientStub = {
  get: jest.fn(),
  set: jest.fn(),
  on: jest.fn(),
  connect: jest.fn(),
  isOpen: true,
}

const redisClient = redisClientStub as unknown as jest.Mocked<RedisClient>

const service = new CacheService(redisClient, 600)

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    redisClientStub.isOpen = true
  })

  describe('setData', () => {
    it('should set the data in redis', async () => {
      await service.setData('key', { key: 'value' })
      expect(redisClient.set).toBeCalledTimes(1)
      expect(redisClient.set).toBeCalledWith('key', '{"key":"value"}', { EX: 600 })
    })

    it('connects when redis client is not open', async () => {
      redisClientStub.isOpen = false
      await service.setData('key', { a: 1 })
      expect(redisClient.connect).toHaveBeenCalledTimes(1)
      expect(redisClient.set).toHaveBeenCalled()
    })

    it('returns empty string and logs on redis error', async () => {
      redisClient.set.mockRejectedValueOnce(new Error('redis down'))
      const result = await service.setData('key', { a: 1 })
      expect(result).toBe('')
      expect(loggerError).toHaveBeenCalled()
    })
  })

  describe('getData', () => {
    it('should get and parse the data from redis', async () => {
      redisClient.get.mockResolvedValueOnce(JSON.stringify({ key: 'value' }))
      const result = await service.getData('key')

      expect(result).toEqual({ key: 'value' })
      expect(redisClient.get).toBeCalledTimes(1)
      expect(redisClient.get).toBeCalledWith('key')
    })

    it('returns null when redis returns empty', async () => {
      redisClient.get.mockResolvedValueOnce(null)
      await expect(service.getData('key')).resolves.toBeNull()
    })

    it('connects when redis client is not open', async () => {
      redisClientStub.isOpen = false
      redisClient.get.mockResolvedValueOnce(JSON.stringify({ a: 1 }))
      await service.getData('key')
      expect(redisClient.connect).toHaveBeenCalledTimes(1)
    })

    it('returns null and logs when JSON parse fails', async () => {
      redisClient.get.mockResolvedValueOnce('not-json')
      await expect(service.getData('key')).resolves.toBeNull()
      expect(loggerError).toHaveBeenCalled()
    })

    it('returns null and logs on redis error', async () => {
      redisClient.get.mockRejectedValueOnce(new Error('redis down'))
      await expect(service.getData('key')).resolves.toBeNull()
      expect(loggerError).toHaveBeenCalled()
    })
  })
})
