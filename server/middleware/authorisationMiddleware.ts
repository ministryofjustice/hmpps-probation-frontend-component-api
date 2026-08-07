import type { RequestHandler } from 'express'

import asyncMiddleware from './asyncMiddleware'
import { decodeUserToken, getRequestLogger, setCurrentUser } from '../utils/currentUserContext'

export default function authorisationMiddleware(authorisedRoles: string[] = []): RequestHandler {
  return asyncMiddleware((req, res, next) => {
    const requestLogger = getRequestLogger()

    if (res.locals?.user?.token) {
      const decodedUser = decodeUserToken(res.locals.user.token)
      setCurrentUser(decodedUser)
      const roles = decodedUser.authorities

      if (authorisedRoles.length && !roles.some(role => authorisedRoles.includes(role))) {
        requestLogger.error('User is not authorised to access this')
        return res.redirect('/authError')
      }

      requestLogger.debug('User authorised to access route')
      return next()
    }

    requestLogger.warn('No user token present, redirecting to sign-in')
    req.session.returnTo = req.originalUrl
    return res.redirect('/sign-in')
  })
}
