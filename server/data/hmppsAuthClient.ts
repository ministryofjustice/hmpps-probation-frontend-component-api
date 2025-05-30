import superagent from 'superagent'
import { URLSearchParams } from 'url'

import type TokenStore from './tokenStore'
import logger from '../../logger'
import config from '../config'
import generateOauthClientToken from '../authentication/clientCredentials'

const timeoutSpec = config.apis.hmppsAuth.timeout
const hmppsAuthUrl = config.apis.hmppsAuth.url

function getSystemClientTokenFromHmppsAuth(username?: string): Promise<superagent.Response> {
  const systemToken = generateOauthClientToken(
    config.apis.hmppsAuth.clientCredentialsClientId,
    config.apis.hmppsAuth.clientCredentialsClientSecret,
  )

  const grantRequest = new URLSearchParams({
    grant_type: 'client_credentials',
    ...(username && { username }),
  }).toString()

  logger.info(`${grantRequest} HMPPS Auth request for client id '${config.apis.hmppsAuth.clientCredentialsClientId}''`)

  return superagent
    .post(`${hmppsAuthUrl}/oauth/token`)
    .set('Authorization', systemToken)
    .set('content-type', 'application/x-www-form-urlencoded')
    .send(grantRequest)
    .timeout(timeoutSpec)
}

export const systemTokenBuilder =
  (tokenStore: TokenStore) =>
  async (username?: string): Promise<string> => {
    const key = username || '%ANONYMOUS%'
    const token = await tokenStore.getToken(key)
    if (token) {
      return token
    }

    const newToken = await getSystemClientTokenFromHmppsAuth(username)
    // set TTL slightly less than expiry of token. Async but no need to wait
    await tokenStore.setToken(key, newToken.body.access_token, newToken.body.expires_in - 60)

    return newToken.body.access_token
  }

export default systemTokenBuilder
