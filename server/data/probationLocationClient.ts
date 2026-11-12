import { asSystem, RestClient } from '@ministryofjustice/hmpps-rest-client'
import { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import { ProbationOfficerLocation } from './models/probationOfficerLocation'
import config from '../config'
import logger from '../../logger'

export default class ProbationLocationClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Probation Location API', config.apis.probationOfficerLocation, logger, authenticationClient)
  }

  async getCalculationDetails(token: string): Promise<ProbationOfficerLocation> {
    return this.get({ path: `/probation-officer-location`, headers: { token } }, asSystem())
  }
}
