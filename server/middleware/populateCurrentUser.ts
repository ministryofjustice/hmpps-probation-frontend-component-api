import { RequestHandler } from 'express'
import { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import { convertToTitleCase } from '../utils/utils'
import { Role } from '../services/utils/roles'
import { HmppsUser } from '../interfaces/hmppsUser'
import { UserService } from '../services'
import { decodeUserToken, getRequestLogger, setCurrentUser } from '../utils/currentUserContext'
import ProbationLocationClient from '../data/probationLocationClient'

export default function populateCurrentUser(
  userService: UserService,
  authClient: AuthenticationClient,
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

      const { name, user_id: userId, user_uuid: userUuid, authorities: roles = [] } = decodedUser

      const userRoles = roles.map(role => role.substring(role.indexOf('_') + 1) as Role)
      const services = userService.getServicesForUser(userRoles)

      requestLogger.info(`The user token :: ${JSON.stringify(res.locals.user.token)}`)
      requestLogger.debug(`The list of User Roles are :: ${JSON.stringify(roles)}`)
      requestLogger.debug(`The list of SET User Roles are :: ${JSON.stringify(userRoles)}`)
      requestLogger.debug(`User services :: ${JSON.stringify(services)}`)

      res.locals.user = {
        ...res.locals.user,
        userId,
        userUuid,
        name,
        displayName: convertToTitleCase(name),
        userRoles,
        services,
      }

      // here the call and cache to the service
      const locationClient = new ProbationLocationClient(authClient)

      requestLogger.info('Populated current user details')
      next()
    } catch (error) {
      requestLogger.error(error, `Failed to populate user details for: ${res.locals.user && res.locals.user.username}`)
      next(error)
    }
  }
}
