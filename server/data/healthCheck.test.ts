import nock from 'nock'
import { AgentConfig } from '@ministryofjustice/hmpps-rest-client'
import { redisServiceCheckFactory, serviceCheckFactory } from './healthCheck'
import { createRedisClient } from './redisClient'

jest.mock('./redisClient', () => ({
  createRedisClient: jest.fn(),
}))

const createRedisClientMock = createRedisClient as jest.MockedFunction<typeof createRedisClient>

describe('Service healthcheck', () => {
  const healthcheck = serviceCheckFactory('externalService', 'http://test-service.com/ping', new AgentConfig(), {
    response: 100,
    deadline: 150,
  })

  let fakeServiceApi: nock.Scope

  beforeEach(() => {
    fakeServiceApi = nock('http://test-service.com')
  })

  afterEach(() => {
    nock.abortPendingRequests()
    nock.cleanAll()
  })

  describe('Check healthy', () => {
    it('Should return data from api', async () => {
      fakeServiceApi.get('/ping').reply(200, 'pong')

      const output = await healthcheck()
      expect(output).toEqual('OK')
    })

    it('Should throw when response status is not 200', async () => {
      fakeServiceApi.get('/ping').reply(204)

      await expect(healthcheck()).rejects.toEqual(204)
    })
  })

  describe('Check unhealthy', () => {
    it('Should throw error from api', async () => {
      fakeServiceApi.get('/ping').thrice().reply(500)

      await expect(healthcheck()).rejects.toThrow('Internal Server Error')
    })
  })

  describe('Check healthy retry test', () => {
    it('Should retry twice if request fails', async () => {
      fakeServiceApi
        .get('/ping')
        .reply(500, { failure: 'one' })
        .get('/ping')
        .reply(500, { failure: 'two' })
        .get('/ping')
        .reply(200, 'pong')

      const response = await healthcheck()
      expect(response).toEqual('OK')
    })

    it('Should retry twice if request times out', async () => {
      fakeServiceApi
        .get('/ping')
        .delay(10000) // delay set to 10s, timeout to 900/3=300ms
        .reply(200, { failure: 'one' })
        .get('/ping')
        .delay(10000)
        .reply(200, { failure: 'two' })
        .get('/ping')
        .reply(200, 'pong')

      const response = await healthcheck()
      expect(response).toEqual('OK')
    })

    it('Should fail if request times out three times', async () => {
      fakeServiceApi
        .get('/ping')
        .delay(10000) // delay set to 10s, timeout to 900/3=300ms
        .reply(200, { failure: 'one' })
        .get('/ping')
        .delay(10000)
        .reply(200, { failure: 'two' })
        .get('/ping')
        .delay(10000)
        .reply(200, { failure: 'three' })

      await expect(healthcheck()).rejects.toThrow('Response timeout of 100ms exceeded')
    })
  })

  describe('HTTPS service checks', () => {
    it('Should return OK for healthy https service', async () => {
      const httpsHealthcheck = serviceCheckFactory(
        'secureService',
        'https://secure-service.com/ping',
        new AgentConfig(),
        {
          response: 100,
          deadline: 150,
        },
      )

      nock('https://secure-service.com').get('/ping').reply(200, 'pong')

      await expect(httpsHealthcheck()).resolves.toEqual('OK')
    })
  })

  describe('Default timeout', () => {
    it('Should use default ServiceTimeout when none is provided', async () => {
      const defaultTimeoutCheck = serviceCheckFactory(
        'defaultTimeoutService',
        'http://test-service.com/ping',
        new AgentConfig(),
      )

      fakeServiceApi.get('/ping').reply(200, 'pong')

      await expect(defaultTimeoutCheck()).resolves.toEqual('OK')
    })
  })
})

describe('Redis service healthcheck', () => {
  const redisClient = {
    isOpen: true,
    connect: jest.fn(),
    ping: jest.fn(),
    quit: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    redisClient.isOpen = true
    redisClient.connect.mockResolvedValue(undefined)
    redisClient.ping.mockResolvedValue('PONG')
    redisClient.quit.mockResolvedValue('OK')
    createRedisClientMock.mockReturnValue(redisClient as never)
  })

  it('Should return OK when Redis responds with PONG', async () => {
    const check = redisServiceCheckFactory('redis')

    await expect(check()).resolves.toEqual('OK')
    expect(redisClient.connect).not.toHaveBeenCalled()
    expect(redisClient.quit).toHaveBeenCalled()
  })

  it('Should connect when Redis client is closed', async () => {
    redisClient.isOpen = false
    redisClient.connect.mockImplementation(async () => {
      redisClient.isOpen = true
    })
    const check = redisServiceCheckFactory()

    await expect(check()).resolves.toEqual('OK')
    expect(redisClient.connect).toHaveBeenCalled()
    expect(redisClient.quit).toHaveBeenCalled()
  })

  it('Should throw when Redis returns an unexpected ping response', async () => {
    redisClient.ping.mockResolvedValue('NOPE')
    const check = redisServiceCheckFactory('redis')

    await expect(check()).rejects.toThrow('Unexpected Redis PING response: NOPE')
    expect(redisClient.quit).toHaveBeenCalled()
  })

  it('Should throw when Redis ping fails', async () => {
    const error = new Error('redis unavailable')
    redisClient.ping.mockRejectedValue(error)
    const check = redisServiceCheckFactory('redis')

    await expect(check()).rejects.toThrow('redis unavailable')
    expect(redisClient.quit).toHaveBeenCalled()
  })

  it('Should not quit when Redis client is not open after an error', async () => {
    redisClient.isOpen = false
    redisClient.connect.mockRejectedValue(new Error('connect failed'))
    const check = redisServiceCheckFactory('redis')

    await expect(check()).rejects.toThrow('connect failed')
    expect(redisClient.quit).not.toHaveBeenCalled()
  })
})
