import { AsyncLocalStorage } from 'async_hooks'
import { jwtDecode } from 'jwt-decode'
import type { RequestHandler } from 'express'
import logger from '../../logger'
import type { AuthSource } from '../interfaces/hmppsUser'
import type { TokenData } from '../@types/Users'

export interface DecodedCurrentUser {
  user_uuid: string
  user_id?: string
  name?: string
  user_name?: string
  auth_source?: AuthSource
  authorities: string[]
}

export interface RequestLogger {
  debug: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (arg1: unknown, arg2?: unknown, ...args: unknown[]) => void
}

const asyncLocalStorage = new AsyncLocalStorage<DecodedCurrentUser>()

const ANONYMOUS_USER_UUID = 'anonymous'

export function decodeUserToken(token: string): DecodedCurrentUser {
  const decoded = jwtDecode<Partial<TokenData>>(token)
  return {
    user_uuid: decoded.user_uuid ?? ANONYMOUS_USER_UUID,
    user_id: decoded.user_id,
    name: decoded.name,
    user_name: decoded.user_name,
    auth_source: decoded.auth_source,
    authorities: decoded.authorities ?? [],
  }
}

export function runWithCurrentUserContext<T>(fn: () => T): T {
  return asyncLocalStorage.run({ user_uuid: ANONYMOUS_USER_UUID, authorities: [] }, fn)
}

export function getCurrentUser(): DecodedCurrentUser | undefined {
  return asyncLocalStorage.getStore()
}

export function setCurrentUser(user: DecodedCurrentUser): void {
  const store = asyncLocalStorage.getStore()
  if (!store) {
    return
  }
  Object.assign(store, user)
}

function getUserUuidField(): { user_uuid: string } {
  return { user_uuid: getCurrentUser()?.user_uuid ?? ANONYMOUS_USER_UUID }
}

export function getRequestLogger(): RequestLogger {
  return {
    debug: (message: string, ...args: unknown[]) => {
      logger.debug(getUserUuidField(), message, ...args)
    },
    info: (message: string, ...args: unknown[]) => {
      logger.info(getUserUuidField(), message, ...args)
    },
    warn: (message: string, ...args: unknown[]) => {
      logger.warn(getUserUuidField(), message, ...args)
    },
    error: (arg1: unknown, arg2?: unknown, ...args: unknown[]) => {
      const fields = getUserUuidField()
      if (typeof arg1 === 'string') {
        if (arg2 === undefined) {
          logger.error(fields, arg1)
        } else {
          logger.error(fields, arg1, arg2, ...args)
        }
        return
      }
      if (arg1 instanceof Error) {
        logger.error({ ...fields, err: arg1 }, typeof arg2 === 'string' ? arg2 : arg1.message, ...args)
        return
      }
      if (arg2 === undefined) {
        logger.error({ ...(arg1 as object), ...fields })
      } else {
        logger.error({ ...(arg1 as object), ...fields }, arg2, ...args)
      }
    },
  }
}

export function establishCurrentUserContext(): RequestHandler {
  return (_req, _res, next) => {
    runWithCurrentUserContext(() => next())
  }
}
