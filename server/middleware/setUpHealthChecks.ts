import { Router } from 'express'

import healthcheck from '../services/healthCheck'
import type { ApplicationInfo } from '../applicationInfo'

export default function setUpHealthChecks(applicationInfo: ApplicationInfo): Router {
  const router = Router()

  router.get('/health', (_req, res, _next) => {
    healthcheck(applicationInfo, result => {
      if (result.status !== 'UP') {
        res.status(503)
      }
      res.json(result)
    })
  })

  router.get('/ping', (_req, res) => {
    res.json({
      status: 'UP',
    })
  })

  router.get('/info', (_req, res) => {
    res.json({
      git: {
        branch: applicationInfo.branchName,
      },
      build: {
        artifact: applicationInfo.applicationName,
        version: applicationInfo.buildNumber,
        name: applicationInfo.applicationName,
      },
      productId: applicationInfo.productId,
    })
  })

  return router
}
