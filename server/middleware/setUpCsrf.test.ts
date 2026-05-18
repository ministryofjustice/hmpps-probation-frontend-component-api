import express, { type NextFunction, type Request, type Response, type Router } from 'express'
import request from 'supertest'

const csrfSynchronisedProtection = jest.fn((_req: Request, _res: Response, next: NextFunction) => next())
const csrfSyncMock = jest.fn((_opts?: unknown) => ({ csrfSynchronisedProtection }))

jest.mock('csrf-sync', () => ({
  csrfSync: (opts: unknown) => csrfSyncMock(opts),
}))

describe('setUpCsrf', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('does not register csrf protection middleware in test mode', async () => {
    process.env.NODE_ENV = 'test'

    let app: express.Application
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
      const setUpCsrf = require('./setUpCsrf').default as () => Router
      app = express()
      app.use(express.urlencoded({ extended: false }))
      app.use(express.json())
      app.use(setUpCsrf())
      app.post('/submit', (_req, res) => res.status(200).send('ok'))
    })

    await request(app!).post('/submit').send({ _csrf: 'token' }).expect(200)

    expect(csrfSyncMock).not.toHaveBeenCalled()
    expect(csrfSynchronisedProtection).not.toHaveBeenCalled()
  })

  it('registers csrf protection middleware when not in test mode', async () => {
    process.env.NODE_ENV = 'production'

    let app: express.Application
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
      const setUpCsrf = require('./setUpCsrf').default as () => Router
      app = express()
      app.use(express.urlencoded({ extended: false }))
      app.use(express.json())
      app.use(setUpCsrf())
      app.post('/submit', (_req, res) => res.status(200).send('ok'))
    })

    await request(app!).post('/submit').send({ _csrf: 'token' })

    expect(csrfSyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        getTokenFromRequest: expect.any(Function),
      }),
    )
    expect(csrfSynchronisedProtection).toHaveBeenCalled()
  })

  it('sets res.locals.csrfToken when req.csrfToken exists', async () => {
    process.env.NODE_ENV = 'test'

    let app: express.Application
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
      const setUpCsrf = require('./setUpCsrf').default as () => Router
      app = express()
      app.use((req, _res, next) => {
        ;(req as Request & { csrfToken: () => string }).csrfToken = () => 'csrf-123'
        next()
      })
      app.use(setUpCsrf())
      app.get('/csrf', (_req, res) => res.status(200).json({ csrf: res.locals.csrfToken }))
    })

    const res = await request(app!).get('/csrf')
    expect(res.body.csrf).toBe('csrf-123')
    expect(csrfSynchronisedProtection).not.toHaveBeenCalled()
  })

  it('does not set res.locals.csrfToken when req.csrfToken is missing', async () => {
    process.env.NODE_ENV = 'test'

    let app: express.Application
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
      const setUpCsrf = require('./setUpCsrf').default as () => Router
      app = express()
      app.use(setUpCsrf())
      app.get('/csrf', (_req, res) => res.status(200).json({ csrf: res.locals.csrfToken ?? null }))
    })

    const res = await request(app!).get('/csrf')
    expect(res.body.csrf).toBeNull()
  })
})
