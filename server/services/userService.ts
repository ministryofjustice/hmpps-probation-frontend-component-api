import logger from '../../logger'
import getServicesForUser from './utils/getServicesForUser'
import CacheService from './cacheService'
import { BaseUser, UserAccess } from '../interfaces/hmppsUser'
import { Service } from '../interfaces/Service'

export const API_COOL_OFF_MINUTES = 5
export const API_ERROR_LIMIT = 100
export const DEFAULT_USER_ACCESS: UserAccess = {
  services: [],
}

export default class UserService {
  private errorCount = 0

  constructor(private readonly cacheService: CacheService) {}

  getServicesForUser(userRoles: string[]): Service[] {
    return getServicesForUser(userRoles)
  }

  private getCache(user: BaseUser): Promise<UserAccess> {
    return this.cacheService.getData<UserAccess>(`${user.username}_meta_data`)
  }

  private setCache(user: BaseUser, access: UserAccess): Promise<string> {
    return this.cacheService.setData(`${user.username}_meta_data`, access)
  }

  private handleError(error: Error) {
    logger.error(error)

    this.errorCount += 1

    if (this.errorCount >= API_ERROR_LIMIT - 1) {
      logger.info('API calls suspended')

      setTimeout(() => {
        logger.info('API calls active')
        this.errorCount = 0
      }, API_COOL_OFF_MINUTES * 60000)
    }
  }
}
