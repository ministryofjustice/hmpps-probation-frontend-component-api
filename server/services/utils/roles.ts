export enum Role {
  AssistantChief = 'LICENCE_ACO',
  CaseAdmin = 'LICENCE_CA',
  DecisionMaker = 'LICENCE_DM',
  MakeRecallDecision = 'MAKE_RECALL_DECISION',
  MakeRecallDecisionPpcs = 'MAKE_RECALL_DECISION_PPCS',
  MakeRecallDecisionSpo = 'MAKE_RECALL_DECISION_SPO',
  ManageAWorkforceAllocate = 'MANAGE_A_WORKFORCE_ALLOCATE',
  ManageSupervisions = 'MANAGE_SUPERVISIONS',
  MardDutyManager = 'MARD_DUTY_MANAGER',
  MardResidentWorker = 'MARD_RESIDENT_WORKER',
  PrepareACase = 'PREPARE_A_CASE',
  ReadOnly = 'LICENCE_READONLY',
  ResponsibleOfficer = 'LICENCE_RO',
  Support = 'NOMIS_BATCHLOAD',
  WorkloadMeasurement = 'WORKLOAD_MEASUREMENT',
}

export const userHasRoles = (rolesToCheck: string[], userRoles: string[]): boolean => {
  return rolesToCheck.some(role => userRoles.includes(role))
}
