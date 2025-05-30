import { Router } from 'express'
import { Services } from '../services'
import asyncMiddleware from '../middleware/asyncMiddleware'
import authorisationMiddleware from '../middleware/authorisationMiddleware'
import auth from '../authentication/auth'
import tokenVerifier from '../data/tokenVerification'
import componentsController from '../controllers/componentsController'
import populateCurrentUser from '../middleware/populateCurrentUser'

export default function developRoutes(services: Services): Router {
  const router = Router()
  const controller = componentsController()

  router.use(authorisationMiddleware())
  router.use(auth.authenticationMiddleware(tokenVerifier))
  router.use(populateCurrentUser(services.userService))

  router.get(
    '/header',
    asyncMiddleware(async (_req, res, _next) => {
      const viewModel = await controller.getHeaderViewModel(res.locals.user)
      return res.render('pages/componentPreview', viewModel)
    }),
  )

  router.get(
    '/footer',
    asyncMiddleware(async (_req, res, _next) => {
      const viewModel = await controller.getFooterViewModel(res.locals.user)
      return res.render('pages/componentPreview', viewModel)
    }),
  )

  return router
}
