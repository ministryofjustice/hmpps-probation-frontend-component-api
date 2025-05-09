export enum Role {
  Probation = 'PROBATION',
}

export const userHasRoles = (rolesToCheck: string[], userRoles: string[]): boolean => {
  return rolesToCheck.some(role => userRoles.includes(role))
}
