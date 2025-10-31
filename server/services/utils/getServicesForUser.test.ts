import { Role } from './roles'
import getServicesForUser from './getServicesForUser'

jest.mock('../../config', () => ({
  serviceUrls: {
    allocateAPersonOnProbation: { url: 'url' },
    approvedPremises: { url: 'url' },
    considerARecall: { url: 'url' },
    createAndVaryALicence: { url: 'url' },
    managePeopleOnProbation: { url: 'url' },
    nDelius: { url: 'url' },
    oAsys: { url: 'url' },
    prepareACase: { url: 'url' },
    referAndMonitor: { url: 'url' },
    transitionalAccomodation: { url: 'url' },
    workloadMeasurementTool: { url: 'url' },
  },
}))

describe('getServicesForUser', () => {
  describe('Open services', () => {
    it('user with no roles can see open services', () => {
      const output = getServicesForUser([])
      expect(
        !!output.every(service => {
          return [
            'Approved Premises (CAS1)',
            'NDelius (opens in a new tab)',
            'OASys (opens in a new tab)',
            'Refer and monitor an intervention',
            'Transitional Accomodation (CAS3)',
          ].includes(service.heading)
        }),
      ).toEqual(true)
    })
  })

  describe('Allocate a Person on Probation', () => {
    test.each`
      roles                              | visible
      ${[Role.ManageAWorkforceAllocate]} | ${true}
      ${[]}                              | ${false}
    `('user with roles: $roles, can see: $visible', ({ roles, visible }) => {
      const output = getServicesForUser(roles)
      expect(!!output.find(service => service.heading === 'Allocate a Person on Probation')).toEqual(visible)
    })
  })

  describe('Consider a recall', () => {
    test.each`
      roles                            | visible
      ${[Role.MakeRecallDecisionSpo]}  | ${true}
      ${[Role.MakeRecallDecision]}     | ${true}
      ${[Role.MardDutyManager]}        | ${true}
      ${[Role.MardResidentWorker]}     | ${true}
      ${[Role.MakeRecallDecisionPpcs]} | ${true}
      ${[]}                            | ${false}
    `('user with roles: $roles, can see: $visible', ({ roles, visible }) => {
      const output = getServicesForUser(roles)
      expect(!!output.find(service => service.heading === 'Consider a recall')).toEqual(visible)
    })
  })

  describe('Create and Vary a licence', () => {
    test.each`
      roles                        | visible
      ${[Role.CaseAdmin]}          | ${true}
      ${[Role.ResponsibleOfficer]} | ${true}
      ${[Role.DecisionMaker]}      | ${true}
      ${[Role.ReadOnly]}           | ${true}
      ${[Role.AssistantChief]}     | ${true}
      ${[Role.Support]}            | ${true}
      ${[]}                        | ${false}
    `('user with roles: $roles, can see: $visible', ({ roles, visible }) => {
      const output = getServicesForUser(roles)
      expect(!!output.find(service => service.heading === 'Create and vary a licence')).toEqual(visible)
    })
  })

  describe('Manage people on probation', () => {
    test.each`
      roles                        | visible
      ${[Role.ManageSupervisions]} | ${true}
      ${[]}                        | ${false}
    `('user with roles: $roles, can see: $visible', ({ roles, visible }) => {
      const output = getServicesForUser(roles)
      expect(!!output.find(service => service.heading === 'Manage people on probation')).toEqual(visible)
    })
  })

  describe('Prepare a case for sentence', () => {
    test.each`
      roles                  | visible
      ${[Role.PrepareACase]} | ${true}
      ${[]}                  | ${false}
    `('user with roles: $roles, can see: $visible', ({ roles, visible }) => {
      const output = getServicesForUser(roles)
      expect(!!output.find(service => service.heading === 'Prepare a case for sentence')).toEqual(visible)
    })
  })

  describe('Workload Measurement Tool (WMT)', () => {
    test.each`
      roles                         | visible
      ${[Role.WorkloadMeasurement]} | ${true}
      ${[]}                         | ${false}
    `('user with roles: $roles, can see: $visible', ({ roles, visible }) => {
      const output = getServicesForUser(roles)
      expect(!!output.find(service => service.heading === 'Workload Measurement Tool (WMT)')).toEqual(visible)
    })
  })
})
