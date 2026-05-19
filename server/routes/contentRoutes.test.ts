import express, { type NextFunction, type Request, type Response } from 'express'
import request from 'supertest'

import type { Services } from '../services'
import type CacheService from '../services/cacheService'
import type UserService from '../services/userService'
import type { HmppsUser } from '../interfaces/hmppsUser'
import contentRoutes from './contentRoutes'

jest.mock('../middleware/authorisationMiddleware', () => ({
  __esModule: true,
  default: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

jest.mock('../authentication/auth', () => ({
  __esModule: true,
  default: {
    authenticationMiddleware: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  },
}))

jest.mock('../data/tokenVerification', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('../middleware/populateCurrentUser', () => ({
  __esModule: true,
  default: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

const getAccessibilityServicesForUser = jest.fn()
jest.mock('../services/utils/getAccessibilityServicesForUser', () => ({
  __esModule: true,
  default: (...args: unknown[]) => getAccessibilityServicesForUser(...args),
}))

const emptyServices = {
  userService: {} as UserService,
  cacheService: {} as CacheService,
} as Services

describe('contentRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  function appWithUser(user: Pick<HmppsUser, 'authSource' | 'services'> | { authSource: string; services: unknown[] }) {
    const app = express()
    app.use((_req, res, next) => {
      res.render = function renderJson(this: Response, view: string, model?: unknown) {
        return this.status(200).json({ view, model })
      }
      res.locals.user = user as HmppsUser
      next()
    })
    app.use(contentRoutes(emptyServices))
    return app
  }

  it('GET / renders markdown index', async () => {
    const app = appWithUser({ authSource: 'delius', services: [] })
    const res = await request(app).get('/')

    expect(res.body.view).toBe('pages/markdown')
    expect(res.body.model.page).toBe('index')
    expect(res.body.model.components).toBeTruthy()
  })

  it('GET /cookies-policy renders markdown with backlink', async () => {
    const app = appWithUser({ authSource: 'delius', services: [] })
    const res = await request(app).get('/cookies-policy')

    expect(res.body.view).toBe('pages/markdown')
    expect(res.body.model.page).toBe('cookies-policy')
    expect(res.body.model.showBacklink).toBe(true)
  })

  it('GET /services renders services page', async () => {
    const app = appWithUser({ authSource: 'delius', services: [] })
    const res = await request(app).get('/services')

    expect(res.body.view).toBe('pages/services')
  })

  it('GET /accessibility uses accessibility services for delius users', async () => {
    getAccessibilityServicesForUser.mockReturnValue([{ id: 'svc1' }])
    const app = appWithUser({ authSource: 'delius', services: [{ id: 'raw' }] })
    const res = await request(app).get('/accessibility')

    expect(getAccessibilityServicesForUser).toHaveBeenCalledWith([{ id: 'raw' }])
    expect(res.body.view).toBe('pages/accessibility')
    expect(res.body.model.services).toEqual([{ id: 'svc1' }])
  })

  it('GET /accessibility uses DEFAULT_USER_ACCESS for non-delius users', async () => {
    const app = appWithUser({ authSource: 'nomis', services: [{ id: 'raw' }] })
    const res = await request(app).get('/accessibility')

    expect(getAccessibilityServicesForUser).not.toHaveBeenCalled()
    expect(res.body.view).toBe('pages/accessibility')
    expect(res.body.model.services).toEqual({ services: [] })
  })
})
