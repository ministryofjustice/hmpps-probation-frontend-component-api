import {
  defaultClient,
  DistributedTracingModes,
  getCorrelationContext,
  setup,
  TelemetryClient,
} from 'applicationinsights'

import { RequestHandler } from 'express'
import { ApplicationInfo } from '../applicationInfo'

const requestPrefixesToIgnore = ['GET /assets/', 'GET /health', 'GET /ping', 'GET /info']
const dependencyPrefixesToIgnore = ['sqs']
const requestTelemetryBaseType = 'RequestData'
const dependencyTelemetryBaseType = 'RemoteDependencyData'

export type ContextObject = {
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  [name: string]: any
}

type TelemetryProcessor = Parameters<TelemetryClient['addTelemetryProcessor']>[0]
type TelemetryEnvelope = Parameters<TelemetryProcessor>[0]

export function initialiseAppInsights(): void {
  if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    // eslint-disable-next-line no-console
    console.log('Enabling azure application insights')

    setup().setDistributedTracingMode(DistributedTracingModes.AI_AND_W3C).start()
  }
}

export function buildAppInsightsClient(applicationInfo: ApplicationInfo): TelemetryClient {
  if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    defaultClient.context.tags['ai.cloud.role'] = applicationInfo.applicationName
    defaultClient.context.tags['ai.application.ver'] = applicationInfo.buildNumber
    defaultClient.addTelemetryProcessor(addUserDataToRequests)
    defaultClient.addTelemetryProcessor(parameterisePaths)
    defaultClient.addTelemetryProcessor(ignoredRequestsProcessor)
    defaultClient.addTelemetryProcessor(ignoredDependenciesProcessor)
    return defaultClient
  }
  return null
}

function addUserDataToRequests(envelope: TelemetryEnvelope, contextObjects: ContextObject) {
  const isRequest = envelope.data?.baseType === requestTelemetryBaseType
  if (isRequest) {
    const { username, activeCaseLoadId } = contextObjects?.['http.ServerRequest']?.res?.locals?.user || {}
    if (username) {
      const baseData = (envelope.data?.baseData ?? {}) as { properties?: Record<string, unknown> }
      const { properties } = baseData
      baseData.properties = {
        username,
        activeCaseLoadId,
        ...properties,
      }
    }
  }
  return true
}

function parameterisePaths(envelope: TelemetryEnvelope, contextObjects: ContextObject) {
  const operationNameOverride = contextObjects.correlationContext?.customProperties?.getProperty('operationName')
  if (operationNameOverride) {
    // eslint-disable-next-line no-param-reassign
    envelope.tags = envelope.tags || {}
    // eslint-disable-next-line no-param-reassign
    envelope.tags['ai.operation.name'] = operationNameOverride
    const baseData = envelope.data?.baseData as { name?: string } | undefined
    if (baseData) {
      baseData.name = operationNameOverride
    }
  }
  return true
}

function ignoredRequestsProcessor(envelope: TelemetryEnvelope) {
  if (envelope.data?.baseType === requestTelemetryBaseType) {
    const requestData = envelope.data.baseData as { name?: string } | undefined
    const { name } = requestData ?? {}
    if (typeof name === 'string') {
      return requestPrefixesToIgnore.every(prefix => !name.startsWith(prefix))
    }
  }
  return true
}

function ignoredDependenciesProcessor(envelope: TelemetryEnvelope) {
  if (envelope.data?.baseType === dependencyTelemetryBaseType) {
    const dependencyData = envelope.data.baseData as { target?: string } | undefined
    const { target } = dependencyData ?? {}
    if (typeof target === 'string') {
      return dependencyPrefixesToIgnore.every(prefix => !target.startsWith(prefix))
    }
  }
  return true
}

export function appInsightsMiddleware(): RequestHandler {
  return (req, res, next) => {
    res.prependOnceListener('finish', () => {
      const context = getCorrelationContext()
      if (context && req.route) {
        context.customProperties.setProperty('operationName', `${req.method} ${req.route?.path}`)
      }
    })
    next()
  }
}
