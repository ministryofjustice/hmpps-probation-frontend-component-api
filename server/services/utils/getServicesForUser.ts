import config from '../../config'
import { Service, ServiceTarget } from '../../interfaces/Service'
import { Role, userHasRoles } from './roles'

export default (roles: string[]): Service[] => {
  return [
    {
      id: 'allocate-a-person-on-probation',
      heading: 'Allocate a Person on Probation',
      href: config.serviceUrls.allocateAPersonOnProbation.url,
      navEnabled: true,
      enabled: () => userHasRoles([Role.ManageAWorkforceAllocate], roles),
    },
    {
      id: 'approved-premises',
      heading: 'Approved Premises (CAS1)',
      href: config.serviceUrls.approvedPremises.url,
      navEnabled: true,
      enabled: () => true,
    },
    {
      id: 'consider-a-recall',
      heading: 'Consider a recall',
      href: config.serviceUrls.considerARecall.url,
      navEnabled: true,
      enabled: () =>
        userHasRoles(
          [
            Role.MakeRecallDecisionSpo,
            Role.MakeRecallDecision,
            Role.MardDutyManager,
            Role.MardResidentWorker,
            Role.MakeRecallDecisionPpcs,
          ],
          roles,
        ),
    },
    {
      id: 'manage-people-on-probation',
      heading: 'Manage people on probation',
      href: config.serviceUrls.managePeopleOnProbation.url,
      navEnabled: true,
      enabled: () => userHasRoles([Role.ManageSupervisions], roles),
    },
    {
      id: 'ndelius',
      heading: 'NDelius (opens in a new tab)',
      href: config.serviceUrls.nDelius.url,
      navEnabled: true,
      enabled: () => true,
      target: ServiceTarget.blank,
    },
    {
      id: 'oasys',
      heading: 'OASys (opens in a new tab)',
      href: config.serviceUrls.oAsys.url,
      navEnabled: true,
      enabled: () => true,
      target: ServiceTarget.blank,
    },
    {
      id: 'prepare-a-case-for-sentence',
      heading: 'Prepare a case for sentence',
      href: config.serviceUrls.prepareACase.url,
      navEnabled: true,
      enabled: () => userHasRoles([Role.PrepareACase], roles),
    },
    {
      id: 'refer-and-monitor-an-intervention',
      heading: 'Refer and monitor an intervention',
      href: config.serviceUrls.referAndMonitor.url,
      navEnabled: true,
      enabled: () => true,
    },
    {
      id: 'transitional-accomodation',
      heading: 'Transitional Accomodation (CAS3)',
      href: config.serviceUrls.transitionalAccomodation.url,
      navEnabled: true,
      enabled: () => true,
    },
    {
      id: 'workload-measurement-tool',
      heading: 'Workload Measurement Tool (WMT)',
      href: config.serviceUrls.workloadMeasurementTool.url,
      navEnabled: true,
      enabled: () => userHasRoles([Role.WorkloadMeasurement], roles),
    },
  ]
    .filter(service => service.enabled())
    .map(service => {
      const { id, heading, href, navEnabled, target } = service
      return { id, heading, href, navEnabled, target }
    })
    .sort((a, b) => (a.heading.toLowerCase() < b.heading.toLowerCase() ? -1 : 1))
}
