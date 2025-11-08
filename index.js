const { Client } = require('./lib/client');
const { logger } = require('./lib/logger');
const { stopInstance } = require('./lib/pm2');
const { DATABASE } = require('./lib/database'); // si tu en as une
const { VERSION } = require('./config');
require('dotenv').config();

const start = async () => {
  logger.info(`🩸 Clawdeen-MD ${VERSION || '1.0.0'} - Starting...`);

  // Étape 1 : Vérification base de données (si utilisée)
  if (DATABASE && DATABASE.authenticate) {
    try {
      await DATABASE.authenticate({ retry: { max: 3 } });
      logger.info('✅ Base de données connectée');
    } catch (error) {
      logger.error({
        msg: '❌ Impossible de se connecter à la base de données',
        error: error.message,
        databaseUrl: process.env.DATABASE_URL,
      });
      return stopInstance();
    }
  }

  // Étape 2 : Lancement du bot WhatsApp
  try {
    const bot = new Client({
      sessionId: process.env.SESSION_ID || 'ClawdeenSession',
      mode: process.env.MODE || 'public',
      owner: process.env.OWNER_NUMBER,
    });
    await bot.connect();
    logger.info('🟢 Clawdeen-MD est connecté à WhatsApp');
  } catch (error) {
    logger.error('Erreur lors de la connexion du bot :', error);
  }
};

start();
