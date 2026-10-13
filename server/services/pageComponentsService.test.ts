import type { Response } from 'express'
import componentsController from '../controllers/componentsController'
import { buildFeComponents, getClassesFromRequest } from './pageComponentsService'
import type { HmppsUser } from '../interfaces/hmppsUser'

jest.mock('../controllers/componentsController', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('../../logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

const getViewModels = jest.fn()
const getFallbackHeaderViewModel = jest.fn()
const getFallbackFooterViewModel = jest.fn()

;(componentsController as jest.Mock).mockReturnValue({
  getViewModels,
  getFallbackHeaderViewModel,
  getFallbackFooterViewModel,
})

describe('pageComponentsService', () => {
  const render = jest.fn()

  const res = {
    render,
    locals: {},
  } as unknown as Response

  beforeEach(() => {
    jest.clearAllMocks()
    render.mockImplementation((_view: string, _model: object, cb: (err: Error | null, html?: string) => void) => {
      cb(null, `<html>${_view}</html>`)
    })
  })

  it('builds feComponents from the same header/footer templates as the API', async () => {
    getViewModels.mockResolvedValue({
      header: { component: 'header' },
      footer: { component: 'footer' },
    })

    const user = { token: 'token', displayName: 'Test User' } as HmppsUser
    const result = await buildFeComponents(res, user)

    expect(getViewModels).toHaveBeenCalledWith(['header', 'footer'], user)
    expect(render).toHaveBeenCalledWith('components/header', expect.any(Object), expect.any(Function))
    expect(render).toHaveBeenCalledWith('components/footer', expect.any(Object), expect.any(Function))
    expect(result.header).toContain('components/header')
    expect(result.footer).toContain('components/footer')
    expect(result.cssIncludes).toEqual([
      'http://localhost:3001/assets/css/header.css',
      'http://localhost:3001/assets/css/footer.css',
    ])
    expect(result.jsIncludes).toEqual(['http://localhost:3001/assets/js/header.js'])
  })

  it('uses fallback components when there is no user token', async () => {
    getFallbackHeaderViewModel.mockResolvedValue({ component: 'header', fallback: true })
    getFallbackFooterViewModel.mockResolvedValue({ component: 'footer', fallback: true })

    const result = await buildFeComponents(res, undefined)

    expect(render).toHaveBeenCalledWith('pdsComponents/header', expect.any(Object), expect.any(Function))
    expect(render).toHaveBeenCalledWith('pdsComponents/footer', expect.any(Object), expect.any(Function))
    expect(result.cssIncludes).toEqual([])
    expect(result.jsIncludes).toEqual([])
  })

  it('parses classes query params', () => {
    expect(getClassesFromRequest({ query: { classes: 'a b' } } as never)).toBe('a b')
    expect(getClassesFromRequest({ query: { classes: ['x', 'y'] } } as never)).toBe('x y')
    expect(getClassesFromRequest({ query: {} } as never)).toBeUndefined()
  })
})
