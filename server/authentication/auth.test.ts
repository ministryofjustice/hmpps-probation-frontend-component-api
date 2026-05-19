import type { Request, Response } from 'express'
import type { Session } from 'express-session'

type OAuth2StrategyMock = {
  options: unknown
  verify: (
    accessToken: string,
    refreshToken: string,
    profile: unknown,
    params: unknown,
    done: (err: unknown, user?: unknown) => void,
  ) => void
}

jest.mock('passport', () => ({
  __esModule: true,
  default: {
    use: jest.fn(),
    serializeUser: jest.fn(),
    deserializeUser: jest.fn(),
  },
}))

jest.mock('passport-oauth2', () => ({
  Strategy: jest.fn().mockImplementation(function MockOAuth2Strategy(
    this: OAuth2StrategyMock,
    options: unknown,
    verify: unknown,
  ) {
    this.options = options
    this.verify = verify as OAuth2StrategyMock['verify']
  }),
}))

jest.mock('../config', () => ({
  __esModule: true,
  default: {
    domain: 'https://example.test',
    apis: {
      hmppsAuth: {
        externalUrl: 'https://auth.external.test',
        url: 'https://auth.internal.test',
        authCodeClientId: 'client-id',
        authCodeClientSecret: 'client-secret',
      },
    },
  },
}))

jest.mock('./clientCredentials', () => ({
  __esModule: true,
  default: jest.fn(),
}))

// eslint-disable-next-line import/first
import passport from 'passport'
// eslint-disable-next-line import/first
import generateOauthClientToken from './clientCredentials'
// eslint-disable-next-line import/first
import auth from './auth'

const passportUse = passport.use as jest.Mock
const generateOauthClientTokenMock = generateOauthClientToken as jest.Mock

describe('authentication/auth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    generateOauthClientTokenMock.mockReturnValue('Basic mocked-token')
    const { Strategy } = jest.requireMock('passport-oauth2') as { Strategy: jest.Mock }
    Strategy.mockImplementation(function MockOAuth2Strategy(
      this: OAuth2StrategyMock,
      options: unknown,
      verify: unknown,
    ) {
      this.options = options
      this.verify = verify as OAuth2StrategyMock['verify']
    })
  })

  describe('authenticationMiddleware', () => {
    const next = jest.fn()

    function createReq({
      isAuthenticated,
      originalUrl = '/return/here',
    }: {
      isAuthenticated: boolean
      originalUrl?: string
    }): Request {
      return {
        isAuthenticated: () => isAuthenticated,
        originalUrl,
        session: {} as Session,
      } as unknown as Request
    }

    function createRes(): Response {
      return {
        redirect: jest.fn(),
      } as unknown as Response
    }

    it('calls next when authenticated and token verifies', async () => {
      const verifyToken = jest.fn().mockResolvedValue(true)
      const req = createReq({ isAuthenticated: true })
      const res = createRes()

      await auth.authenticationMiddleware(verifyToken)(req, res, next)

      expect(verifyToken).toHaveBeenCalledWith(req)
      expect(next).toHaveBeenCalled()
      expect(res.redirect).not.toHaveBeenCalled()
      expect(req.session?.returnTo).toBeUndefined()
    })

    it('redirects to /sign-in and sets returnTo when not authenticated (short-circuits verification)', async () => {
      const verifyToken = jest.fn().mockResolvedValue(true)
      const req = createReq({ isAuthenticated: false, originalUrl: '/the/page' })
      const res = createRes()

      await auth.authenticationMiddleware(verifyToken)(req, res, next)

      expect(verifyToken).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
      expect(req.session?.returnTo).toEqual('/the/page')
      expect(res.redirect).toHaveBeenCalledWith('/sign-in')
    })

    it('redirects to /sign-in and sets returnTo when token fails verification', async () => {
      const verifyToken = jest.fn().mockResolvedValue(false)
      const req = createReq({ isAuthenticated: true, originalUrl: '/somewhere' })
      const res = createRes()

      await auth.authenticationMiddleware(verifyToken)(req, res, next)

      expect(verifyToken).toHaveBeenCalledWith(req)
      expect(next).not.toHaveBeenCalled()
      expect(req.session?.returnTo).toEqual('/somewhere')
      expect(res.redirect).toHaveBeenCalledWith('/sign-in')
    })
  })

  describe('init', () => {
    it('registers the oauth2 strategy with correct config and headers', () => {
      auth.init()

      const { Strategy } = jest.requireMock('passport-oauth2') as { Strategy: jest.Mock }
      expect(Strategy).toHaveBeenCalledTimes(1)
      const [options] = Strategy.mock.calls[0]

      expect(options).toEqual({
        authorizationURL: 'https://auth.external.test/oauth/authorize',
        tokenURL: 'https://auth.internal.test/oauth/token',
        clientID: 'client-id',
        clientSecret: 'client-secret',
        callbackURL: 'https://example.test/sign-in/callback',
        state: true,
        customHeaders: { Authorization: 'Basic mocked-token' },
      })

      expect(passportUse).toHaveBeenCalledTimes(1)
      expect(passportUse).toHaveBeenCalledWith(
        expect.objectContaining({ options: expect.anything(), verify: expect.any(Function) }),
      )
    })

    it('maps oauth callback params to user object', () => {
      auth.init()
      const strategy = passportUse.mock.calls[0][0] as OAuth2StrategyMock
      const done = jest.fn()

      strategy.verify('access-token', 'refresh-token', { user_name: 'USER1', auth_source: 'delius' }, {}, done)

      expect(done).toHaveBeenCalledWith(null, { token: 'access-token', username: 'USER1', authSource: 'delius' })
    })
  })
})
