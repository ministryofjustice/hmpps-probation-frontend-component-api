export interface Service {
  accessibilityUrl?: string
  accessibilityHeading?: string
  id: string
  heading: string
  href: string
  navEnabled: boolean
  target?: ServiceTarget
}

export interface AccessibilityService {
  heading: string
  url: string
}

export enum ServiceTarget {
  blank = '_blank',
  self = '_self',
}
