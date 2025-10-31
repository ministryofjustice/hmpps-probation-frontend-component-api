import { Router } from 'express'
import { Services } from '../services'
import asyncMiddleware from '../middleware/asyncMiddleware'
import authorisationMiddleware from '../middleware/authorisationMiddleware'
import { AVAILABLE_COMPONENTS } from '../@types/AvailableComponent'
import auth from '../authentication/auth'
import tokenVerifier from '../data/tokenVerification'
import populateCurrentUser from '../middleware/populateCurrentUser'
import { DEFAULT_USER_ACCESS } from '../services/userService'
import getAccessibilityServicesForUser from '../services/utils/getAccessibilityServicesForUser'

export default function contentRoutes(services: Services): Router {
  const router = Router()

  router.use(authorisationMiddleware())
  router.use(auth.authenticationMiddleware(tokenVerifier))
  router.use(populateCurrentUser(services.userService))

  router.get(
    '/',
    asyncMiddleware(async (_req, res, _next) => {
      res.render(`pages/markdown`, { components: AVAILABLE_COMPONENTS, page: 'index' })
    }),
  )

  Array.of(
    'cookies-policy',
    'privacy-policy',
    'accessibility/allocate-a-person-on-probation',
    'accessibility/consider-a-recall',
    'accessibility/create-and-vary-a-licence',
    'accessibility/prepare-a-case-for-sentence',
    'accessibility/refer-and-monitor-an-intervention',
    'accessibility/transitional-accomodation',
    'accessibility/workload-measurement-tool',
  ).forEach(page =>
    router.get(
      `/${page}`,
      asyncMiddleware(async (_req, res, _next) => {
        res.render(`pages/markdown`, { components: AVAILABLE_COMPONENTS, page, showBacklink: true })
      }),
    ),
  )

  router.get(
    '/accessibility',
    asyncMiddleware(async (_req, res, _next) => {
      res.render(`pages/accessibility`, {
        services:
          res.locals.user.authSource === 'delius'
            ? getAccessibilityServicesForUser(res.locals.user.services)
            : DEFAULT_USER_ACCESS,
      })
    }),
  )

  router.get(
    '/services',
    asyncMiddleware(async (_req, res, _next) => {
      res.render(`pages/services`, {
        meta: res.locals.user.authSource === 'delius' ? { services: res.locals.user.services } : DEFAULT_USER_ACCESS,
      })
    }),
  )

  return router
}
