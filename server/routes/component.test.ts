import request from 'supertest'
import * as cheerio from 'cheerio'
import { NextFunction, Request } from 'express'
import { App } from 'supertest/types'
import jwt from 'jsonwebtoken'
import createApp from '../app'
import { services } from '../services'
import { getTokenDataMock } from '../../tests/mocks/TokenDataMock'
import { disconnectRedisClient } from '../middleware/setUpWebSession'

jest.mock('../applicationInfo', () => () => ({
  applicationName: 'test',
  buildNumber: '1',
  gitRef: 'long ref',
  gitShortHash: 'short ref',
  branchName: 'main',
}))

const token = jwt.sign(getTokenDataMock(), 'secret')

jest.mock('express-jwt', () => ({
  expressjwt: () => (req: Request, _res: Response, next: NextFunction) => {
    if (req.headers['x-user-token'] !== token) {
      const error = new Error()
      error.name = 'UnauthorizedError'
      return next(error)
    }
    req.auth = getTokenDataMock()
    return next()
  },
}))

let app: App

beforeEach(() => {
  app = createApp({ ...services() })
})

afterEach(() => {
  jest.resetAllMocks()
  disconnectRedisClient()
})

describe('GET /api/components', () => {
  it('should return multiple components if requested', () => {
    return request(app)
      .get('/api/components?component=header&component=footer')
      .set('x-user-token', token)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(res => {
        const body = JSON.parse(res.text)

        const $header = cheerio.load(body.header.html)
        expect(
          $header('a[class="probation-common-header__link probation-common-header__title__organisation-name"]').text(),
        ).toContain('Probation Digital Services')
        expect(body.header.css).toEqual(['http://localhost:3000/assets/css/header.css'])

        expect(body.footer.css).toEqual(['http://localhost:3000/assets/css/footer.css'])
        expect(body.footer.javascript).toEqual([])
      })
  })

  it('should return one component if requested', () => {
    return request(app)
      .get('/api/components?component=footer')
      .set('x-user-token', token)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(res => {
        const body = JSON.parse(res.text)
        expect(body.header).toBeUndefined()
        expect(body.footer).toBeDefined()
      })
  })

  it('should return empty object if no query params', () => {
    return request(app)
      .get('/api/components')
      .set('x-user-token', token)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(res => {
        const body = JSON.parse(res.text)
        expect(body).toEqual({})
      })
  })

  it('should not matter the order of params', () => {
    return request(app)
      .get('/api/components?component=footer&component=header')
      .set('x-user-token', token)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(res => {
        const body = JSON.parse(res.text)
        const $header = cheerio.load(body.header.html)

        expect(
          $header('a[class="probation-common-header__link probation-common-header__title__organisation-name"]').text(),
        ).toContain('Probation Digital Services')
      })
  })

  it('should filter out undefined components', () => {
    return request(app)
      .get('/api/components?component=footer&component=golf')
      .set('x-user-token', token)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(res => {
        const body = JSON.parse(res.text)
        expect(body.header).toBeUndefined()
        expect(body.golf).toBeUndefined()
        expect(body.footer.html).toBeDefined()
      })
  })

  describe('auth', () => {
    it('should send 401 if no token provided', () => {
      return request(app).get('/api/components').expect(401)
    })
  })
})
