import { EventEmitter } from 'events'

import { Contracts, defaultClient, DistributedTracingModes, getCorrelationContext, setup } from 'applicationinsights'

import type { ApplicationInfo } from '../applicationInfo'
import { appInsightsMiddleware, buildAppInsightsClient, initialiseAppInsights } from './azureAppInsights'

jest.mock('applicationinsights', () => {
  const actual = jest.requireActual<typeof import('applicationinsights')>('applicationinsights')
  const start = jest.fn()
  const setDistributedTracingMode = jest.fn(() => ({ start }))
  const setupFn = jest.fn(() => ({ setDistributedTracingMode }))
  const defaultClientMock = {
    context: { tags: {} as Record<string, string> },
    addTelemetryProcessor: jest.fn(),
  }
  return {
    ...actual,
    setup: setupFn,
    defaultClient: defaultClientMock,
    getCorrelationContext: jest.fn(),
  }
})

const applicationInfo: ApplicationInfo = {
  applicationName: 'test-app',
  buildNumber: '9.9.9',
  gitRef: 'abcdef',
  gitShortHash: 'abcdef0',
  productId: 'p1',
  branchName: 'main',
}

function getTelemetryProcessors(): Array<(envelope: unknown, context?: unknown) => boolean> {
  return (defaultClient as unknown as { addTelemetryProcessor: jest.Mock }).addTelemetryProcessor.mock.calls.map(
    ([fn]: [(envelope: unknown, context?: unknown) => boolean]) => fn,
  )
}

