import express, { type NextFunction, type Request, type Response, type Router } from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'

import type { HmppsUser } from '../interfaces/hmppsUser'

import type { Services } from '../services'
import type CacheService from '../services/cacheService'
import type UserService from '../services/userService'

const loggerError = jest.fn()

jest.mock('../../logger', () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => loggerError(...args),
    debug: (...args: unknown[]) => loggerError(...args),
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
    res.locals.user = { username: 'USER1' } as unknown as HmppsUser
    next()
  },
}))

const minimalServices = {
  userService: {} as UserService,
  cacheService: {} as CacheService,
} as Services

type ComponentRoutesFactory = (services: Services) => Router

describe('componentRoutes auth/error handling', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    delete process.env.NODE_ENV
  })

  it('uses jwt.decode when NODE_ENV=inttest', async () => {
    process.env.NODE_ENV = 'inttest'

    await new Promise<void>((resolve, reject) => {
      jest.isolateModules(() => {
        ;(async () => {
          try {
            const expressjwt = jest.fn()
            jest.doMock('express-jwt', () => ({
              expressjwt: () => expressjwt,
            }))

            // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
            const componentRoutes = require('./componentRoutes').default as ComponentRoutesFactory

            const app = express()
            app.use('/api', componentRoutes(minimalServices))

            const token = jwt.sign({ user_name: 'USER1' }, 'secret')
            await request(app).get('/api/components').set('x-user-token', token).expect(200)

            expect(expressjwt).not.toHaveBeenCalled()
            resolve()
          } catch (err) {
            reject(err)
          }
        })().catch(reject)
      })
    })
  })

  it('calls getToken and returns 500 + logs for unexpected errors', async () => {
    await new Promise<void>((resolve, reject) => {
      jest.isolateModules(() => {
        ;(async () => {
          try {
            jest.doMock('express-jwt', () => ({
              expressjwt:
                (opts: { getToken: (req: Request) => string }) =>
                (req: Request, _res: Response, next: NextFunction) => {
                  expect(opts.getToken(req)).toBe('token-1')
                  const err = new Error('boom')
                  next(err)
                },
            }))

            // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
            const componentRoutes = require('./componentRoutes').default as ComponentRoutesFactory

            const app = express()
            app.use('/api', componentRoutes(minimalServices))

            const res = await request(app).get('/api/components').set('x-user-token', 'token-1')

            expect(res.status).toBe(500)
            expect(res.text).toBe('An unexpected error occurred')
            expect(loggerError).toHaveBeenCalledWith('boom')
            resolve()
          } catch (err) {
            reject(err)
          }
        })().catch(reject)
      })
    })
  })
})
