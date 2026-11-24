import { RedisClient } from './redisClient'

import logger from '../../logger'

export default class TokenStore {
  private readonly prefix = 'systemToken:'

  constructor(private readonly client: RedisClient) {
    client.on('error', (error: Error) => {
      logger.error(error, `Redis error`)
    })
  }

  private async ensureConnected() {
    if (!this.client.isOpen) {
      await this.client.connect()
    }
  }

  public async setToken(key: string, token: string, durationSeconds: number): Promise<void> {
    await this.ensureConnected()
    await this.client.set(`${this.prefix}${key}`, token, { EX: durationSeconds })
  }

  public async getToken(key: string): Promise<string> {
    await this.ensureConnected()
    const value = await this.client.get(`${this.prefix}${key}`)

    if (!value) {
      return ''
    }

    // Handle Buffer response from Redis client
    if (Buffer.isBuffer(value)) {
      return value.toString('utf-8')
    }

    return value as string
  }
}
