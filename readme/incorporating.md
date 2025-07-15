# Incorporating components

This guide assumes that you are importing into an Express application written in JavaScript or TypeScript based on the [hmpps-template-typescript](https://github.com/ministryofjustice/hmpps-template-typescript) project.

Code samples have been provided for examples. Your requirements may differ.

An example PR containing all the steps below, including the fallbacks, can be found in: [PR#566](https://github.com/ministryofjustice/hmpps-template-typescript/pull/566)

## Swagger docs

API swagger docs can be found at

dev - https://probation-frontend-components-dev.hmpps.service.justice.gov.uk/swagger

preprod - https://probation-frontend-components-preprod.hmpps.service.justice.gov.uk/swagger

prod - https://probation-frontend-components.hmpps.service.justice.gov.uk/swagger

## Running the component library API locally

You can rely on the dev instance of the API if logging in with a dev account locally. Otherwise, you can run the component library locally along with your application by making the changes present in the following pull request: [PR#18](https://github.com/ministryofjustice/hmpps-probation-frontend-component-api/pull/18)

When running the probation component API locally, if also using the probation component API’s auth docker container, you can login with the following details:

```
userame: bernard.beaks
password: secret
```

### Calling the component library API

Add environment variables to the `helm_deploy/values-{env}.yaml` files for `COMPONENT_API_URL`. Populate with the following values:

dev - https://probation-frontend-components-dev.hmpps.service.justice.gov.uk

preprod - https://probation-frontend-components-preprod.hmpps.service.justice.gov.uk

prod - https://probation-frontend-components.hmpps.service.justice.gov.uk

You can also add this to your `.env` or `docker-compose` files with the dev url, or local url (when running the probation API locally) as follows (where `hmpps-probation-frontend-component` is the name of the docker container for the probation API):

```
- COMPONENT_API_URL=http://hmpps-probation-frontend-component:3000
```

Add a block for the component library in the `apis` section of `server/config.ts`, for example:

```
frontendComponents: {
  url: get('COMPONENT_API_URL', 'http://hmpps-probation-frontend-component:3000', requiredInProduction),
  testUrl: 'https://probation-frontend-components-dev.hmpps.service.justice.gov.uk',
  healthPath: 'ping',
  timeout: {
    response: Number(get('HMPPS_AUTH_TIMEOUT_RESPONSE', 10000)),
    deadline: Number(get('HMPPS_AUTH_TIMEOUT_DEADLINE', 10000)),
  },
  agent: new AgentConfig(),
},
```

(If you want to point to a local instance of the Probation API, you will need to point to the Docker container in which it is running)

Add the Component model, API client, Service and middleware listed below. The API call requires the user token to be passed in on the x-user-token header.

Components can be requested individually via `e.g. {api}/components?component=header` or multiple can be requested at once using `e.g. {api}/components?component=header&component=footer`

#### Model:

```
interface Component {
  html: string
  css: string[]
  javascript: string[]
}
```

#### Service:

```
import { RestClient, asSystem } from '@ministryofjustice/hmpps-rest-client'
import type { AuthenticationClient } from '@ministryofjustice/hmpps-auth-clients'
import config from '../config'
import logger from '../../logger'

export type AvailableComponent = 'header' | 'footer'

export default class ProbationComponentsClient extends RestClient {
  constructor(authenticationClient: AuthenticationClient) {
    super('Probation API', config.apis.frontendComponents, logger)
  }

  getComponents<T extends AvailableComponent[]>(components: T, userToken: string): Promise<Record<T[number], Component>> {
    return this.get<string>({
            path: `/api/components`,
            query: `component=${components.join('&component=')}`,
            headers: { 'x-user-token': userToken }
        })
  }
}
```


The components api will return stringified html along with links to any css and javascript files required for the component.

#### Service:

```
import ProbationClient, { AvailableComponent } from "../data/probationClient"

export default class ComponentService {
    constructor(private readonly probationClient: ProbationClient) {}

    async getComponents<T extends AvailableComponent[]>(components: T, userToken: string): Promise<Record<T[number], Component>> {
        return this.probationClient.getComponents(components, userToken) as Promise<Record<T[number], Component>>
    }
}
```

Register your new client in `server/data/index.ts` and new service in your `server/services/index.ts` file. Note the code examples below may vary depending on your specific implementation.

`server/data/index.ts:`

```
export const dataAccess = () => {
  ...

  return {
    ...
    probationClient: new ProbationClient()
  }
}
```

`server/services/index.ts:`

```
import { dataAccess } from '../data'
...
import ComponentService from './componentService'

export const services = () => {
  const { ..., probationClient } = dataAccess()

  return {
    ...,
    componentService: new ComponentService(probationClient)
  }
}

export type Services = ReturnType<typeof services>
```

As the header and footer will likely be used on all pages, it is recommended to add a middleware function to call the endpoint and make available to the view using `res.locals`.

#### Middleware:

```
import { RequestHandler } from "express"
import logger from "../../logger"
import { Services } from "../services"
import { Component } from "../@types/component"
import config from "../config"

export default function getFrontendComponents({ componentService }: Services): RequestHandler {
  return async (req, res, next) => {
    try {
      const { header, footer } = await componentService.getComponents(['header', 'footer'], res.locals.user.token) as any
      
      res.locals.feComponents = getFormattedFeComponents(header, footer)
      next()
    } catch (error) {
      logger.error(error, 'Failed to retrieve front end components')
      next()
    }
  }
}

function getFormattedFeComponents(header: Component, footer: Component) {
  const isLocal = header.css[0].indexOf("localhost") != -1;
  return {
        header: isLocal ? replaceLocalhostUrls(header.html): header.html,
        footer: isLocal ? replaceLocalhostUrls(footer.html): footer.html,
        cssIncludes: [...header.css, ...footer.css].map(replaceLocalhostUrls),
        jsIncludes: [...header.javascript, ...footer.javascript].map(replaceLocalhostUrls),
      }
}

function replaceLocalhostUrls(content: string) {
  return content.replace(/http:\/\/localhost:\d+/g, config.apis.frontendComponents.testUrl);
}
```

Then enable this middleware for all GET routes in your `app.ts` config, just before `app.use(routes(services))` using:

```
app.use(getFrontendComponents(services))
```
(If required, you could instead only call the middleware for specific routes)

The following code should be used in the `layout.njk` file within your application.

Note: the `header.njk` and `footer.njk` templates used in the following code fragments are fallback HTML in case the component service is unavailable or the API call fails for some reason. These templates should be copied from the `_fallbacks` directory in this repo, and configuration added as described in the Fallbacks section at the end of this document.

```
{% block header %}
  {% if feComponents.header %}
    {{ feComponents.header | safe }}
  {% else %}
    {% include "./header.njk" %}
  {% endif %}
{% endblock %}
```
```
{% block footer %}
  {% if feComponents.footer %}
    {{ feComponents.footer | safe }}
  {% else %}
    {% include "./footer.njk" %}
  {% endif %}
{% endblock %}
```
The js and css values should be incorporated into the head block of the layout:
```
{% if feComponents.jsIncludes %}
    {% for js in feComponents.jsIncludes %}
      <script src="{{ js }}" nonce="{{ cspNonce }}"></script>
    {% endfor %}
{% endif %}
```
```
{% if feComponents.cssIncludes %}
  {% for css in feComponents.cssIncludes %}
    <link href="{{ css }}" nonce="{{ cspNonce }}" rel="stylesheet" />
  {% endfor %}
{% endif %}
```
Web security (see: `server/middleware/setUpWebSecurity.ts`) needs to be updated to allow access to the syles and scripts from the components application.

```
import crypto from 'crypto'
import express, { Router, Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import config from '../config'

export default function setUpWebSecurity(): Router {
  const router = express.Router()

  // Secure code best practice - see:
  // 1. https://expressjs.com/en/advanced/best-practice-security.html,
  // 2. https://www.npmjs.com/package/helmet
  router.use((_req: Request, res: Response, next: NextFunction) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString('hex')
    next()
  })

  // This nonce allows us to use scripts with the use of the `cspNonce` local, e.g (in a Nunjucks template):
  // <script nonce="{{ cspNonce }}">
  // or
  // <link href="http://example.com/" rel="stylesheet" nonce="{{ cspNonce }}">
  // This ensures only scripts we trust are loaded, and not anything injected into the
  // page by an attacker.
  const scriptSrc = ["'self'", (_req: Request, res: Response) => `'nonce-${res.locals.cspNonce}'`]
  const styleSrc = ["'self'", (_req: Request, res: Response) => `'nonce-${res.locals.cspNonce}'`]
  const imgSrc = ["'self'", 'data:']
  const fontSrc = ["'self'"]
  const formAction = [`'self' ${config.apis.hmppsAuth.externalUrl}`]

  if (config.apis.frontendComponents.url) {
    scriptSrc.push(config.apis.frontendComponents.url)
    styleSrc.push(config.apis.frontendComponents.url)
    imgSrc.push(config.apis.frontendComponents.url)
    fontSrc.push(config.apis.frontendComponents.url)
  }

  router.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc,
          styleSrc,
          fontSrc,
          imgSrc,
          formAction,
          ...(config.production ? {} : { upgradeInsecureRequests: null })
        },
      },
      crossOriginEmbedderPolicy: true,
    }),
  )
  return router
}
```

### Header sign out link

The header sign out link direct to `'{your-application}/sign-out'`. This works on the assumption that the application has followed the redirect pattern that the hmpps-template-typescript project has. See [setUpAuthentication.ts#L34](https://github.com/ministryofjustice/hmpps-template-typescript/blob/main/server/middleware/setUpAuthentication.ts#L34).

Note: If your application was copied from the typescript template before August 2021 then it is entirely likely that your sign out link will be `'/logout'` instead. In which case it will have to be changed to `'/sign-out'`. See restricted patients [PR#234](https://github.com/ministryofjustice/hmpps-restricted-patients/pull/234) for an example PR. If you decide to change `'/login'` to `'/sign-in'` at the same time ([PR#235](https://github.com/ministryofjustice/hmpps-restricted-patients-ui/pull/235)) then your client in HMPPS Auth will also need to be changed to include the new callback url.

### Fallbacks

Appropriate fallback components should be included within your application. For the header and footer, templates are provided in the `_fallbacks` directory of this repo to copy and paste into your application, along with `scss` stylesheets.

Place the `fallback-header.njk` and `fallback-footer.njk` files into your `/server/views/partials` directory, remove the `fallback-` prefix, overwriting the existing `header.njk` and `footer.njk` files if applicable.

Place the `fallback-header.scss` and `fallback-footer.scss` files into your `/assets/scss/components` directory, rename them `_header.scss` and `_footer.scss`, overwriting the existing `_header.scss` and `_footer.scss` files if applicable, and update your `/assets/scss/index.scss` file to include these stylesheets, i.e.

```
@import './components/header';
@import './components/footer';
```

The header component and fallback header include an environment 'badge' to display the name of the deployed environment (e.g. DEV, PRE-PRODUCTION). In order to support this in the fallback header, copy the `setUpEnvironmentName.ts.txt` file from the `_fallbacks` directory into your `/server/middleware` directory, removing the `.txt` extension, and add the following line to your `/server/app.ts`, immediately before the nunjucksSetup line:
```
setUpEnvironmentName(app)
```

Then add an environment variable to the `values-{env}.yaml` files for `ENVIRONMENT_NAME` and populate with the following values:

* dev - `DEV`

* preprod - `PRE-PRODUCTION`

* prod - `PRODUCTION` (It must be exactly `PRODUCTION` for your prod environment to ensure the environment badge does not show)

And include this in your `/server/config.ts` as:

```
environmentName: get('ENVIRONMENT_NAME', '')
```

You can also add the `ENVIRONMENT_NAME` variable to your `.env` file to show the badge when running locally.