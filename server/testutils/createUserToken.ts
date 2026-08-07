import jwt from 'jsonwebtoken'

export default function createUserToken(authorities: string[]) {
  const payload = {
    user_name: 'user1',
    scope: ['read', 'write'],
    auth_source: 'delius',
    authorities,
    user_uuid: 'user1-uuid',
    user_id: 'user1-id',
    jti: 'a610a10-cca6-41db-985f-e87efb303aaf',
    client_id: 'clientid',
  }

  return jwt.sign(payload, 'secret', { expiresIn: '1h' })
}
