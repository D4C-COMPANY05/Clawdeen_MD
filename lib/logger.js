const pino = require('pino')

/**
 * Logger global utilisé dans tout le projet Clawdeen-MD
 * Utilise pino-pretty pour un affichage lisible et coloré.
 */

const logger = pino({
  level: 'info', // niveaux: 'fatal', 'error', 'warn', 'info', 'debug', 'trace'
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:HH:MM:ss',
      ignore: 'pid,hostname',
      singleLine: true,
    },
  },
})

// --- Quelques helpers pour les couleurs et formats custom ---
logger.success = (msg) => logger.info(`✅ ${msg}`)
logger.warnlog = (msg) => logger.warn(`⚠️ ${msg}`)
logger.errorlog = (msg) => logger.error(`❌ ${msg}`)
logger.startup = (msg) => logger.info(`🚀 ${msg}`)
logger.event = (msg) => logger.info(`💬 ${msg}`)
logger.shutdown = (msg) => logger.warn(`🛑 ${msg}`)

module.exports = { logger }