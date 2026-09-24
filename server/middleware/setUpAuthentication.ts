import type { Router } from 'express'
import express from 'express'
import passport from 'passport'
import flash from 'connect-flash'
import config from '../config'
import auth from '../authentication/auth'
import { HmppsUser } from '../interfaces/hmppsUser'
import { decodeUserToken, getRequestLogger, setCurrentUser } from '../utils/currentUserContext'

const router = express.Router()

export default function setUpAuth(): Router {
  auth.init()

  router.use(passport.initialize())
  router.use(passport.session())
  router.use(flash())

  router.get('/autherror', (_req, res) => {
    getRequestLogger().warn('Rendering authentication error page')
    res.status(401)
    return res.render('autherror')
  })

  router.get('/sign-in', (req, res, next) => {
    getRequestLogger().info('Starting OAuth sign-in')
    return passport.authenticate('oauth2')(req, res, next)
  })

  router.get('/sign-in/callback', (req, res, next) => {
    getRequestLogger().info('Handling OAuth sign-in callback')
    return passport.authenticate('oauth2', {
      successReturnToOrRedirect: req.session.returnTo || '',
      failureRedirect: '/autherror',
    })(req, res, next)
  })

  const authUrl = config.apis.hmppsAuth.externalUrl
  const authSignOutUrl = `${authUrl}/sign-out?client_id=${config.apis.hmppsAuth.authCodeClientId}&redirect_uri=${config.domain}`

  router.use('/sign-out', (req, res, next) => {
    const requestLogger = getRequestLogger()
    if (req.user) {
      const { token } = req.user as { token?: string }
      if (token) {
        setCurrentUser(decodeUserToken(token))
      }
      requestLogger.info('Signing user out')
      req.logout(err => {
        if (err) return next(err)
        return req.session.destroy(() => res.redirect(authSignOutUrl))
      })
    } else {
      requestLogger.info('Sign-out requested with no authenticated user')
      res.redirect(authSignOutUrl)
    }
  })

  router.use('/account-details', (_req, res) => {
    getRequestLogger().info('Redirecting to account details')
    res.redirect(`${authUrl}/account-details`)
  })

  router.use((req, res, next) => {
    res.locals.user = req.user as HmppsUser
    const token = (req.user as { token?: string } | undefined)?.token
    if (token) {
      setCurrentUser(decodeUserToken(token))
    }
    next()
  })

  return router
}
