export interface UserPassport {
  passport: {
    user: {
      token: string
      username: string
      authSource: 'nomis' | 'delius' | 'auth'
    }
  }
}
