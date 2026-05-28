import type { Request, Response } from 'express'

import populateSystemToken from './populateSystemToken'

const loggerInfo = jest.fn()
const loggerError = jest.fn()

jest.mock('../../logger', () => ({
  __esModule: true,
  default: {
    info: (...args: unknown[]) => loggerInfo(...args),
    error: (...args: unknown[]) => loggerError(...args),
  },
}))

const getSystemToken = jest.fn()

jest.mock('../data', () => ({
  __esModule: true,
  dataAccess: {
    getSystemToken: (...args: unknown[]) => getSystemToken(...args),
  },
}))

describe('populateSystemToken', () => {
  const next = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('adds systemToken onto req.middleware when available', async () => {
    getSystemToken.mockResolvedValue('system-token-1')
    const req = { middleware: { other: 'value' } } as unknown as Request
    const res = { locals: { user: { username: 'USER1' } } } as unknown as Response

    await populateSystemToken()(req, res, next)

    expect(getSystemToken).toHaveBeenCalledWith('USER1')
    expect(req.middleware).toEqual({ other: 'value', systemToken: 'system-token-1' })
    expect(next).toHaveBeenCalledWith()
  })

  it('does nothing when no user is present', async () => {
    const req = {} as Request
    const res = { locals: {} } as unknown as Response

    await populateSystemToken()(req, res, next)

    expect(getSystemToken).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith()
  })

  it('logs info when token is not available', async () => {
    getSystemToken.mockResolvedValue(null)
    const req = {} as Request
    const res = { locals: { user: { username: 'USER1' } } } as unknown as Response

    await populateSystemToken()(req, res, next)

    expect(loggerInfo).toHaveBeenCalledWith('No client token available')
    expect(next).toHaveBeenCalledWith()
  })

  it('logs and passes error to next on failure', async () => {
    const err = new Error('boom')
    getSystemToken.mockRejectedValue(err)
    const req = {} as Request
    const res = { locals: { user: { username: 'USER1' } } } as unknown as Response

    await populateSystemToken()(req, res, next)

    expect(loggerError).toHaveBeenCalledWith(err, 'Failed to retrieve client token for: USER1')
    expect(next).toHaveBeenCalledWith(err)
  })
})
