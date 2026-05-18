import UserService, { API_COOL_OFF_MINUTES, API_ERROR_LIMIT, DEFAULT_USER_ACCESS } from './userService'

import type CacheService from './cacheService'

const loggerError = jest.fn()
const loggerInfo = jest.fn()

jest.mock('../../logger', () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => loggerError(...args),
    info: (...args: unknown[]) => loggerInfo(...args),
  },
}))

const getServicesForUser = jest.fn()
jest.mock('./utils/getServicesForUser', () => ({
  __esModule: true,
  default: (...args: unknown[]) => getServicesForUser(...args),
}))

type UserServicePrivate = {
  handleError: (error: Error) => void
  errorCount: number
}

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('exposes DEFAULT_USER_ACCESS constant', () => {
    expect(DEFAULT_USER_ACCESS).toEqual({ services: [] })
  })

  it('delegates getServicesForUser to util', () => {
    getServicesForUser.mockReturnValue([{ id: 'svc' }])
    const cache = {} as CacheService
    const service = new UserService(cache)

    const result = service.getServicesForUser(['ROLE_A'])

    expect(getServicesForUser).toHaveBeenCalledWith(['ROLE_A'])
    expect(result).toEqual([{ id: 'svc' }])
  })

  it('handleError increments count, and at threshold suspends then reactivates after cool-off', () => {
    jest.useFakeTimers()
    const cache = {} as CacheService
    const service = new UserService(cache) as unknown as UserServicePrivate

    for (let i = 0; i < API_ERROR_LIMIT - 1; i += 1) {
      service.handleError(new Error('boom'))
    }

    expect(loggerError).toHaveBeenCalled()
    expect(loggerInfo).toHaveBeenCalledWith('API calls suspended')

    jest.advanceTimersByTime(API_COOL_OFF_MINUTES * 60000)

    expect(loggerInfo).toHaveBeenCalledWith('API calls active')
    expect(service.errorCount).toBe(0)
    jest.useRealTimers()
  })
})