describe('azureAppInsights', () => {
  const originalConnectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
    ;(defaultClient as { context: { tags: Record<string, string> } }).context.tags = {}
  })

  afterAll(() => {
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = originalConnectionString
  })

  describe('initialiseAppInsights', () => {
    it('does nothing when APPLICATIONINSIGHTS_CONNECTION_STRING is unset', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation()

      initialiseAppInsights()

      expect(setup).not.toHaveBeenCalled()
      expect(logSpy).not.toHaveBeenCalled()
      logSpy.mockRestore()
    })

    it('starts Application Insights when connection string is set', () => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'InstrumentationKey=test'
      const logSpy = jest.spyOn(console, 'log').mockImplementation()

      initialiseAppInsights()

      expect(setup).toHaveBeenCalled()
      const chain = jest.mocked(setup).mock.results[0]?.value as { setDistributedTracingMode: jest.Mock }
      expect(chain.setDistributedTracingMode).toHaveBeenCalledWith(DistributedTracingModes.AI_AND_W3C)
      const afterTracing = chain.setDistributedTracingMode.mock.results[0]?.value as { start: jest.Mock }
      expect(afterTracing.start).toHaveBeenCalled()
      expect(logSpy).toHaveBeenCalledWith('Enabling azure application insights')
      logSpy.mockRestore()
    })
  })

  describe('buildAppInsightsClient', () => {
    it('returns null when APPLICATIONINSIGHTS_CONNECTION_STRING is unset', () => {
      expect(buildAppInsightsClient(applicationInfo)).toBeNull()
      expect(
        (defaultClient as unknown as { addTelemetryProcessor: jest.Mock }).addTelemetryProcessor,
      ).not.toHaveBeenCalled()
    })

    it('configures defaultClient and registers telemetry processors when connection string is set', () => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'InstrumentationKey=test'

      const client = buildAppInsightsClient(applicationInfo)

      expect(client).toBe(defaultClient)
      expect(defaultClient.context.tags['ai.cloud.role']).toBe('test-app')
      expect(defaultClient.context.tags['ai.application.ver']).toBe('9.9.9')
      expect(
        (defaultClient as unknown as { addTelemetryProcessor: jest.Mock }).addTelemetryProcessor,
      ).toHaveBeenCalledTimes(4)
    })
  })

  describe('telemetry processors', () => {
    beforeEach(() => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'InstrumentationKey=test'
      buildAppInsightsClient(applicationInfo)
    })

    it('addUserDataToRequests merges username and activeCaseLoadId from res.locals.user', () => {
      const [addUserData] = getTelemetryProcessors()
      const envelope = {
        data: {
          baseType: Contracts.TelemetryTypeString.Request,
          baseData: {
            properties: { existing: 'keep' },
          },
        },
      }
      const context = {
        'http.ServerRequest': {
          res: { locals: { user: { username: 'USER1', activeCaseLoadId: 'CASE-1' } } },
        },
      }

      expect(addUserData(envelope, context)).toBe(true)
      expect(
        (envelope as { data: { baseData: { properties: Record<string, string> } } }).data.baseData.properties,
      ).toEqual({
        username: 'USER1',
        activeCaseLoadId: 'CASE-1',
        existing: 'keep',
      })
    })

    it('addUserDataToRequests leaves envelope unchanged when not a request', () => {
      const [addUserData] = getTelemetryProcessors()
      const envelope = {
        data: {
          baseType: Contracts.TelemetryTypeString.Trace,
          baseData: { properties: { a: 1 } },
        },
      }

      expect(addUserData(envelope, {})).toBe(true)
      expect(
        (envelope as { data: { baseData: { properties: Record<string, unknown> } } }).data.baseData.properties,
      ).toEqual({
        a: 1,
      })
    })

    it('parameterisePaths sets operation name from correlation context', () => {
      const [, parameterisePaths] = getTelemetryProcessors()
      const envelope = {
        tags: {} as Record<string, string>,
        data: { baseData: { name: 'before' } },
      }
      const context = {
        correlationContext: {
          customProperties: {
            getProperty: jest.fn().mockReturnValue('GET /widgets/:id'),
          },
        },
      }

      expect(parameterisePaths(envelope, context)).toBe(true)
      expect(envelope.tags['ai.operation.name']).toBe('GET /widgets/:id')
      expect((envelope as { data: { baseData: { name: string } } }).data.baseData.name).toBe('GET /widgets/:id')
    })

    it('ignoredRequestsProcessor drops telemetry for ignored path prefixes', () => {
      const [, , ignoredRequests] = getTelemetryProcessors()
      const rd = new Contracts.RequestData()
      rd.name = 'GET /ping'
      const envelope = {
        data: {
          baseType: Contracts.TelemetryTypeString.Request,
          baseData: rd,
        },
      }

      expect(ignoredRequests(envelope)).toBe(false)
    })

    it('ignoredRequestsProcessor keeps non-ignored requests', () => {
      const [, , ignoredRequests] = getTelemetryProcessors()
      const rd = new Contracts.RequestData()
      rd.name = 'GET /api/components'
      const envelope = {
        data: {
          baseType: Contracts.TelemetryTypeString.Request,
          baseData: rd,
        },
      }

      expect(ignoredRequests(envelope)).toBe(true)
    })

    it('ignoredRequestsProcessor returns true when request baseData is not RequestData', () => {
      const [, , ignoredRequests] = getTelemetryProcessors()
      const envelope = {
        data: {
          baseType: Contracts.TelemetryTypeString.Request,
          baseData: { name: 'GET /ping' },
        },
      }

      expect(ignoredRequests(envelope)).toBe(true)
    })

    it('ignoredDependenciesProcessor drops sqs dependencies', () => {
      const [, , , ignoredDeps] = getTelemetryProcessors()
      const dep = new Contracts.RemoteDependencyData()
      dep.target = 'sqs.eu-west-2.amazonaws.com'
      const envelope = {
        data: {
          baseType: Contracts.TelemetryTypeString.Dependency,
          baseData: dep,
        },
      }

      expect(ignoredDeps(envelope)).toBe(false)
    })

    it('ignoredDependenciesProcessor keeps other dependencies', () => {
      const [, , , ignoredDeps] = getTelemetryProcessors()
      const dep = new Contracts.RemoteDependencyData()
      dep.target = 'https://auth.example.com'
      const envelope = {
        data: {
          baseType: Contracts.TelemetryTypeString.Dependency,
          baseData: dep,
        },
      }

      expect(ignoredDeps(envelope)).toBe(true)
    })
  })

  describe('appInsightsMiddleware', () => {
    it('calls next and sets operationName on response finish when correlation context and route exist', () => {
      const setProperty = jest.fn()
      jest.mocked(getCorrelationContext).mockReturnValue({
        customProperties: { setProperty },
      } as unknown as ReturnType<typeof getCorrelationContext>)

      const middleware = appInsightsMiddleware()
      const req = { method: 'POST', route: { path: '/items/:id' } }
      const res = new EventEmitter() as import('express').Response
      const next = jest.fn()

      middleware(req as Parameters<typeof middleware>[0], res, next)

      expect(next).toHaveBeenCalled()
      res.emit('finish')
      expect(setProperty).toHaveBeenCalledWith('operationName', 'POST /items/:id')
    })

    it('does not set operationName when correlation context is missing', () => {
      jest.mocked(getCorrelationContext).mockReturnValue(null as unknown as ReturnType<typeof getCorrelationContext>)

      const middleware = appInsightsMiddleware()
      const req = { method: 'GET', route: { path: '/x' } }
      const res = new EventEmitter() as import('express').Response
      const next = jest.fn()

      middleware(req as Parameters<typeof middleware>[0], res, next)
      res.emit('finish')

      expect(next).toHaveBeenCalled()
    })

    it('does not set operationName when req.route is missing', () => {
      const setProperty = jest.fn()
      jest.mocked(getCorrelationContext).mockReturnValue({
        customProperties: { setProperty },
      } as unknown as ReturnType<typeof getCorrelationContext>)

      const middleware = appInsightsMiddleware()
      const req = { method: 'GET' }
      const res = new EventEmitter() as import('express').Response
      const next = jest.fn()

      middleware(req as Parameters<typeof middleware>[0], res, next)
      res.emit('finish')

      expect(setProperty).not.toHaveBeenCalled()
    })
  })
})
