import type { HmppsUser } from '../interfaces/hmppsUser'
import componentsController from './componentsController'
import { runWithCurrentUserContext, setCurrentUser } from '../utils/currentUserContext'
import { Role } from '../services/utils/roles'

jest.mock('../../logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('../config', () => ({
  __esModule: true,
  default: {
    ingressUrl: 'http://localhost:3000',
    apis: {
      hmppsAuth: {
        url: 'http://auth.local',
      },
    },
    serviceUrls: {
      managePeopleOnProbation: {
        url: 'http://mpop.local',
      },
    },
  },
}))

// eslint-disable-next-line import/first
import logger from '../../logger'

const user: HmppsUser = {
  name: 'FIRST LAST',
  userId: 'id',
  userUuid: 'uuid-controller-1',
  token: 'token',
  username: 'user1',
  displayName: 'First Last',
  authSource: 'delius',
  userRoles: [Role.ManageSupervisions],
  services: [{ id: 'svc', heading: 'Service', navEnabled: true, href: '/' }],
}

describe('componentsController', () => {
  const controller = componentsController()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('logs debug when building header view model with user_uuid', async () => {
    await runWithCurrentUserContext(async () => {
      setCurrentUser({
        user_uuid: 'uuid-controller-1',
        authorities: [],
      })
      await controller.getHeaderViewModel(user)
    })

    expect(logger.debug).toHaveBeenCalledWith({ user_uuid: 'uuid-controller-1' }, 'Building header view model')
  })

  it('logs debug when building footer view model with user_uuid', async () => {
    await runWithCurrentUserContext(async () => {
      setCurrentUser({
        user_uuid: 'uuid-controller-1',
        authorities: [],
      })
      await controller.getFooterViewModel(user)
    })

    expect(logger.debug).toHaveBeenCalledWith({ user_uuid: 'uuid-controller-1' }, 'Building footer view model')
  })
})
