import { AgentConfig } from '@ministryofjustice/hmpps-rest-client'

const production = process.env.NODE_ENV === 'production'

function get<T>(name: string, fallback: T, options = { requireInProduction: false }): T | string {
  if (process.env[name]) {
    return process.env[name]
  }
  if (fallback !== undefined && (!production || !options.requireInProduction)) {
    return fallback
  }
  throw new Error(`Missing env var ${name}`)
}

const requiredInProduction = { requireInProduction: true }

export interface ApiConfig {
  url: string
  timeout: {
    response: number
    deadline: number
  }
  agent: AgentConfig
}

export default {
  ingressUrl: get('INGRESS_URL', 'http://localhost:3000', requiredInProduction),
  buildNumber: get('BUILD_NUMBER', '1_0_0', requiredInProduction),
  productId: get('PRODUCT_ID', 'UNASSIGNED', requiredInProduction),
  gitRef: get('GIT_REF', 'xxxxxxxxxxxxxxxxxxx', requiredInProduction),
  branchName: get('GIT_BRANCH', 'xxxxxxxxxxxxxxxxxxx', requiredInProduction),
  production,
  https: production,
  staticResourceCacheDuration: '1h',
  redis: {
    host: get('REDIS_HOST', 'localhost', requiredInProduction),
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_AUTH_TOKEN,
    tls_enabled: get('REDIS_TLS_ENABLED', 'false'),
    cacheTimeout: Number(get('CACHE_TIMEOUT', 600)),
    enabled: get('REDIS_ENABLED', 'false', requiredInProduction) === 'true',
  },
  session: {
    secret: get('SESSION_SECRET', 'app-insecure-default-session', requiredInProduction),
    expiryMinutes: Number(get('WEB_SESSION_TIMEOUT_IN_MINUTES', 120)),
  },
  app: {},
  apis: {
    hmppsAuth: {
      url: get('HMPPS_AUTH_URL', 'http://localhost:9090/auth', requiredInProduction),
      externalUrl: get('HMPPS_AUTH_EXTERNAL_URL', get('HMPPS_AUTH_URL', 'http://localhost:9090/auth')),
      timeout: {
        response: Number(get('HMPPS_AUTH_TIMEOUT_RESPONSE', 10000)),
        deadline: Number(get('HMPPS_AUTH_TIMEOUT_DEADLINE', 10000)),
      },
      agent: new AgentConfig(Number(get('HMPPS_AUTH_TIMEOUT_RESPONSE', 10000))),
      authCodeClientId: get('AUTH_CODE_CLIENT_ID', 'hmpps-typescript-template', requiredInProduction),
      authCodeClientSecret: get('AUTH_CODE_CLIENT_SECRET', 'clientsecret', requiredInProduction),
      clientCredentialsClientId: get(
        'CLIENT_CREDS_CLIENT_ID',
        'hmpps-typescript-template-system',
        requiredInProduction,
      ),
      clientCredentialsClientSecret: get('CLIENT_CREDS_CLIENT_SECRET', 'clientsecret', requiredInProduction),
    },
    tokenVerification: {
      url: get('TOKEN_VERIFICATION_API_URL', 'http://localhost:8100', requiredInProduction),
      timeout: {
        response: Number(get('TOKEN_VERIFICATION_API_TIMEOUT_RESPONSE', 5000)),
        deadline: Number(get('TOKEN_VERIFICATION_API_TIMEOUT_DEADLINE', 5000)),
      },
      agent: new AgentConfig(Number(get('TOKEN_VERIFICATION_API_TIMEOUT_RESPONSE', 5000))),
      enabled: get('TOKEN_VERIFICATION_ENABLED', 'false') === 'true',
    },
  },
  domain: get('INGRESS_URL', 'http://localhost:3000', requiredInProduction),
  contentfulFooterLinksEnabled: false,
  environmentName: get('ENVIRONMENT_NAME', 'LOCAL'),
  serviceUrls: {},
  features: {},
}
