const loggerInfo = jest.fn()
const loggerError = jest.fn()

jest.mock('../../logger', () => ({
  __esModule: true,
  default: {
    info: (...args: unknown[]) => loggerInfo(...args),
    error: (...args: unknown[]) => loggerError(...args),
  },
}))

const createClient = jest.fn()

jest.mock('redis', () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}))

function mockConfig(tlsEnabled: 'true' | 'false') {
  jest.doMock('../config', () => ({
    __esModule: true,
    default: {
      redis: {
        host: 'redis-host',
        port: '6379',
        password: 'secret',
        tls_enabled: tlsEnabled,
      },
    },
  }))
}

describe('redisClient', () => {
  const on = jest.fn()
  const unref = jest.fn()

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env.NODE_ENV = 'test'
    createClient.mockReturnValue({ on, unref })
  })

  it('creates a redis:// client when TLS is disabled', () => {
    mockConfig('false')
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
      const { createRedisClient } = require('./redisClient')
      createRedisClient()
    })

    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'redis://redis-host:6379',
        password: 'secret',
        socket: expect.objectContaining({ reconnectStrategy: expect.any(Function) }),
      }),
    )
  })

  it('creates a rediss:// client when TLS is enabled', () => {
    mockConfig('true')
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
      const { createRedisClient } = require('./redisClient')
      createRedisClient()
    })

    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'rediss://redis-host:6379',
        password: 'secret',
      }),
    )
  })

  it('calls unref() when NODE_ENV is test', () => {
    mockConfig('false')
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
      const { createRedisClient } = require('./redisClient')
      createRedisClient()
    })

    expect(unref).toHaveBeenCalled()
  })

  it('does not call unref() when NODE_ENV is not test', () => {
    process.env.NODE_ENV = 'production'
    mockConfig('false')
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
      const { createRedisClient } = require('./redisClient')
      createRedisClient()
    })

    expect(unref).not.toHaveBeenCalled()
  })

  it('logs and returns exponential backoff delay (capped to 30s)', () => {
    mockConfig('false')
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
      const { createRedisClient } = require('./redisClient')
      createRedisClient()
    })

    const options = createClient.mock.calls[0][0]
    const reconnectStrategy = options.socket.reconnectStrategy as (attempts: number) => number

    expect(reconnectStrategy(0)).toBe(20)
    expect(reconnectStrategy(1)).toBe(40)
    expect(reconnectStrategy(2)).toBe(80)
    expect(reconnectStrategy(20)).toBe(30000)
    expect(loggerInfo).toHaveBeenCalled()
  })

  it('registers an error handler that logs', () => {
    mockConfig('false')
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
      const { createRedisClient } = require('./redisClient')
      createRedisClient()
    })

    const [, handler] = on.mock.calls.find(c => c[0] === 'error')!
    handler(new Error('boom'))

    expect(loggerError).toHaveBeenCalledWith('Redis client error', expect.any(Error))
  })
})
