import config from '../config'
import { PageLink } from '../interfaces/PageLink'
import { AvailableComponent } from '../@types/AvailableComponent'
import { HmppsUser, isProbationUser, UserAccess } from '../interfaces/hmppsUser'
import { DEFAULT_USER_ACCESS } from '../services/userService'

export interface HeaderViewModel {
  isProbationUser: boolean
  component: string
  ingressUrl: string
  manageDetailsLink: string
}

export interface FooterViewModel {
  isProbationUser: boolean
  managedPages: PageLink[]
  component: string
}

export interface FallbackViewModel {
  component: string
  fallback: boolean
}

const defaultFooterLinks: PageLink[] = [
  {
    href: `${config.ingressUrl}/accessibility-statement`,
    text: 'Accessibility',
  },
  {
    href: `${config.ingressUrl}/terms-and-conditions`,
    text: 'Terms and conditions',
  },
  {
    href: `${config.ingressUrl}/privacy-policy`,
    text: 'Privacy policy',
  },
  {
    href: `${config.ingressUrl}/cookies-policy`,
    text: 'Cookies policy',
  },
]

export default (): {
  getHeaderViewModel: (user: HmppsUser) => Promise<HeaderViewModel>
  getFooterViewModel: (user: HmppsUser) => Promise<FooterViewModel>
  getFallbackFooterViewModel: () => Promise<FallbackViewModel>
  getFallbackHeaderViewModel: () => Promise<FallbackViewModel>
  getViewModels: (components: AvailableComponent[], user: HmppsUser) => Promise<ComponentsData>
} => ({
  async getHeaderViewModel(user: HmppsUser): Promise<HeaderViewModel> {
    return {
      isProbationUser: isProbationUser(user),
      manageDetailsLink: `${config.apis.hmppsAuth.url}/account-details`,
      component: 'header',
      ingressUrl: config.ingressUrl,
    }
  },

  async getFooterViewModel(user: HmppsUser): Promise<FooterViewModel> {
    const managedPages = defaultFooterLinks

    return {
      managedPages,
      isProbationUser: isProbationUser(user),
      component: 'footer',
    }
  },

  async getFallbackFooterViewModel(): Promise<FallbackViewModel> {
    return {
      component: 'fallback-footer',
      fallback: true,
    }
  },

  async getFallbackHeaderViewModel(): Promise<FallbackViewModel> {
    return {
      component: 'fallback-header',
      fallback: true,
    }
  },

  async getViewModels(components: AvailableComponent[], user: HmppsUser) {
    const accessMethods = {
      header: this.getHeaderViewModel,
      footer: this.getFooterViewModel,
    }

    const viewModels = await Promise.all(
      components.map(component => accessMethods[component as AvailableComponent](user)),
    )

    return components.reduce<ComponentsData>(
      (output, componentName, index) => {
        return {
          ...output,
          [componentName]: viewModels[index],
        }
      },
      {
        meta: user.authSource === 'delius' ? { services: user.services } : DEFAULT_USER_ACCESS,
      },
    )
  },
})

export type ComponentsData = Partial<Record<AvailableComponent, HeaderViewModel | FooterViewModel>> & {
  meta: UserAccess
}
