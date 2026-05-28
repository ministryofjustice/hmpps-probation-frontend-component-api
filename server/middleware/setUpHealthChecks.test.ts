import express from 'express'
import request from 'supertest'

import type { ApplicationInfo } from '../applicationInfo'
import setUpHealthChecks from './setUpHealthChecks'

const healthcheck = jest.fn()

jest.mock('../services/healthCheck', () => ({
  __esModule: true,
  default: (...args: unknown[]) => healthcheck(...args),
}))

describe('setUpHealthChecks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const applicationInfo: ApplicationInfo = {
    branchName: 'main',
    applicationName: 'app-name',
    buildNumber: '1.2.3',
    productId: 'product-1',
    gitRef: 'git-ref-full',
    gitShortHash: 'git-ref',
  }

  it('GET /ping returns UP', async () => {
    const app = express()
    app.use(setUpHealthChecks(applicationInfo))

    const res = await request(app).get('/ping')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'UP' })
  })

  it('GET /info returns build and git info', async () => {
    const app = express()
    app.use(setUpHealthChecks(applicationInfo))

    const res = await request(app).get('/info')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      git: { branch: 'main' },
      build: { artifact: 'app-name', version: '1.2.3', name: 'app-name' },
      productId: 'product-1',
    })
  })

  it('GET /health returns 200 when healthcheck is UP', async () => {
    healthcheck.mockImplementation(
      (_info: ApplicationInfo, cb: (result: { status: string; checks?: unknown[] }) => void) => {
        cb({ status: 'UP' })
      },
    )
    const app = express()
    app.use(setUpHealthChecks(applicationInfo))

    const res = await request(app).get('/health')

    expect(healthcheck).toHaveBeenCalled()
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'UP' })
  })

  it('GET /health returns 503 when healthcheck is not UP', async () => {
    healthcheck.mockImplementation(
      (_info: ApplicationInfo, cb: (result: { status: string; checks: unknown[] }) => void) => {
        cb({ status: 'DOWN', checks: [] })
      },
    )
    const app = express()
    app.use(setUpHealthChecks(applicationInfo))

    const res = await request(app).get('/health')

    expect(res.status).toBe(503)
    expect(res.body).toEqual({ status: 'DOWN', checks: [] })
  })
})
