import path from 'path'
import compression from 'compression'
import express, { Router, Response } from 'express'
import noCache from 'nocache'

import config from '../config'

export default function setUpStaticResources(): Router {
  const router = express.Router()

  router.use(compression())

  //  Static Resources Configuration
  const staticResourcesConfig = {
    maxAge: config.staticResourceCacheDuration,
    setHeaders: (res: Response) => res.setHeader('Access-Control-Allow-Origin', '*'),
  }

  Array.of(
    '/dist/assets',
    '/dist/assets/css',
    '/dist/assets/images',
    '/dist/assets/js',
    '/node_modules/govuk-frontend/dist/govuk/assets',
    '/node_modules/govuk-frontend/dist',
    '/node_modules/@ministryofjustice/frontend/moj/assets',
    '/node_modules/@ministryofjustice/frontend',
  ).forEach(dir => {
    router.use('/assets', express.static(path.join(process.cwd(), dir), staticResourcesConfig))
  })

  Array.of('/node_modules/govuk_frontend_toolkit/images').forEach(dir => {
    router.use('/assets/images/icons', express.static(path.join(process.cwd(), dir), staticResourcesConfig))
  })

  // Don't cache dynamic resources
  router.use(noCache())

  return router
}
