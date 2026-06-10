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

  function getClassesFromQueryParam(classes: unknown): string | undefined {
    if (!classes) return undefined
    if (Array.isArray(classes)) return classes.filter(Boolean).join(' ').trim() || undefined
    if (typeof classes === 'string') return classes.trim() || undefined
    return undefined
  }

  router.use(authorisationMiddleware())
  router.use(auth.authenticationMiddleware(tokenVerifier))
  router.use(populateCurrentUser(services.userService))

  const routes = [
    { path: '/header', getViewModel: controller.getHeaderViewModel },
    { path: '/footer', getViewModel: controller.getFooterViewModel },
    { path: '/fallback/footer', getViewModel: controller.getFallbackFooterViewModel },
    { path: '/fallback/header', getViewModel: controller.getFallbackHeaderViewModel },
  ]

  routes.forEach(({ path, getViewModel }) => {
    router.get(
      path,
      asyncMiddleware(async (_req, res, _next) => {
        const viewModel = await getViewModel(res.locals.user)
        const classes = getClassesFromQueryParam(_req.query.classes)
        const viewModelWithClasses = classes ? { ...viewModel, classes } : viewModel
        return res.render('pages/componentPreview', viewModelWithClasses)
      }),
    )
  })

  return router
}
