import bunyan, { LogLevel } from 'bunyan'
import bunyanFormat from 'bunyan-format'
import config from './server/config'

const formatOut = bunyanFormat({ outputMode: 'short', color: !config.production })

const logger = bunyan.createLogger({
  name: 'HMPPS Probation Frontend Component Api',
  stream: formatOut,
  level: process.env.LOG_LEVEL as LogLevel,
})

export default logger
