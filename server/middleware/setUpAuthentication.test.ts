import express, { type NextFunction, type Request, type Response } from 'express'
import request from 'supertest'
import type { Session } from 'express-session'

import setUpAuth from './setUpAuthentication'

const passportInitialize = jest.fn(() => (_req: Request, _res: Response, next: NextFunction) => next())
const passportSession = jest.fn(() => (_req: Request, _res: Response, next: NextFunction) => next())
const passportAuthenticate = jest.fn()

jest.mock('passport', () => ({
  __esModule: true,
  default: {
    initialize: () => passportInitialize(),
    session: () => passportSession(),
    authenticate: (...args: unknown[]) => passportAuthenticate(...args),
  },
}))

const flash = jest.fn(() => (_req: Request, _res: Response, next: NextFunction) => next())
jest.mock('connect-flash', () => ({
  __esModule: true,
  default: () => flash(),
}))

const authInit = jest.fn()
jest.mock('../authentication/auth', () => ({
  __esModule: true,
  default: {
    init: () => authInit(),
  },
}))

jest.mock('../config', () => ({
  __esModule: true,
  default: {
    domain: 'https://example.test',
    apis: {
      hmppsAuth: {
        externalUrl: 'https://auth.external.test',
        authCodeClientId: 'client-id',
      },
    },
  },
}))

describe('setUpAuthentication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    passportAuthenticate.mockReturnValue((_req: Request, _res: Response, next: NextFunction) => next())
  })

  function appWithRouter() {
    const app = express()
    app.use(express.urlencoded({ extended: false }))
    app.use(express.json())
    app.use((req, _res, next) => {
      if (!req.session) {
        req.session = { destroy: (cb: () => void) => cb() } as Session
      }
      next()
    })
    app.use((_req, res, next) => {
      res.render = function renderJson(this: Response, view: string) {
        return this.json({ view })
      }
      next()
    })
    app.use(setUpAuth())
    return app
  }

  it('calls auth.init() when setting up', () => {
    appWithRouter()
    expect(authInit).toHaveBeenCalled()
  })

  it('GET /autherror responds 401 and renders autherror', async () => {
    const app = appWithRouter()

    const res = await request(app).get('/autherror')

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ view: 'autherror' })
  })

  it('GET /sign-in uses passport.authenticate("oauth2")', async () => {
    passportAuthenticate.mockReturnValue((_req: Request, res: Response) => res.status(200).send('ok'))
    const app = appWithRouter()

    const res = await request(app).get('/sign-in')

    expect(passportAuthenticate).toHaveBeenCalledWith('oauth2')
    expect(res.status).toBe(200)
  })

  it('GET /sign-in/callback invokes passport.authenticate with successReturnToOrRedirect and failureRedirect', async () => {
    passportAuthenticate.mockImplementation((_strategy: unknown, opts: Record<string, string>) => {
      return (req: Request, res: Response) => res.status(200).json({ opts, returnTo: req.session?.returnTo })
    })
    const app = appWithRouter()

    const res = await request(app).get('/sign-in/callback')

    const callbackCall = passportAuthenticate.mock.calls.find(c => typeof c[1] === 'object')
    expect(callbackCall).toEqual([
      'oauth2',
      {
        successReturnToOrRedirect: '',
        failureRedirect: '/autherror',
      },
    ])
    expect(res.status).toBe(200)
  })

  it('GET /sign-in/callback uses req.session.returnTo when set', async () => {
    passportAuthenticate.mockImplementation((_strategy: unknown, _opts: Record<string, string>) => {
      return (req: Request, res: Response) => res.status(200).json({ opts: _opts })
    })
    const app = express()
    app.use((req, _res, next) => {
      req.session = { returnTo: '/somewhere' } as unknown as Session
      next()
    })
    app.use(appWithRouter())

    const res = await request(app).get('/sign-in/callback')

    expect(res.body.opts.successReturnToOrRedirect).toBe('/somewhere')
  })

  it('GET /account-details redirects to external account details', async () => {
    const app = appWithRouter()

    const res = await request(app).get('/account-details')

    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('https://auth.external.test/account-details')
  })

  it('GET /sign-out redirects immediately when no req.user', async () => {
    const app = appWithRouter()

    const res = await request(app).get('/sign-out')

    expect(res.status).toBe(302)
    expect(res.headers.location).toBe(
      'https://auth.external.test/sign-out?client_id=client-id&redirect_uri=https://example.test',
    )
  })

  it('GET /sign-out logs out then destroys session then redirects when req.user exists', async () => {
    const app = express()
    app.use((req, _res, next) => {
      req.user = { username: 'USER1' } as Express.User
      req.logout = jest.fn((optsOrCb?: unknown, cb?: (err: unknown) => void) => {
        if (typeof optsOrCb === 'function') {
          ;(optsOrCb as () => void)()
        } else if (cb) {
          cb(undefined)
        }
      }) as Request['logout']
      req.session = { destroy: (callback: () => void) => callback() } as Session
      next()
    })
    app.use(appWithRouter())

    const res = await request(app).get('/sign-out')

    expect(res.status).toBe(302)
    expect(res.headers.location).toBe(
      'https://auth.external.test/sign-out?client_id=client-id&redirect_uri=https://example.test',
    )
  })

  it('sets res.locals.user from req.user', async () => {
    const app = express()
    app.use((req, _res, next) => {
      req.user = { username: 'USER1' } as Express.User
      next()
    })
    app.use((req, res, next) => {
      res.render = function renderOk(this: Response) {
        return this.status(200).send('ok')
      }
      next()
    })
    app.use(setUpAuth())
    app.get('/check', (_req, res) => res.status(200).json({ user: res.locals.user }))

    const res = await request(app).get('/check')

    expect(res.body.user).toEqual({ username: 'USER1' })
  })
})
