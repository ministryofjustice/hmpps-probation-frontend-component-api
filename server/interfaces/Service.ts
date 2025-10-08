export interface Service {
  id: string
  heading: string
  href: string
  navEnabled: boolean
  target?: ServiceTarget
}

export enum ServiceTarget {
  blank = '_blank',
  self = '_self',
}
