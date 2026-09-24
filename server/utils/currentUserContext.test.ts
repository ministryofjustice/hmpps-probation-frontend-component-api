import jwt from 'jsonwebtoken'
import {
  decodeUserToken,
  getCurrentUser,
  getRequestLogger,
  runWithCurrentUserContext,
  setCurrentUser,
} from './currentUserContext'

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
      user_name: 'USER1',
      user_uuid: 'uuid-111',
      user_id: '111',
      name: 'Test User',
      auth_source: 'delius',
      authorities: ['ROLE_PROBATION'],
      ...overrides,
    },
    'secret',
    { expiresIn: '1h' },
  )
}

describe('currentUserContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('decodeUserToken', () => {
    it('maps JWT claims onto DecodedCurrentUser', () => {
      const decoded = decodeUserToken(createToken())

      expect(decoded).toEqual(
        expect.objectContaining({
          user_uuid: 'uuid-111',
          user_id: '111',
          name: 'Test User',
          user_name: 'USER1',
          auth_source: 'delius',
          authorities: ['ROLE_PROBATION'],
        }),
      )
    })

    it('defaults user_uuid and authorities when missing', () => {
      const token = jwt.sign({ user_name: 'USER1' }, 'secret')
      const decoded = decodeUserToken(token)

      expect(decoded.user_uuid).toBe('anonymous')
      expect(decoded.authorities).toEqual([])
    })
  })

  describe('AsyncLocalStorage isolation', () => {
    it('keeps concurrent request stores isolated', async () => {
      const results: Array<string | undefined> = []

      await Promise.all([
        new Promise<void>(resolve => {
          runWithCurrentUserContext(async () => {
            setCurrentUser(decodeUserToken(createToken({ user_uuid: 'user-a' })))
            await Promise.resolve()
            results.push(getCurrentUser()?.user_uuid)
            resolve()
          })
        }),
        new Promise<void>(resolve => {
          runWithCurrentUserContext(async () => {
            setCurrentUser(decodeUserToken(createToken({ user_uuid: 'user-b' })))
            await Promise.resolve()
            results.push(getCurrentUser()?.user_uuid)
            resolve()
          })
        }),
      ])

      expect(results).toEqual(expect.arrayContaining(['user-a', 'user-b']))
      expect(results).toHaveLength(2)
    })
  })

  describe('getRequestLogger', () => {
    it('includes user_uuid from the active context', () => {
      runWithCurrentUserContext(() => {
        setCurrentUser(decodeUserToken(createToken({ user_uuid: 'uuid-222' })))
        getRequestLogger().info('hello')
      })

      expect(logger.info).toHaveBeenCalledWith({ user_uuid: 'uuid-222' }, 'hello')
    })

    it('uses anonymous when no user is set', () => {
      runWithCurrentUserContext(() => {
        getRequestLogger().warn('no user yet')
      })

      expect(logger.warn).toHaveBeenCalledWith({ user_uuid: 'anonymous' }, 'no user yet')
    })
  })
})
