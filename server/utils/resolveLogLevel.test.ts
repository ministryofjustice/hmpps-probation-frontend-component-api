import { BUNYAN_LOG_LEVELS, resolveLogLevel } from './resolveLogLevel'

describe('resolveLogLevel', () => {
  it.each(BUNYAN_LOG_LEVELS)('accepts Bunyan level "%s"', level => {
    expect(resolveLogLevel(level, { production: true })).toBe(level)
  })

  it('accepts levels case-insensitively and trims whitespace', () => {
    expect(resolveLogLevel(' INFO ', { production: true })).toBe('info')
  })

  it('falls back to debug when unset outside production', () => {
    expect(resolveLogLevel(undefined, { production: false })).toBe('debug')
  })

  it('throws when missing in production', () => {
    expect(() => resolveLogLevel(undefined, { production: true })).toThrow(/Missing env var LOG_LEVEL/)
  })

  it('throws when value is not a Bunyan named level', () => {
    expect(() => resolveLogLevel('verbose', { production: false })).toThrow(/Invalid LOG_LEVEL 'verbose'/)
  })
})
