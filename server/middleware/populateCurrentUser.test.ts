import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'

import populateCurrentUser from './populateCurrentUser'
import type { UserService } from '../services'
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

function createToken(overrides: Record<string, unknown> = {}) {
  return jwt.sign(
    {
      name: 'Token User',
      user_id: '11111',
      user_uuid: 'TOKEN_USER_111',
      user_name: 'TOKEN_USER',
      auth_source: 'delius',
      authorities: ['ROLE_PROBATION'],
      ...overrides,
    },
    'secret',
    { expiresIn: '1h' },
  )
}

describe('populateCurrentUser', () => {
  const next = jest.fn()
  const getServicesForUser = jest.fn().mockReturnValue([{ id: 'svc', navEnabled: true }])
  const userService = { getServicesForUser } as unknown as UserService

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('populates res.locals.user from token and logs with user_uuid', async () => {
    const token = createToken()
    const req = {
      auth: {
        user_name: 'TOKEN_USER',
        auth_source: 'delius',
      },
      headers: { 'x-user-token': token },
    } as unknown as Request
    const res = { locals: {} } as unknown as Response

    await new Promise<void>((resolve, reject) => {
      runWithCurrentUserContext(() => {
        Promise.resolve(
          populateCurrentUser(userService)(req, res, (...args: unknown[]) => {
            next(...args)
            resolve()
          }),
        ).catch(reject)
      })
    })

    expect(next).toHaveBeenCalledWith()
    expect(res.locals.user).toEqual(
      expect.objectContaining({
        token,
        username: 'TOKEN_USER',
        authSource: 'delius',
        userId: '11111',
        userUuid: 'TOKEN_USER_111',
        name: 'Token User',
        displayName: 'Token User',
        userRoles: ['PROBATION'],
      }),
    )
    expect(logger.info).toHaveBeenCalledWith({ user_uuid: 'TOKEN_USER_111' }, 'Populated current user details')
    expect(logger.debug).toHaveBeenCalledWith(
      { user_uuid: 'TOKEN_USER_111' },
      expect.stringContaining('The list of User Roles are'),
    )
  })

  it('logs an error when population fails', async () => {
    const req = { headers: {} } as unknown as Request
    const res = {
      locals: {
        user: { token: 'not-a-jwt', username: 'USER1' },
      },
    } as unknown as Response

    await new Promise<void>((resolve, reject) => {
      runWithCurrentUserContext(() => {
        Promise.resolve(
          populateCurrentUser(userService)(req, res, (...args: unknown[]) => {
            next(...args)
            resolve()
          }),
        ).catch(reject)
      })
    })

    expect(next).toHaveBeenCalledWith(expect.any(Error))
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ user_uuid: 'anonymous', err: expect.any(Error) }),
      expect.stringContaining('Failed to populate user details for: USER1'),
    )
  })
})
