import bunyan from 'bunyan'

export const BUNYAN_LOG_LEVELS = Object.keys(bunyan.levelFromName) as Array<keyof typeof bunyan.levelFromName>

export type BunyanLogLevel = (typeof BUNYAN_LOG_LEVELS)[number]

/**
 * Resolves and validates LOG_LEVEL for Bunyan.
 * Throws if the value is not a Bunyan named level, or if missing when required (production).
 */
export function resolveLogLevel(
  logLevel: string | undefined,
  options: { production: boolean; fallback?: BunyanLogLevel } = { production: false, fallback: 'debug' },
): BunyanLogLevel {
  const { production, fallback = 'debug' } = options
  const value = logLevel?.trim().toLowerCase()

  if (!value) {
    if (production) {
      throw new Error(`Missing env var LOG_LEVEL. Must be one of: ${BUNYAN_LOG_LEVELS.join(', ')}`)
    }
    return fallback
  }

  if (!BUNYAN_LOG_LEVELS.includes(value as BunyanLogLevel)) {
    throw new Error(`Invalid LOG_LEVEL '${logLevel}'. Must be one of: ${BUNYAN_LOG_LEVELS.join(', ')}`)
  }

  return value as BunyanLogLevel
}
