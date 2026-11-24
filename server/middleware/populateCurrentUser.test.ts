import { createHash } from 'crypto'
import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { AuthenticationClient, InMemoryTokenStore } from '@ministryofjustice/hmpps-auth-clients'

import populateCurrentUser, { buildLocationCacheKey } from './populateCurrentUser'
import type { UserService } from '../services'
import type CacheService from '../services/cacheService'
import { runWithCurrentUserContext } from '../utils/currentUserContext'
import ProbationLocationClient from '../data/probationLocationClient'
import { ProbationOfficerLocation } from '../data/models/probationOfficerLocation'

import config from '../config'
import logger from '../../logger'

jest.mock('../../logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('../data/probationLocationClient')

const ProbationLocationClientMock = ProbationLocationClient as jest.MockedClass<typeof ProbationLocationClient>

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

const locationDetails: ProbationOfficerLocation = {
  currentProvider: 'N07',
  currentTeam: 'N07AAA',
}

describe('buildLocationCacheKey', () => {
  it('hashes the JWT so the raw token is not stored as the redis key', () => {
    const token = 'jwt.token.value'
    const expectedHash = createHash('sha256').update(token).digest('hex')

    expect(buildLocationCacheKey(token)).toBe(`location:${expectedHash}`)
    expect(buildLocationCacheKey(token)).not.toContain(token)
  })
})

describe('populateCurrentUser', () => {
  const next = jest.fn()
  const getServicesForUser = jest.fn().mockReturnValue([{ id: 'svc', navEnabled: true }])
  const userService = { getServicesForUser } as unknown as UserService
  const authClient = new AuthenticationClient(config.apis.hmppsAuth, logger, new InMemoryTokenStore())
  const getLocationDetails = jest.fn()
  const cacheService = {
    getData: jest.fn(),
    setData: jest.fn().mockResolvedValue('OK'),
  } as unknown as jest.Mocked<CacheService>

  const runMiddleware = (req: Request, res: Response) =>
    new Promise<void>((resolve, reject) => {
      runWithCurrentUserContext(() => {
        Promise.resolve(
          populateCurrentUser(userService, authClient, cacheService)(req, res, (...args: unknown[]) => {
            next(...args)
            resolve()
          }),
        ).catch(reject)
      })
    })

  beforeEach(() => {
    jest.clearAllMocks()
    ProbationLocationClientMock.mockImplementation(
      () =>
        ({
          getLocationDetails,
        }) as unknown as ProbationLocationClient,
    )
    getLocationDetails.mockResolvedValue(locationDetails)
    cacheService.getData.mockResolvedValue(null)
    cacheService.setData.mockResolvedValue('OK')
  })

  it('populates res.locals.user from token, fetches location on cache miss, and caches it', async () => {
    const token = createToken()
    const req = {
      auth: {
        user_name: 'TOKEN_USER',
        auth_source: 'delius',
      },
      headers: { 'x-user-token': token },
    } as unknown as Request
    const res = { locals: {} } as unknown as Response

    await runMiddleware(req, res)

    const expectedCacheKey = buildLocationCacheKey(token)

    expect(next).toHaveBeenCalledWith()
    expect(cacheService.getData).toHaveBeenCalledWith(expectedCacheKey)
    expect(getLocationDetails).toHaveBeenCalledWith(token)
    expect(cacheService.setData).toHaveBeenCalledWith(expectedCacheKey, locationDetails)
    expect(res.locals.user).toEqual(
      expect.objectContaining({
        token,
        username: 'TOKEN_USER',
        authSource: 'delius',
        userId: '11111',
        userUuid: 'TOKEN_USER_111',
        name: 'Token User',
        displayName: 'Token User',
        location: 'N07AAA',
        userRoles: ['PROBATION'],
      }),
    )
    expect(logger.info).toHaveBeenCalledWith({ user_uuid: 'TOKEN_USER_111' }, 'Populated current user details')
    expect(logger.debug).toHaveBeenCalledWith(
      { user_uuid: 'TOKEN_USER_111' },
      expect.stringContaining('The list of User Roles are'),
    )
  })

  it('uses cached location and skips the location API on cache hit', async () => {
    const token = createToken()
    const cachedLocation: ProbationOfficerLocation = {
      currentProvider: 'N01',
      currentTeam: 'CACHED_TEAM',
    }
    cacheService.getData.mockResolvedValue(cachedLocation)

    const req = {
      auth: {
        user_name: 'TOKEN_USER',
        auth_source: 'delius',
      },
      headers: { 'x-user-token': token },
    } as unknown as Request
    const res = { locals: {} } as unknown as Response

    await runMiddleware(req, res)

    expect(next).toHaveBeenCalledWith()
    expect(cacheService.getData).toHaveBeenCalledWith(buildLocationCacheKey(token))
    expect(getLocationDetails).not.toHaveBeenCalled()
    expect(cacheService.setData).not.toHaveBeenCalled()
    expect(res.locals.user).toEqual(
      expect.objectContaining({
        location: 'CACHED_TEAM',
      }),
    )
  })

  it('logs an error when population fails', async () => {
    const req = { headers: {} } as unknown as Request
    const res = {
      locals: {
        user: { token: 'not-a-jwt', username: 'USER1' },
      },
    } as unknown as Response

    await runMiddleware(req, res)

    expect(next).toHaveBeenCalledWith(expect.any(Error))
    expect(getLocationDetails).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ user_uuid: 'anonymous', err: expect.any(Error) }),
      expect.stringContaining('Failed to populate user details for: USER1'),
    )
  })

  it('passes location API failures to next', async () => {
    const token = createToken()
    const locationError = new Error('location unavailable')
    getLocationDetails.mockRejectedValue(locationError)

    const req = {
      auth: {
        user_name: 'TOKEN_USER',
        auth_source: 'delius',
      },
      headers: { 'x-user-token': token },
    } as unknown as Request
    const res = { locals: {} } as unknown as Response

    await runMiddleware(req, res)

    expect(next).toHaveBeenCalledWith(locationError)
    expect(cacheService.setData).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ user_uuid: 'TOKEN_USER_111', err: locationError }),
      expect.stringContaining('Failed to populate user details for: TOKEN_USER'),
    )
  })

  it('maps an empty authorities claim to empty user roles', async () => {
    const token = createToken({ authorities: undefined })
    const req = {
      auth: {
        user_name: 'TOKEN_USER',
        auth_source: 'delius',
      },
      headers: { 'x-user-token': token },
    } as unknown as Request
    const res = { locals: {} } as unknown as Response

    await runMiddleware(req, res)

    expect(next).toHaveBeenCalledWith()
    expect(getServicesForUser).toHaveBeenCalledWith([])
    expect(res.locals.user).toEqual(expect.objectContaining({ userRoles: [] }))
  })

  it('fetches location when cache lookup returns null after a redis error', async () => {
    const token = createToken()
    // CacheService swallows redis errors and returns null
    cacheService.getData.mockResolvedValue(null)

    const req = {
      auth: {
        user_name: 'TOKEN_USER',
        auth_source: 'delius',
      },
      headers: { 'x-user-token': token },
    } as unknown as Request
    const res = { locals: {} } as unknown as Response

    await runMiddleware(req, res)

    expect(next).toHaveBeenCalledWith()
    expect(getLocationDetails).toHaveBeenCalledWith(token)
    expect(cacheService.setData).toHaveBeenCalledWith(buildLocationCacheKey(token), locationDetails)
    expect(res.locals.user).toEqual(expect.objectContaining({ location: 'N07AAA' }))
  })
})
