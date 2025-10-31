import { AccessibilityService, Service } from '../../interfaces/Service'

export default (services: Service[]): AccessibilityService[] => {
  return services
    ?.filter(service => service.accessibilityUrl?.length > 0)
    .map(service => {
      const { accessibilityHeading, accessibilityUrl } = service
      return { heading: accessibilityHeading, url: accessibilityUrl }
    })
}
