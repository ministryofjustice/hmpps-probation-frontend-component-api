import { createHash } from 'crypto'
import express, { type NextFunction, type Request, type Response, type Router } from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'

import type { HmppsUser } from '../interfaces/hmppsUser'
import type { Services } from '../services'
import type CacheService from '../services/cacheService'
import type UserService from '../services/userService'
import { buildComponentsCacheKey, type ComponentsResponseBody } from './componentRoutes'

jest.mock('../../logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('jwks-rsa', () => ({
  __esModule: true,
  default: {
    expressJwtSecret: () => jest.fn(),
  },
}))

jest.mock('../config', () => ({
  __esModule: true,
  default: {
    ingressUrl: 'http://localhost:3000',
    apis: {
      hmppsAuth: {
        url: 'http://auth.local',
      },
    },
  },
}))

jest.mock('../middleware/populateCurrentUser', () => ({
  __esModule: true,
  default: () => (_req: Request, res: Response, next: NextFunction) => {
    res.locals.user = {
      username: 'USER1',
      displayName: 'User One',
      authSource: 'delius',
      userRoles: [],
      services: [],
    } as unknown as HmppsUser
    next()
  },
}))

type ComponentRoutesFactory = (services: Services) => Router

const cachedBody: ComponentsResponseBody = {
  header: {
    html: '<header>cached</header>',
    css: ['http://localhost:3000/assets/css/header.css'],
    javascript: ['http://localhost:3000/assets/js/header.js'],
  },
  meta: { services: [] },
}

describe('buildComponentsCacheKey', () => {
  it('hashes the user token and includes sorted component names', () => {
    const token = 'user-token-1'
    const expectedHash = createHash('sha256').update(token).digest('hex')

    expect(buildComponentsCacheKey(token, ['footer', 'header'])).toBe(`components:${expectedHash}:footer,header`)
    expect(buildComponentsCacheKey(token, ['header', 'footer'])).toBe(`components:${expectedHash}:footer,header`)
  })

  it('produces different keys for different user tokens', () => {
    expect(buildComponentsCacheKey('token-a', ['header'])).not.toBe(buildComponentsCacheKey('token-b', ['header']))
  })

  it('produces different keys for different component sets', () => {
    expect(buildComponentsCacheKey('token-a', ['header'])).not.toBe(
      buildComponentsCacheKey('token-a', ['header', 'footer']),
    )
  })
})

describe('componentRoutes caching', () => {
  const getData = jest.fn()
  const setData = jest.fn()

  const services = {
    userService: {} as UserService,
    cacheService: { getData, setData } as unknown as CacheService,
  } as Services

  const token = jwt.sign({ user_name: 'USER1' }, 'secret')

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env.NODE_ENV = 'inttest'
    getData.mockResolvedValue(null)
    setData.mockResolvedValue('OK')
  })

  afterEach(() => {
    delete process.env.NODE_ENV
  })

  async function createApp(): Promise<express.Express> {
    return new Promise((resolve, reject) => {
      jest.isolateModules(() => {
        ;(async () => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
            const componentRoutes = require('./componentRoutes').default as ComponentRoutesFactory

            const app = express()
            app.use((req, res, next) => {
              res.render = ((_view: string, _options: object, callback?: (err: Error, html: string) => void) => {
                callback(null, '<div>rendered</div>')
              }) as typeof res.render
              next()
            })
            app.use('/api', componentRoutes(services))
            resolve(app)
          } catch (err) {
            reject(err)
          }
        })().catch(reject)
      })
    })
  }

  it('returns a cached response without rendering or writing to the cache', async () => {
    getData.mockResolvedValue(cachedBody)
    const app = await createApp()

    const res = await request(app).get('/api/components?component=header').set('x-user-token', token).expect(200)

    expect(res.body).toEqual(cachedBody)
    expect(getData).toHaveBeenCalledWith(buildComponentsCacheKey(token, ['header']))
    expect(setData).not.toHaveBeenCalled()
  })

  it('renders, caches and returns the response on a cache miss', async () => {
    const app = await createApp()

    const res = await request(app).get('/api/components?component=header').set('x-user-token', token).expect(200)

    expect(res.body.header.html).toBe('<div>rendered</div>')
    expect(getData).toHaveBeenCalledWith(buildComponentsCacheKey(token, ['header']))
    expect(setData).toHaveBeenCalledWith(buildComponentsCacheKey(token, ['header']), res.body)
  })

  it('does not mix cached responses between different user tokens', async () => {
    const tokenA = jwt.sign({ user_name: 'USER_A' }, 'secret')
    const tokenB = jwt.sign({ user_name: 'USER_B' }, 'secret')
    const cachedForA: ComponentsResponseBody = {
      header: { html: '<header>user-a</header>', css: [], javascript: [] },
      meta: {
        services: [
          { id: 'a', heading: 'A', navEnabled: true, href: '/', accessibilityHeading: '', accessibilityUrl: '' },
        ],
      },
    }

    getData.mockImplementation(async (key: string) => {
      if (key === buildComponentsCacheKey(tokenA, ['header'])) {
        return cachedForA
      }
      return null
    })

    const app = await createApp()

    const resA = await request(app).get('/api/components?component=header').set('x-user-token', tokenA).expect(200)
    const resB = await request(app).get('/api/components?component=header').set('x-user-token', tokenB).expect(200)

    expect(resA.body).toEqual(cachedForA)
    expect(resB.body.header.html).toBe('<div>rendered</div>')
    expect(resB.body).not.toEqual(cachedForA)

    expect(getData).toHaveBeenCalledWith(buildComponentsCacheKey(tokenA, ['header']))
    expect(getData).toHaveBeenCalledWith(buildComponentsCacheKey(tokenB, ['header']))
    expect(setData).toHaveBeenCalledTimes(1)
    expect(setData).toHaveBeenCalledWith(buildComponentsCacheKey(tokenB, ['header']), resB.body)
  })

  it('uses the same cache key regardless of component query order', async () => {
    const app = await createApp()

    await request(app).get('/api/components?component=footer&component=header').set('x-user-token', token).expect(200)

    await request(app).get('/api/components?component=header&component=footer').set('x-user-token', token).expect(200)

    const expectedKey = buildComponentsCacheKey(token, ['footer', 'header'])
    expect(getData).toHaveBeenNthCalledWith(1, expectedKey)
    expect(getData).toHaveBeenNthCalledWith(2, expectedKey)
  })

  it('does not use the cache when no valid components are requested', async () => {
    const app = await createApp()

    const res = await request(app).get('/api/components').set('x-user-token', token).expect(200)

    expect(res.body).toEqual({})
    expect(getData).not.toHaveBeenCalled()
    expect(setData).not.toHaveBeenCalled()
  })
})
