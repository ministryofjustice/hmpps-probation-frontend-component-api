import healthCheck from './healthCheck'
import type { ApplicationInfo } from '../applicationInfo'
import type { HealthCheckCallback, HealthCheckService } from './healthCheck'
import { redisServiceCheckFactory, serviceCheckFactory } from '../data/healthCheck'
import config from '../config'

jest.mock('../data/healthCheck', () => ({
  serviceCheckFactory: jest.fn(),
  redisServiceCheckFactory: jest.fn(),
}))

const serviceCheckFactoryMock = serviceCheckFactory as jest.MockedFunction<typeof serviceCheckFactory>
const redisServiceCheckFactoryMock = redisServiceCheckFactory as jest.MockedFunction<typeof redisServiceCheckFactory>

describe('Healthcheck', () => {
  const testAppInfo: ApplicationInfo = {
    applicationName: 'test',
    buildNumber: '1',
    productId: 'HMPPS1234',
    gitRef: 'long ref',
    gitShortHash: 'short ref',
    branchName: 'main',
  }

  const originalRedisEnabled = config.redis.enabled
  const originalTokenVerificationEnabled = config.apis.tokenVerification.enabled

  beforeEach(() => {
    jest.clearAllMocks()
    config.redis.enabled = originalRedisEnabled
    config.apis.tokenVerification.enabled = originalTokenVerificationEnabled
  })

  afterAll(() => {
    config.redis.enabled = originalRedisEnabled
    config.apis.tokenVerification.enabled = originalTokenVerificationEnabled
  })

  it('Healthcheck reports healthy', done => {
    const successfulChecks = [successfulCheck('check1'), successfulCheck('check2')]

    const callback: HealthCheckCallback = result => {
      expect(result).toEqual(
        expect.objectContaining({
          status: 'UP',
          components: {
            check1: {
              status: 'UP',
              details: 'some message',
            },
            check2: {
              status: 'UP',
              details: 'some message',
            },
          },
          version: '1',
          build: {
            buildNumber: '1',
            gitRef: 'long ref',
          },
        }),
      )
      expect(result.uptime).toEqual(expect.any(Number))
      done()
    }

    healthCheck(testAppInfo, callback, successfulChecks)
  })

  it('Healthcheck reports unhealthy', done => {
    const successfulChecks = [successfulCheck('check1'), erroredCheck('check2')]

    const callback: HealthCheckCallback = result => {
      expect(result).toEqual(
        expect.objectContaining({
          status: 'DOWN',
          components: {
            check1: {
              status: 'UP',
              details: 'some message',
            },
            check2: {
              status: 'DOWN',
              details: 'some error',
            },
          },
        }),
      )
      done()
    }

    healthCheck(testAppInfo, callback, successfulChecks)
  })

  it('uses default API checks and reports dependent services as UP', done => {
    const authCheck = jest.fn().mockResolvedValue('OK')
    serviceCheckFactoryMock.mockReturnValue(authCheck)

    config.redis.enabled = false
    config.apis.tokenVerification.enabled = false

    const callback: HealthCheckCallback = result => {
      expect(serviceCheckFactoryMock).toHaveBeenCalledWith(
        'hmppsAuth',
        `${config.apis.hmppsAuth.url}/health/ping`,
        config.apis.hmppsAuth.agent,
      )
      expect(redisServiceCheckFactoryMock).not.toHaveBeenCalled()
      expect(result).toEqual(
        expect.objectContaining({
          status: 'UP',
          components: {
            hmppsAuth: {
              status: 'UP',
              details: 'OK',
            },
          },
        }),
      )
      done()
    }

    healthCheck(testAppInfo, callback)
  })

  it('includes redis and token verification checks when enabled', done => {
    const authCheck = jest.fn().mockResolvedValue('OK')
    const tokenCheck = jest.fn().mockResolvedValue('OK')
    const redisCheck = jest.fn().mockResolvedValue('OK')

    serviceCheckFactoryMock.mockReturnValueOnce(authCheck).mockReturnValueOnce(tokenCheck)
    redisServiceCheckFactoryMock.mockReturnValue(redisCheck)

    config.redis.enabled = true
    config.apis.tokenVerification.enabled = true

    const callback: HealthCheckCallback = result => {
      expect(redisServiceCheckFactoryMock).toHaveBeenCalledWith('redis')
      expect(serviceCheckFactoryMock).toHaveBeenCalledWith(
        'tokenVerification',
        `${config.apis.tokenVerification.url}/health/ping`,
        config.apis.tokenVerification.agent,
      )
      expect(result).toEqual(
        expect.objectContaining({
          status: 'UP',
          components: {
            hmppsAuth: {
              status: 'UP',
              details: 'OK',
            },
            redis: {
              status: 'UP',
              details: 'OK',
            },
            tokenVerification: {
              status: 'UP',
              details: 'OK',
            },
          },
        }),
      )
      done()
    }

    healthCheck(testAppInfo, callback)
  })

  it('marks dependent services as DOWN when checks fail', done => {
    const authCheck = jest.fn().mockRejectedValue(new Error('auth down'))
    const redisCheck = jest.fn().mockRejectedValue(new Error('redis down'))

    serviceCheckFactoryMock.mockReturnValue(authCheck)
    redisServiceCheckFactoryMock.mockReturnValue(redisCheck)

    config.redis.enabled = true
    config.apis.tokenVerification.enabled = false

    const callback: HealthCheckCallback = result => {
      expect(result.status).toEqual('DOWN')
      expect(result.components).toEqual({
        hmppsAuth: {
          status: 'DOWN',
          details: expect.any(Error),
        },
        redis: {
          status: 'DOWN',
          details: expect.any(Error),
        },
      })
      done()
    }

    healthCheck(testAppInfo, callback)
  })
})

function successfulCheck(name: string): HealthCheckService {
  return () =>
    Promise.resolve({
      name: `${name}`,
      status: 'UP',
      message: 'some message',
    })
}

function erroredCheck(name: string): HealthCheckService {
  return () =>
    Promise.resolve({
      name: `${name}`,
      status: 'DOWN',
      message: 'some error',
    })
}
