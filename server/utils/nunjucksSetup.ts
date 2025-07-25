/* eslint-disable no-param-reassign */
import nunjucks from 'nunjucks'
import express from 'express'
import * as pathModule from 'path'
import config from '../config'
import { initialiseName } from './utils'
import renderMarkdown from './markdown'

const production = process.env.NODE_ENV === 'production'

export default function nunjucksSetup(app: express.Express): void {
  app.set('view engine', 'njk')

  app.locals.asset_path = '/assets/'
  app.locals.applicationName = 'HMPPS Probation Frontend Component API'
  app.locals.config = config

  // Cachebusting version string
  if (production) {
    // Version only changes with new commits
    app.locals.version = Date.now().toString()
  } else {
    // Version changes every request
    app.use((req, res, next) => {
      res.locals.version = Date.now().toString()
      return next()
    })
  }

  const njkEnv = nunjucks.configure(
    [
      pathModule.join(__dirname, '../../server/views'),
      pathModule.join(__dirname, '../../_fallbacks'),
      'node_modules/govuk-frontend/dist/',
      'node_modules/govuk-frontend/dist/components/',
      'node_modules/@ministryofjustice/frontend/',
      'node_modules/@ministryofjustice/frontend/moj/components/',
    ],
    {
      autoescape: true,
      express: app,
    },
  )

  njkEnv.addFilter('initialiseName', initialiseName)

  njkEnv.addGlobal('renderMarkdown', renderMarkdown)
}
