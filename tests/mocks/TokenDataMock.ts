import { TokenData } from '../../server/@types/Users'

// eslint-disable-next-line import/prefer-default-export
export const getTokenDataMock = (overrides: Partial<TokenData> = {}): TokenData => {
  return {
    name: 'Token User',
    auth_source: 'delius',
    authorities: ['ROLE_PROBATION'],
    client_id: 'client-id',
    exp: Math.floor(Date.now() / 1000) + 3600,
    grant_type: 'https://sign-in-dev.hmpps.service.justice.gov.uk/auth/issuer',
    iss: 'https://sign-in-dev.hmpps.service.justice.gov.uk/auth/issuer',
    jti: 'zzz',
    scope: ['read', 'write'],
    sub: 'TOKEN_USER',
    user_id: '11111',
    user_name: 'TOKEN_USER',
    user_uuid: 'TOKEN_USER_111',
    ...overrides,
  }
}
