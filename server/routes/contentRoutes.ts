import { Router } from 'express'
import { Services } from '../services'
import asyncMiddleware from '../middleware/asyncMiddleware'
import authorisationMiddleware from '../middleware/authorisationMiddleware'
import { AVAILABLE_COMPONENTS } from '../@types/AvailableComponent'
import auth from '../authentication/auth'
import tokenVerifier from '../data/tokenVerification'
import populateCurrentUser from '../middleware/populateCurrentUser'

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
    'accessibility',
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

  return router
}
