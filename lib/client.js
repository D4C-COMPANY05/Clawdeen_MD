const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const path = require('path')

// --- CONFIGURATION DES LOGS ---
const logger = P({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
  },
})

class Client {
  constructor(options = {}) {
    this.sessionId = options.sessionId || 'ClawdeenSession'
    this.mode = options.mode || 'public'
    this.owner = options.owner || null
    this.connection = null
    this.state = null
  }

  async connect() {
    const sessionPath = path.join(process.cwd(), 'auth_info', this.sessionId)
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    this.state = state

    logger.info('🔌 Initialisation de la session WhatsApp...')
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger,
      browser: ['Clawdeen-MD', 'Chrome', '1.0.0'],
      version: [2, 3000, 1015901307], // version compatible
    })

    // --- Sauvegarde des credentials ---
    sock.ev.on('creds.update', saveCreds)

    // --- Gestion des connexions / déconnexions ---
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update
      if (connection === 'open') {
        logger.info('🟢 Clawdeen-MD connecté avec succès ✅')
      } else if (connection === 'close') {
        const shouldReconnect =
          lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
        logger.warn('🔴 Déconnexion détectée...')
        if (shouldReconnect) {
          logger.info('♻️ Tentative de reconnexion...')
          await this.connect()
        } else {
          logger.error('❌ Session terminée, supprimez auth_info pour régénérer un QR.')
        }
      }
    })

    // --- Événements des messages ---
    sock.ev.on('messages.upsert', async (m) => {
      try {
        const msg = m.messages[0]
        if (!msg.message) return
        if (msg.key && msg.key.remoteJid === 'status@broadcast') return

        const from = msg.key.remoteJid
        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          ''

        if (text) logger.info(`📩 Message de ${from}: ${text}`)

        // Exemple simple de commande :
        if (text.toLowerCase() === '!ping') {
          await sock.sendMessage(from, { text: 'Pong! 🏓' }, { quoted: msg })
        }
      } catch (err) {
        logger.error('Erreur message :', err)
      }
    })

    this.connection = sock
    return sock
  }
}

module.exports = { Client, logger }
