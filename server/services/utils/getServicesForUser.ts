import { Service } from '../../interfaces/Service'

export default (): Service[] => {
  return []
    .filter(service => service.enabled())
    .map(service => {
      const { id, heading, description, href, navEnabled } = service
      return { id, heading, description, href, navEnabled }
    })
    .sort((a, b) => (a.heading.toLowerCase() < b.heading.toLowerCase() ? -1 : 1))
}
