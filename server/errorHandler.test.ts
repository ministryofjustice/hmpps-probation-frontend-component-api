import type { NextFunction, Request, Response } from 'express'
import type { HTTPError } from 'superagent'

import type { HmppsUser } from './interfaces/hmppsUser'

import createErrorHandler from './errorHandler'

jest.mock('../logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
  },
}))

// eslint-disable-next-line import/first
import logger from '../logger'

type HttpErrorLike = {
  status?: number
  message?: string
  stack?: string
}

function asHttpError(err: HttpErrorLike): HTTPError {
  return err as unknown as HTTPError
}

function createRes(): Response {
  return {
    locals: {},
    redirect: jest.fn(),
    status: jest.fn().mockReturnThis(),
    render: jest.fn(),
  } as unknown as Response
}

function createReq(originalUrl = '/test/url'): Request {
  return { originalUrl } as unknown as Request
}

describe('createErrorHandler', () => {
  const next = jest.fn() as unknown as NextFunction

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('logs the error with url and username', () => {
    const handler = createErrorHandler(false)
    const req = createReq('/some/path')
    const res = createRes()
    res.locals.user = { username: 'USER1' } as unknown as HmppsUser
    const err: HttpErrorLike = { status: 500, message: 'Boom', stack: 'stack' }

    handler(asHttpError(err), req, res, next)

    expect(logger.error).toHaveBeenCalledWith("Error handling request for '/some/path', user 'USER1'", err)
  })

  it.each([401, 403])('redirects to sign-out on %s and does not render', status => {
    const handler = createErrorHandler(true)
    const req = createReq()
    const res = createRes()
    const err: HttpErrorLike = { status, message: 'Auth error' }

    handler(asHttpError(err), req, res, next)

    expect(logger.info).toHaveBeenCalledWith('Logging user out')
    expect(res.redirect).toHaveBeenCalledWith('/sign-out')
    expect(res.status).not.toHaveBeenCalled()
    expect(res.render).not.toHaveBeenCalled()
  })

  it('sets a generic message and hides stack in production', () => {
    const handler = createErrorHandler(true)
    const req = createReq()
    const res = createRes()
    const err: HttpErrorLike = { status: 503, message: 'Upstream failed', stack: 'stacktrace' }

    handler(asHttpError(err), req, res, next)

    expect(res.locals.message).toEqual('Something went wrong. The error has been logged. Please try again')
    expect(res.locals.status).toEqual(503)
    expect(res.locals.stack).toBeNull()
    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.render).toHaveBeenCalledWith('pages/error')
  })

  it('uses the error message and includes stack when not in production', () => {
    const handler = createErrorHandler(false)
    const req = createReq()
    const res = createRes()
    const err: HttpErrorLike = { status: 400, message: 'Bad Request', stack: 'trace' }

    handler(asHttpError(err), req, res, next)

    expect(res.locals.message).toEqual('Bad Request')
    expect(res.locals.status).toEqual(400)
    expect(res.locals.stack).toEqual('trace')
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.render).toHaveBeenCalledWith('pages/error')
  })

  it('defaults the HTTP status code to 500 when missing', () => {
    const handler = createErrorHandler(false)
    const req = createReq()
    const res = createRes()
    const err: HttpErrorLike = { message: 'No status present' }

    handler(asHttpError(err), req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.render).toHaveBeenCalledWith('pages/error')
  })

  it('handles an undefined error message without throwing', () => {
    const handler = createErrorHandler(false)
    const req = createReq()
    const res = createRes()
    const err: HttpErrorLike = { status: 500 }

    expect(() => handler(asHttpError(err), req, res, next)).not.toThrow()
    expect(res.locals.message).toBeUndefined()
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.render).toHaveBeenCalledWith('pages/error')
  })
})
