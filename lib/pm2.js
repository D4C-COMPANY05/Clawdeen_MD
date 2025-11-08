const { spawnSync } = require('child_process')
const { logger } = require('./logger')

/**
 * Gère les processus PM2 et les arrêts propres du bot Clawdeen-MD
 * Utilisé pour redémarrer, stopper ou détecter les crashs
 */

function stopInstance() {
  try {
    logger.shutdown('Arrêt du bot Clawdeen-MD demandé.')
    spawnSync('pm2', ['delete', 'Clawdeen'], { stdio: 'inherit' })
  } catch (err) {
    logger.errorlog(`Erreur lors de l’arrêt via PM2 : ${err.message}`)
  }
  process.exit(0)
}

function restartInstance() {
  try {
    logger.warnlog('Redémarrage du bot Clawdeen-MD...')
    spawnSync('pm2', ['restart', 'Clawdeen'], { stdio: 'inherit' })
  } catch (err) {
    logger.errorlog(`Erreur lors du redémarrage : ${err.message}`)
  }
}

function startPm2() {
  try {
    logger.startup('Lancement du bot via PM2...')
    spawnSync('pm2', ['start', 'index.js', '--name', 'Clawdeen', '--attach'], {
      stdio: 'inherit',
    })
  } catch (err) {
    logger.errorlog(`Impossible de lancer PM2 : ${err.message}`)
  }
}

process.on('SIGINT', () => {
  logger.shutdown('Processus interrompu manuellement.')
  stopInstance()
})

process.on('uncaughtException', (err) => {
  logger.errorlog(`Erreur non gérée : ${err.message}`)
  stopInstance()
})

module.exports = { stopInstance, restartInstance, startPm2 }