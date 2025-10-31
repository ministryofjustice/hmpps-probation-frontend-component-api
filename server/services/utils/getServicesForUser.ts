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
      accessibilityHeading: 'Allocate a Person on Probation',
      accessibilityUrl: '/accessibility/allocate-a-person-on-probation',
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
      accessibilityHeading: 'Consider a Recall',
      accessibilityUrl: '/accessibility/consider-a-recall',
    },
    {
      id: 'create-and-vary-a-licence',
      heading: 'Create and vary a licence',
      href: config.serviceUrls.createAndVaryALicence.url,
      navEnabled: false,
      enabled: () =>
        userHasRoles(
          [
            Role.CaseAdmin,
            Role.ResponsibleOfficer,
            Role.DecisionMaker,
            Role.ReadOnly,
            Role.AssistantChief,
            Role.Support,
          ],
          roles,
        ),
      accessibilityHeading: 'Create and vary a licence',
      accessibilityUrl: '/accessibility/create-and-vary-a-licence',
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
      accessibilityHeading: 'Prepare a case for sentence',
      accessibilityUrl: '/accessibility/prepare-a-case-for-sentence',
    },
    {
      id: 'refer-and-monitor-an-intervention',
      heading: 'Refer and monitor an intervention',
      href: config.serviceUrls.referAndMonitor.url,
      navEnabled: true,
      enabled: () => true,
      accessibilityHeading: 'Refer and monitor an intervention',
      accessibilityUrl: '/accessibility/refer-and-monitor-an-intervention',
    },
    {
      id: 'transitional-accomodation',
      heading: 'Transitional Accomodation (CAS3)',
      href: config.serviceUrls.transitionalAccomodation.url,
      navEnabled: true,
      enabled: () => true,
      accessibilityHeading: 'Transitional Accommodation (CAS3)',
      accessibilityUrl: '/accessibility/transitional-accomodation',
    },
    {
      id: 'workload-measurement-tool',
      heading: 'Workload Measurement Tool (WMT)',
      href: config.serviceUrls.workloadMeasurementTool.url,
      navEnabled: true,
      enabled: () => userHasRoles([Role.WorkloadMeasurement], roles),
      accessibilityHeading: 'Workload Measurement Tool',
      accessibilityUrl: '/accessibility/workload-measurement-tool',
    },
  ]
    .filter(service => service.enabled())
    .map(service => {
      const { id, heading, href, navEnabled, target, accessibilityHeading, accessibilityUrl } = service
      return { id, heading, href, navEnabled, target, accessibilityHeading, accessibilityUrl }
    })
    .sort((a, b) => (a.heading.toLowerCase() < b.heading.toLowerCase() ? -1 : 1))
}
