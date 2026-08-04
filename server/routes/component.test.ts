import request from 'supertest'
import * as cheerio from 'cheerio'
import { NextFunction, Request } from 'express'
import { App } from 'supertest/types'
import jwt from 'jsonwebtoken'
import createApp from '../app'
import { UserService } from '../services'
import type CacheService from '../services/cacheService'
import { getTokenDataMock } from '../../tests/mocks/TokenDataMock'
import { disconnectRedisClient } from '../middleware/setUpWebSession'

jest.mock('../applicationInfo', () => () => ({
  applicationName: 'test',
  buildNumber: '1',
  gitRef: 'long ref',
  gitShortHash: 'short ref',
  branchName: 'main',
}))

jest.mock('jwks-rsa', () => ({
  __esModule: true,
  default: {
    expressJwtSecret: () => jest.fn(),
  },
}))

/**
 * Redis is enabled by default in config. Stub the client so createApp → setUpWebSession
 * (connect-redis RedisStore) never opens a real connection during unit tests.
 */
jest.mock('../data/redisClient', () => {
  const createMockRedisClient = () => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isOpen: true,
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    mGet: jest.fn().mockResolvedValue([]),
    scanIterator: jest.fn(async function* scanIterator() {
      // no keys
    }),
    on: jest.fn(),
    unref: jest.fn(),
  })

  return {
    createRedisClient: jest.fn(() => createMockRedisClient()),
  }
})

const token = jwt.sign(getTokenDataMock(), 'secret')

jest.mock('express-jwt', () => ({
  expressjwt: () => (req: Request, _res: Response, next: NextFunction) => {
    if (req.headers['x-user-token'] !== token) {
      const error = new Error()
      error.name = 'UnauthorizedError'
      return next(error)
    }
    req.auth = getTokenDataMock()
    return next()
  },
}))

const cacheService = {
  getData: jest.fn(),
  setData: jest.fn(),
} as unknown as jest.Mocked<CacheService>

let app: App

beforeAll(() => {
  cacheService.getData.mockResolvedValue(null)
  cacheService.setData.mockResolvedValue('OK')
  // Wire UserService to the same stub — do not call services(), which would build a live Redis-backed cache
  app = createApp({ userService: new UserService(cacheService), cacheService })
})

beforeEach(() => {
  jest.clearAllMocks()
  cacheService.getData.mockResolvedValue(null)
  cacheService.setData.mockResolvedValue('OK')
})

afterAll(() => {
  disconnectRedisClient()
})

describe('GET /api/components', () => {
  // Cold nunjucks/app bootstrap can exceed the default 5s on the first request
  jest.setTimeout(15000)

  it('should return multiple components if requested', () => {
    return request(app)
      .get('/api/components?component=header&component=footer')
      .set('x-user-token', token)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(res => {
        const body = JSON.parse(res.text)

        const $header = cheerio.load(body.header.html)
        expect(
          $header('a[class="probation-common-header__link probation-common-header__title__organisation-name"]').text(),
        ).toContain('Probation Digital Services')
        expect(body.header.css).toEqual(['http://localhost:3001/assets/css/header.css'])

        expect(body.footer.css).toEqual(['http://localhost:3001/assets/css/footer.css'])
        expect(body.footer.javascript).toEqual([])
      })
  })

  it('should include provided classes in header html when requested', () => {
    return request(app)
      .get('/api/components?component=header&classes=my-wrapper-class')
      .set('x-user-token', token)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(res => {
        const body = JSON.parse(res.text)
        expect(body.header).toBeDefined()
        expect(body.header.html).toContain('my-wrapper-class')
      })
  })

  it('should return one component if requested', () => {
    return request(app)
      .get('/api/components?component=footer')
      .set('x-user-token', token)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(res => {
        const body = JSON.parse(res.text)
        expect(body.header).toBeUndefined()
        expect(body.footer).toBeDefined()
      })
  })

  it('should return empty object if no query params', () => {
    return request(app)
      .get('/api/components')
      .set('x-user-token', token)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(res => {
        const body = JSON.parse(res.text)
        expect(body).toEqual({})
      })
  })

  it('should not matter the order of params', () => {
    return request(app)
      .get('/api/components?component=footer&component=header')
      .set('x-user-token', token)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(res => {
        const body = JSON.parse(res.text)
        const $header = cheerio.load(body.header.html)

        expect(
          $header('a[class="probation-common-header__link probation-common-header__title__organisation-name"]').text(),
        ).toContain('Probation Digital Services')
      })
  })

  it('should filter out undefined components', () => {
    return request(app)
      .get('/api/components?component=footer&component=golf')
      .set('x-user-token', token)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(res => {
        const body = JSON.parse(res.text)
        expect(body.header).toBeUndefined()
        expect(body.golf).toBeUndefined()
        expect(body.footer.html).toBeDefined()
      })
  })

  describe('auth', () => {
    it('should send 401 if no token provided', () => {
      return request(app).get('/api/components').expect(401)
    })
  })
})
