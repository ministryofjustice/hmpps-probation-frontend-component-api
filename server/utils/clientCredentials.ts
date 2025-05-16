import config from '../config'

export default function generateOauthClientToken(
  clientId: string = config.apis.hmppsAuth.authCodeClientId,
  clientSecret: string = config.apis.hmppsAuth.authCodeClientSecret,
): string {
  const token = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  return `Basic ${token}`
}
