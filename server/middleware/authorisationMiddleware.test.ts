import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'

import authorisationMiddleware from './authorisationMiddleware'
import { runWithCurrentUserContext } from '../utils/currentUserContext'

jest.mock('../../logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// eslint-disable-next-line import/first
import logger from '../../logger'

function createToken(authorities: string[], userUuid = 'uuid-auth-1') {
  const payload = {
    user_name: 'USER1',
    scope: ['read', 'write'],
    auth_source: 'delius',
    authorities,
    user_uuid: userUuid,
    jti: 'a610a10-cca6-41db-985f-e87efb303aaf',
    client_id: 'clientid',
  }

  return jwt.sign(payload, 'secret', { expiresIn: '1h' })
}

describe('authorisationMiddleware', () => {
  let req: Request
  const next = jest.fn()

  function createResWithToken({ authorities }: { authorities: string[] }): Response {
    return {
      locals: {
        user: {
          token: createToken(authorities),
        },
      },
      redirect: jest.fn(),
    } as unknown as Response
  }

  function createResWithoutToken(): Response {
    return {
      locals: {},
      redirect: jest.fn(),
    } as unknown as Response
  }

  beforeEach(() => {
    jest.resetAllMocks()
    req = {
      originalUrl: '/protected',
      session: {},
    } as unknown as Request
  })

  function invoke(middleware: ReturnType<typeof authorisationMiddleware>, res: Response) {
    return new Promise<void>((resolve, reject) => {
      runWithCurrentUserContext(() => {
        try {
          middleware(req, res, (...args: unknown[]) => {
            next(...args)
            resolve()
          })
          // redirect paths do not call next
          setImmediate(() => {
            if ((res.redirect as jest.Mock).mock.calls.length) {
              resolve()
            }
          })
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  it('should return next when no required roles', async () => {
    const res = createResWithToken({ authorities: [] })

    await invoke(authorisationMiddleware(), res)

    expect(next).toHaveBeenCalled()
    expect(res.redirect).not.toHaveBeenCalled()
    expect(logger.debug).toHaveBeenCalledWith({ user_uuid: 'uuid-auth-1' }, 'User authorised to access route')
  })

  it('should redirect when user has no authorised roles', async () => {
    const res = createResWithToken({ authorities: [] })

    await invoke(authorisationMiddleware(['SOME_REQUIRED_ROLE']), res)

    expect(next).not.toHaveBeenCalled()
    expect(res.redirect).toHaveBeenCalledWith('/authError')
    expect(logger.error).toHaveBeenCalledWith({ user_uuid: 'uuid-auth-1' }, 'User is not authorised to access this')
  })

  it('should return next when user has authorised role', async () => {
    const res = createResWithToken({ authorities: ['SOME_REQUIRED_ROLE'] })

    await invoke(authorisationMiddleware(['SOME_REQUIRED_ROLE']), res)

    expect(next).toHaveBeenCalled()
    expect(res.redirect).not.toHaveBeenCalled()
    expect(logger.debug).toHaveBeenCalledWith({ user_uuid: 'uuid-auth-1' }, 'User authorised to access route')
  })

  it('should redirect to sign-in and warn when no token is present', async () => {
    const res = createResWithoutToken()

    await invoke(authorisationMiddleware(), res)

    expect(next).not.toHaveBeenCalled()
    expect(res.redirect).toHaveBeenCalledWith('/sign-in')
    expect(req.session.returnTo).toBe('/protected')
    expect(logger.warn).toHaveBeenCalledWith(
      { user_uuid: 'anonymous' },
      'No user token present, redirecting to sign-in',
    )
  })
})
