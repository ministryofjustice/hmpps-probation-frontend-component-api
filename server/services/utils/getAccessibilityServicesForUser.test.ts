import { Service } from '../../interfaces/Service'
import getAccessibilityServicesForUser from './getAccessibilityServicesForUser'

describe('getAccessibilityServicesForUser', () => {
  it('returns only services with an accessibility url', () => {
    const output = getAccessibilityServicesForUser([
      {
        accessibilityHeading: 'Allocate a Person on Probation',
        accessibilityUrl: '/accessibility/allocate-a-person-on-probation',
      },
      {
        accessibilityHeading: 'Consider a Recall',
        accessibilityUrl: '/accessibility/consider-a-recall',
      },
      {
        heading: 'Approved Premises (CAS1)',
      },
    ] as Service[])
    expect(
      !!output.every(service => {
        return ['Allocate a Person on Probation', 'Consider a Recall'].includes(service.heading)
      }),
    ).toEqual(true)
    expect(output.length).toEqual(2)
  })
})
