import superagent from 'superagent'
import { HttpAgent, HttpsAgent } from 'agentkeepalive'
import { AgentConfig } from '@ministryofjustice/hmpps-rest-client'
import logger from '../../logger'

export type ServiceCheck = () => Promise<string>

export class ServiceTimeout {
  response = 1500

  deadline = 2000
}

export function serviceCheckFactory(
  name: string,
  url: string,
  agentOptions: AgentConfig,
  serviceTimeout: ServiceTimeout = new ServiceTimeout(),
): ServiceCheck {
  const keepaliveAgent = url.startsWith('https') ? new HttpsAgent(agentOptions) : new HttpAgent(agentOptions)

  return async () => {
    try {
      const response = await superagent
        .get(url)
        .agent(keepaliveAgent)
        .retry(2, err => {
          if (err) logger.info(`Retry handler found API error with ${err.code} ${err.message} when calling ${name}`)
          return undefined // retry handler only for logging retries, not to influence retry logic
        })
        .timeout(serviceTimeout)

      if (response.status === 200) {
        return 'OK'
      }
      throw response.status
    } catch (error) {
      logger.error(error.stack, `Error calling ${name}`)
      throw error
    } finally {
      keepaliveAgent.destroy()
    }
  }
}
