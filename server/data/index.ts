/* eslint-disable import/first */
/*
 * Do appinsights first as it does some magic instrumentation work, i.e. it affects other 'require's
 * In particular, applicationinsights automatically collects bunyan logs
 */
import applicationInfoProvider from '../applicationInfo'
import { initialiseAppInsights, buildAppInsightsClient } from '../utils/azureAppInsights'

const applicationInfo = applicationInfoProvider()
initialiseAppInsights()
buildAppInsightsClient(applicationInfo)

import { systemTokenBuilder } from './hmppsAuthClient'
import { createRedisClient } from './redisClient'
import TokenStore from './tokenStore'
import RestClient, { CreateRestClientBuilder } from './restClient'
import { ApiConfig } from '../config'

type RestClientBuilder<T> = (token: string) => T

export default function restClientBuilder<T>(
  name: string,
  options: ApiConfig,
  constructor: new (client: RestClient) => T,
): RestClientBuilder<T> {
  const restClient = CreateRestClientBuilder(name, options)
  return token => new constructor(restClient(token))
}

export const dataAccess = {
  getSystemToken: systemTokenBuilder(new TokenStore(createRedisClient())),
  applicationInfo,
}

export type DataAccess = typeof dataAccess

export type { RestClientBuilder }
