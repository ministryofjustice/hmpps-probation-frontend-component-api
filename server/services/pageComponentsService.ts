import type { Request, Response } from 'express'
import config from '../config'
import componentsController, { FooterViewModel, HeaderViewModel } from '../controllers/componentsController'
import type { HmppsUser } from '../interfaces/hmppsUser'
import Component from '../@types/Component'
import { getRequestLogger } from '../utils/currentUserContext'

export type FeComponentsLocals = {
  header: string
  footer: string
  cssIncludes: string[]
  jsIncludes: string[]
}

function getController() {
  return componentsController()
}

function renderView(res: Response, view: string, viewModel: object): Promise<string> {
  return new Promise((resolve, reject) => {
    res.render(view, viewModel, (err, html) => {
      if (err) {
        reject(err)
        return
      }
      resolve(html)
    })
  })
}

export async function renderHeaderComponent(
  res: Response,
  viewModel: HeaderViewModel,
  classes?: string,
): Promise<Component> {
  const viewModelWithClasses = classes ? { ...viewModel, classes } : viewModel
  const html = await renderView(res, 'components/header', viewModelWithClasses)
  return {
    html,
    css: [`${config.ingressUrl}/assets/css/header.css`],
    javascript: [`${config.ingressUrl}/assets/js/header.js`],
  }
}

export async function renderFooterComponent(res: Response, viewModel: FooterViewModel): Promise<Component> {
  const html = await renderView(res, 'components/footer', viewModel)
  return {
    html,
    css: [`${config.ingressUrl}/assets/css/footer.css`],
    javascript: [],
  }
}

async function renderFallbackComponents(res: Response, user: HmppsUser | null): Promise<FeComponentsLocals> {
  const controller = getController()
  const [headerViewModel, footerViewModel] = await Promise.all([
    controller.getFallbackHeaderViewModel((user ?? {}) as HmppsUser),
    controller.getFallbackFooterViewModel(),
  ])

  const [header, footer] = await Promise.all([
    renderView(res, 'pdsComponents/header', headerViewModel),
    renderView(res, 'pdsComponents/footer', footerViewModel),
  ])

  return {
    header,
    footer,
    // Fallback styles are bundled into index.css via the npm package SCSS imports.
    cssIncludes: [],
    jsIncludes: [],
  }
}

/**
 * Build feComponents from the same controller + templates that power /api/components.
 * Used by this app's own pages so it both provides and consumes the shared components.
 */
export async function buildFeComponents(
  res: Response,
  user: HmppsUser | null | undefined,
  classes?: string,
): Promise<FeComponentsLocals> {
  if (!user?.token) {
    getRequestLogger().info('Using fallback frontend components when no user in context')
    return renderFallbackComponents(res, user ?? null)
  }

  const viewModels = await getController().getViewModels(['header', 'footer'], user)
  const [header, footer] = await Promise.all([
    renderHeaderComponent(res, viewModels.header as HeaderViewModel, classes),
    renderFooterComponent(res, viewModels.footer as FooterViewModel),
  ])

  return {
    header: header.html,
    footer: footer.html,
    cssIncludes: [...header.css, ...footer.css],
    jsIncludes: [...header.javascript, ...footer.javascript],
  }
}

/** Kept for callers that need classes from the request query (API route). */
export function getClassesFromRequest(req: Request): string | undefined {
  const raw = req.query.classes
  getRequestLogger().debug('Raw classes header', JSON.stringify(raw))
  if (!raw) return undefined
  if (Array.isArray(raw)) return raw.filter(Boolean).join(' ').trim() || undefined
  if (typeof raw === 'string') return raw.trim() || undefined
  return undefined
}
