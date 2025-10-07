import { ProbationUser } from '../../server/interfaces/hmppsUser'
import { Service } from '../../server/interfaces/Service'

export const servicesMock: Service[] = [
  // {
  //   id: 'example-service',
  //   heading: 'Example service',
  //   description: 'An example service to use as a template',
  //   href: 'http://localhost:3001',
  //   navEnabled: true,
  // },
]

export const probationUserMock: ProbationUser = {
  authSource: 'delius',
  username: 'PROBATION_USER',
  userId: '11111',
  name: 'Prison User',
  displayName: 'P. User',
  userRoles: [],
  token: 'abc.def.ghi',
  services: servicesMock,
}
