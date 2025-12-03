import { NextFunction, Request, Response, Router } from 'express'
import jwksRsa from 'jwks-rsa'
import { expressjwt, GetVerificationKey } from 'express-jwt'
import jwt from 'jsonwebtoken'
import { Services } from '../services'
import config from '../config'
import asyncMiddleware from '../middleware/asyncMiddleware'
import populateCurrentUser from '../middleware/populateCurrentUser'
import componentsController, {
  ComponentsData,
  FooterViewModel,
  HeaderViewModel,
} from '../controllers/componentsController'
import { AvailableComponent } from '../@types/AvailableComponent'
import Component from '../@types/Component'
import { TokenData } from '../@types/Users'
import logger from '../../logger'

export default function componentRoutes(services: Services): Router {
  const router = Router()
  const controller = componentsController()

  const jwksIssuer = jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    cacheMaxAge: 604800000, // a week
    jwksRequestsPerMinute: 2,
    jwksUri: `${config.apis.hmppsAuth.url}/.well-known/jwks.json`,
  }) as GetVerificationKey

  router.use((req, res, next) => {
    if (process.env.NODE_ENV === 'inttest') {
      req.auth = jwt.decode(req.headers['x-user-token'] as string) as TokenData
      next()
    } else {
      expressjwt({
        secret: jwksIssuer,
        issuer: `${config.apis.hmppsAuth.url}/issuer`,
        algorithms: ['RS256'],
        getToken: reqInternal => reqInternal.headers['x-user-token'] as string,
      })(req, res, next)
    }
  })

  async function getHeaderResponseBody(res: Response, viewModelCached?: HeaderViewModel): Promise<Component> {
    const viewModel = viewModelCached ?? (await controller.getViewModels(['header'], res.locals.user)).header

    return new Promise(resolve => {
      res.render('components/header', viewModel, (_, html) => {
        resolve({
          html,
          css: [`${config.ingressUrl}/assets/css/header.css`],
          javascript: [`${config.ingressUrl}/assets/js/header.js`],
        })
      })
    })
  }

  async function getFooterResponseBody(res: Response, viewModelCached?: FooterViewModel): Promise<Component> {
    const viewModel = viewModelCached ?? (await controller.getViewModels(['footer'], res.locals.user)).footer
    return new Promise(resolve => {
      res.render('components/footer', viewModel, (_, html) => {
        resolve({
          html,
          css: [`${config.ingressUrl}/assets/css/footer.css`],
          javascript: [],
        })
      })
    })
  }

  /**
   * @swagger
   * /components:
   *   get:
   *     summary: Retrieve html, css links and js links for the requested components. Includes user data in the response.
   *     description: Can return any number of existing components (currently 'header' and 'footer'). The user data is also returned in the response within the meta field containing case load information and accessible services.
   *     parameters:
   *       - in: query
   *         name: component
   *         schema:
   *           type: array
   *           items:
   *             type: string
   *         description: The component(s) to retrieve. Available components are 'header' and 'footer'
   *         required: true
   *         explode: true
   *         examples:
   *           header:
   *             value: ['header']
   *             summary: Request the header component
   *           footer:
   *             value: ['footer']
   *             summary: Request the footer component
   *           headerAndFooter:
   *             value: ['header', 'footer']
   *             summary: Request both the header and footer components
   *       - in: header
   *         name: x-user-token
   *         schema:
   *           type: string
   *         required: true
   *         description: The user token to identify the user
   *     responses:
   *       200:
   *         description: Object containing the requested components and user data
   *         content:
   *           application/json:
   *             schema:
   *                $ref: '#/components/schemas/Components'
   */
  router.get(
    '/components',
    populateCurrentUser(services.userService),
    asyncMiddleware(async (req, res, _next) => {
      const componentMethods: Record<
        AvailableComponent,
        (r: Response, cachedViewModel: HeaderViewModel | FooterViewModel) => Promise<Component>
      > = {
        header: getHeaderResponseBody,
        footer: getFooterResponseBody,
      }

      const componentsRequested = [req.query.component]
        .flat()
        .filter(component => componentMethods[component as AvailableComponent]) as AvailableComponent[]

      if (!componentsRequested.length) {
        res.send({})
        return
      }

      const viewModels = await controller.getViewModels(componentsRequested, res.locals.user)

      const renders = await Promise.all(
        componentsRequested.map(component =>
          componentMethods[component as AvailableComponent](res, viewModels[component]),
        ),
      )

      const responseBody = componentsRequested.reduce<
        Partial<Record<AvailableComponent, Component>> & { meta: ComponentsData['meta'] }
      >(
        (output, componentName, index) => {
          return {
            ...output,
            [componentName]: renders[index],
          }
        },
        { meta: viewModels.meta },
      )

      res.send(responseBody)
    }),
  )

  router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err.name === 'UnauthorizedError') {
      res.status(401).send('Unauthorised')
    } else {
      logger.error(err.message)
      res.status(500).send('An unexpected error occurred')
    }
  })

  return router
}

/**
 * @swagger
 * components:
 *   schemas:
 *
 *     Service:
 *       type: object
 *       properties:
 *         id: string
 *         heading: string
 *         navEnabled: boolean
 *         href: string
 *         accessibilityHeading: string
 *         accessibilityUrl: string
 *
 *     Component:
 *       type: object
 *       properties:
 *         html: string
 *         css:
 *           type: array
 *           items:
 *             type: string
 *         javascript:
 *           type: array
 *           items:
 *             type: string
 *
 *     Components:
 *       type: object
 *       properties:
 *         [component name]:
 *           $ref: '#/components/schemas/Component'
 *           description: Component name (header, footer) as the key with the component html and links to JS and CSS for the component
 *           example:
 *             html: <div>...</div>
 *             css: ['https://example.com/styles.css']
 *             javascript: ['https://example.com/scripts.js']
 *         meta:
 *           type: object
 *           description: Data about the services the user has access to
 *           properties:
 *            services:
 *              type: array
 *              items:
 *                $ref: '#/components/schemas/Service'
 *       example:
 *         header:
 *           html: <div>...</div>
 *           css: ['https://example.com/header-styles.css']
 *           javascript: ['https://example.com/header-scripts.js']
 *         footer:
 *           html: <div>...</div>
 *           css: ['https://example.com/footer-styles.css']
 *           javascript: ['https://example.com/footer-scripts.js']
 *         meta: {
 *           services: [
 *             {
 *               id: 'example-service',
 *               heading: 'Example Service',
 *               navEnabled: true,
 *               href: https://service.example.com,
 *               accessibilityHeading: 'Example service statement',
 *               accessibilityUrl: 'https://example.com/example-statement',
 *             }
 *           ]
 *         }
 */
