import { RequestHandler } from 'express'
import { jwtDecode } from 'jwt-decode'
import logger from '../../logger'
import { convertToTitleCase } from '../utils/utils'
import { Role } from '../services/utils/roles'
import { HmppsUser } from '../interfaces/hmppsUser'
import { UserService } from '../services'

export default function populateCurrentUser(userService: UserService): RequestHandler {
  return async (req, res, next) => {
    try {
      // expressjwt middleware puts user object on req.auth
      if (!res.locals.user && req.auth) {
        res.locals.user = {
          token: req.headers['x-user-token'] as string,
          username: req.auth.user_name,
          authSource: req.auth.auth_source,
        } as HmppsUser
      }

      // Should be able to leave this uncommented safely but unaware of the log level in higher environment at the moment
      // logger.debug(`raw token is ${JSON.stringify(res.locals.user.token)}`)

      const {
        name,
        user_id: userId,
        /**
         * This does two things:
         * Renames: It takes the value of authorities and assigns it to a constant named roles.
         * Default Value: If authorities is missing (undefined) in the token, it defaults roles to an empty array ([]) to prevent errors later in the code.
         */
        authorities: roles = [],
      } = jwtDecode(res.locals.user.token) as {
        name?: string
        user_id?: string
        authorities?: string[]
      }

      const userRoles = roles.map(role => role.substring(role.indexOf('_') + 1) as Role)
      logger.debug(`The list of User Roles are :: ${JSON.stringify(roles)}`)
      logger.debug(`The list of SET User Roles are :: ${JSON.stringify(userRoles)}`)
      logger.debug(`Decoded token :: ${JSON.stringify(jwtDecode(res.locals.user.token))}`)
      logger.debug(`User services :: ${JSON.stringify(userService.getServicesForUser(userRoles))}`)

      res.locals.user = {
        ...res.locals.user,
        userId,
        name,
        displayName: convertToTitleCase(name),
        userRoles,
        services: userService.getServicesForUser(userRoles),
      }

      next()
    } catch (error) {
      logger.error(error, `Failed to populate user details for: ${res.locals.user && res.locals.user.username}`)
      next(error)
    }
  }
}
