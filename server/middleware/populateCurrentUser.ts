import { createHash } from 'crypto'
import { RequestHandler } from 'express'
import { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import { convertToTitleCase } from '../utils/utils'
import { Role } from '../services/utils/roles'
import { HmppsUser } from '../interfaces/hmppsUser'
import { UserService } from '../services'
import CacheService from '../services/cacheService'
import { decodeUserToken, getRequestLogger, setCurrentUser } from '../utils/currentUserContext'
import ProbationLocationClient from '../data/probationLocationClient'
import { ProbationOfficerLocation } from '../data/models/probationOfficerLocation'

export function buildLocationCacheKey(userToken: string): string {
  const tokenHash = createHash('sha256').update(userToken).digest('hex')
  return `location:${tokenHash}`
}

export default function populateCurrentUser(
  userService: UserService,
  authClient: AuthenticationClient,
  cacheService: CacheService,
): RequestHandler {
  return async (req, res, next) => {
    const requestLogger = getRequestLogger()

    try {
      // expressjwt middleware puts user object on req.auth
      if (!res.locals.user && req.auth) {
        res.locals.user = {
          token: req.headers['x-user-token'] as string,
          username: req.auth.user_name,
          authSource: req.auth.auth_source,
        } as HmppsUser
      }

      const decodedUser = decodeUserToken(res.locals.user.token)
      setCurrentUser(decodedUser)

      const { name, user_id: userId, user_uuid: userUuid, authorities: roles } = decodedUser

      const userRoles = roles.map(role => role.substring(role.indexOf('_') + 1) as Role)
      const services = userService.getServicesForUser(userRoles)

      const cacheKey = buildLocationCacheKey(res.locals.user.token)
      let location = await cacheService.getData<ProbationOfficerLocation>(cacheKey)

      if (!location) {
        location = await new ProbationLocationClient(authClient).getLocationDetails(res.locals.user.token)
        await cacheService.setData(cacheKey, location)
      }

      requestLogger.info(`The user token :: ${JSON.stringify(res.locals.user.token)}`)
      requestLogger.debug(`The list of User Roles are :: ${JSON.stringify(roles)}`)
      requestLogger.debug(`The list of SET User Roles are :: ${JSON.stringify(userRoles)}`)
      requestLogger.debug(`User services :: ${JSON.stringify(services)}`)

      res.locals.user = {
        ...res.locals.user,
        userId,
        userUuid,
        name,
        location: location.currentTeam,
        displayName: convertToTitleCase(name),
        userRoles,
        services,
      }

      requestLogger.info('Populated current user details')
      next()
    } catch (error) {
      requestLogger.error(error, `Failed to populate user details for: ${res.locals.user && res.locals.user.username}`)
      next(error)
    }
  }
}
