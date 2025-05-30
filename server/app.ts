import express from 'express'

import createError from 'http-errors'

import nunjucksSetup from './utils/nunjucksSetup'
import errorHandler from './errorHandler'

import setUpCsrf from './middleware/setUpCsrf'
import setUpHealthChecks from './middleware/setUpHealthChecks'
import setUpStaticResources from './middleware/setUpStaticResources'
import setUpWebRequestParsing from './middleware/setupRequestParsing'
import setUpWebSecurity from './middleware/setUpWebSecurity'

import developRoutes from './routes/developRoutes'
import componentRoutes from './routes/componentRoutes'
import type { Services } from './services'
import setUpWebSession from './middleware/setUpWebSession'
import setUpAuthentication from './middleware/setUpAuthentication'
import setUpEnvironmentName from './middleware/setUpEnvironmentName'
import setUpSwagger from './middleware/setUpSwagger'
import applicationInfo from './applicationInfo'
import { appInsightsMiddleware } from './utils/azureAppInsights'
import contentRoutes from './routes/contentRoutes'
import config from './config'

export default function createApp(services: Services): express.Application {
  const app = express()

  app.set('json spaces', 2)
  app.set('trust proxy', true)
  app.set('port', process.env.PORT || 3000)

  app.use(appInsightsMiddleware())
  app.use(setUpHealthChecks(applicationInfo()))
  app.use(setUpWebSecurity())
  app.use(setUpWebSession())
  app.use(setUpWebRequestParsing())
  app.use(setUpStaticResources())
  setUpEnvironmentName(app)
  nunjucksSetup(app)
  app.use(setUpAuthentication())
  app.use(setUpCsrf())
  setUpSwagger(app)

  app.use((_req, res, next) => {
    res.locals.baseUrl = config.domain

    next()
  })
  app.use('/api', componentRoutes(services))
  app.use('/', developRoutes(services))
  app.use('/', contentRoutes(services))

  app.use((_req, _res, next) => next(createError(404, 'Not found')))
  app.use(errorHandler(process.env.NODE_ENV === 'production'))

  return app
}
