import nock from 'nock'
import { AgentConfig } from '@ministryofjustice/hmpps-rest-client'
import { Readable } from 'stream'
import RestClient from './restClient'

const restClient = new RestClient(
  'name-1',
  {
    url: 'http://localhost:8080/api',
    timeout: {
      response: 1000,
      deadline: 1000,
    },
    agent: new AgentConfig(1000),
  },
  'token-1',
)

afterEach(() => {
  nock.cleanAll()
})

describe('GET', () => {
  it('Should return response body', async () => {
    nock('http://localhost:8080', {
      reqheaders: { authorization: 'Bearer token-1' },
    })
      .get('/api/test')
      .query({ a: 'b' })
      .reply(200, { ok: true })

    const result = await restClient.get({
      path: '/test',
      query: 'a=b',
    })

    expect(nock.isDone()).toBe(true)
    expect(result).toStrictEqual({ ok: true })
  })

  it('Should throw on error response', async () => {
    nock('http://localhost:8080', {
      reqheaders: { authorization: 'Bearer token-1' },
    })
      .get('/api/test')
      .query(true)
      .reply(500)

    await expect(
      restClient.get({
        path: '/test',
        query: 'q=1',
      }),
    ).rejects.toBeInstanceOf(Error)

    expect(nock.isDone()).toBe(true)
  })
})

describe('POST', () => {
  it('Should return response body', async () => {
    nock('http://localhost:8080', {
      reqheaders: { authorization: 'Bearer token-1' },
    })
      .post('/api/test')
      .reply(200, { success: true })

    const result = await restClient.post({
      path: '/test',
    })

    expect(nock.isDone()).toBe(true)

    expect(result).toStrictEqual({
      success: true,
    })
  })

  it('Should return raw response body', async () => {
    nock('http://localhost:8080', {
      reqheaders: { authorization: 'Bearer token-1' },
    })
      .post('/api/test')
      .reply(200, { success: true })

    const result = await restClient.post({
      path: '/test',
      headers: { header1: 'headerValue1' },
      raw: true,
    })

    expect(nock.isDone()).toBe(true)

    expect(result).toMatchObject({
      req: { method: 'POST' },
      status: 200,
      text: '{"success":true}',
    })
  })

  it('Should not retry by default', async () => {
    nock('http://localhost:8080', {
      reqheaders: { authorization: 'Bearer token-1' },
    })
      .post('/api/test')
      .reply(500)

    await expect(
      restClient.post({
        path: '/test',
        headers: { header1: 'headerValue1' },
      }),
    ).rejects.toThrow('Internal Server Error')

    expect(nock.isDone()).toBe(true)
  })

  it('retries if configured to do so', async () => {
    nock('http://localhost:8080', {
      reqheaders: { authorization: 'Bearer token-1' },
    })
      .post('/api/test')
      .reply(500)
      .post('/api/test')
      .reply(500)
      .post('/api/test')
      .reply(500)

    await expect(
      restClient.post({
        path: '/test',
        headers: { header1: 'headerValue1' },
        retry: true,
      }),
    ).rejects.toThrow('Internal Server Error')

    expect(nock.isDone()).toBe(true)
  })

  it('can recover through retries', async () => {
    nock('http://localhost:8080', {
      reqheaders: { authorization: 'Bearer token-1' },
    })
      .post('/api/test')
      .reply(500)
      .post('/api/test')
      .reply(500)
      .post('/api/test')
      .reply(200, { success: true })

    const result = await restClient.post({
      path: '/test',
      headers: { header1: 'headerValue1' },
      retry: true,
    })

    expect(result).toStrictEqual({ success: true })
    expect(nock.isDone()).toBe(true)
  })
})

describe('STREAM', () => {
  it('resolves a readable stream containing the response body', async () => {
    nock('http://localhost:8080', {
      reqheaders: { authorization: 'Bearer token-1' },
    })
      .get('/api/stream-test')
      .reply(200, Buffer.from('hello-stream'))

    const s = (await restClient.stream({ path: '/stream-test' })) as Readable

    expect(s).toBeInstanceOf(Readable)

    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      s.on('data', d => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)))
      s.on('error', reject)
      s.on('end', () => resolve())
    })

    expect(Buffer.concat(chunks).toString('utf-8')).toBe('hello-stream')
    expect(nock.isDone()).toBe(true)
  })

  it('rejects on error response', async () => {
    nock('http://localhost:8080', {
      reqheaders: { authorization: 'Bearer token-1' },
    })
      .get('/api/stream-fail')
      .reply(500)

    await expect(restClient.stream({ path: '/stream-fail' })).rejects.toBeTruthy()
    expect(nock.isDone()).toBe(true)
  })
})

describe('agent selection', () => {
  it('uses an https agent when url is https', () => {
    const httpsClient = new RestClient(
      'name-https',
      {
        url: 'https://localhost:8443/api',
        timeout: { response: 1000, deadline: 1000 },
        agent: new AgentConfig(1000),
      },
      'token-1',
    )

    expect(httpsClient.agent).toBeTruthy()
  })
})
