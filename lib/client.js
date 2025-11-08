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
    // Nouveau chemin de session standard (dossier 'auth_info_baileys')
    this.sessionPath = path.join(process.cwd(), 'auth_info_baileys'); 
  }

  async connect() {
    // 1. Assurez-vous que le dossier de session existe
    // Note: Le index.js est maintenant responsable de s'assurer que ce dossier contient la session Mega restaurée.
    if (!fs.existsSync(this.sessionPath)) {
        logger.info('📂 Création du dossier de session: ' + this.sessionPath);
        fs.mkdirSync(this.sessionPath, { recursive: true })
    }

    const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath)
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
      const { connection, lastDisconnect, qr } = update
      
      // Affichage du QR code ou du code de jumelage si nécessaire
      if (qr) {
        logger.info('SCANNER LE QR CODE SUIVANT :');
        // Note: l'application Pterodactyl ne permet pas de scanner un QR ici. 
        // Si vous utilisez le mode code de jumelage, il sera affiché par Baileys.
      }
      
      if (connection === 'open') {
        logger.info('🟢 Clawdeen-MD connecté avec succès ✅')
      } else if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        logger.warn(`🔴 Déconnexion détectée. Code: ${statusCode}`);
        
        if (shouldReconnect) {
          logger.info('♻️ Tentative de reconnexion...');
          await this.connect()
        } else {
          // Si la déconnexion est un LOGGED_OUT (401), la session est morte.
          logger.error('❌ Session terminée (LOGGED OUT). Supprimez le dossier ' + this.sessionPath + ' et redémarrez pour régénérer la session.');
          // À ce stade, vous pourriez appeler stopInstance() ou arrêter le processus.
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