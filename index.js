const { Client } = require('./lib/client');
const { logger } = require('./lib/logger');
const { stopInstance } = require('./lib/pm2');
const { DATABASE } = require('./lib/database'); // si tu en as une
const { VERSION } = require('./config');
const { restoreSession } = require('./mega'); // Importation de la fonction de restauration de session
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// --- CONFIGURATION DE SESSION LOCALE ---
const SESSION_FOLDER = 'auth_info_baileys'; // Nom du dossier de session standard Baileys
const BOT_DIR = process.env.BOT_NAME || 'Clawdeen-MD';
const SESSION_PATH = path.join(BOT_DIR, SESSION_FOLDER); // Le chemin où la session doit se trouver
// ----------------------------------------

/**
 * Tente de restaurer la session Baileys depuis Mega.nz si elle n'existe pas localement.
 * Cette fonction utilise les variables MEGA_* et SESSION_ID du .env.
 */
async function restoreMegaSession() {
  const MEGA_EMAIL = process.env.MEGA_EMAIL;
  const MEGA_PASSWORD = process.env.MEGA_PASSWORD;
  const SESSION_ID = process.env.SESSION_ID;

  if (fs.existsSync(SESSION_FOLDER)) {
    logger.info(`[MEGA] Dossier de session local trouvé (${SESSION_FOLDER}). Saut de la restauration Mega.`);
    return true;
  }
  
  if (!MEGA_EMAIL || !MEGA_PASSWORD || !SESSION_ID) {
    logger.warn("[MEGA] Les identifiants Mega ou SESSION_ID sont manquants dans .env. Ne peut pas restaurer la session.");
    return false;
  }
  
  logger.info(`[MEGA] Tentative de restauration de la session '${SESSION_ID}' depuis Mega.nz...`);
  
  try {
    // La fonction restoreSession (que vous avez dans mega.js) doit gérer :
    // 1. La connexion à Mega
    // 2. Le téléchargement de la session (généralement un .zip)
    // 3. L'extraction du contenu dans le dossier './auth_info_baileys'
    await restoreSession(SESSION_ID); 
    
    // Après restauration, vérifiez si le dossier a bien été créé
    if (fs.existsSync(SESSION_FOLDER)) {
        logger.info('✅ [MEGA] Session restaurée avec succès !');
        return true;
    } else {
        logger.warn('❌ [MEGA] La fonction de restauration a terminé, mais le dossier de session est toujours manquant. Démarrage en mode jumelage.');
        return false;
    }

  } catch (error) {
    logger.error(`❌ [MEGA] Échec de la restauration de la session : ${error.message}`);
    // Poursuivre le démarrage pour permettre le jumelage par QR/code
    return false; 
  }
}

const start = async () => {
  logger.info(`🩸 Clawdeen-MD ${VERSION || '1.0.0'} - Starting...`);

  // --- NOUVEAU: ÉTAPE 1: GESTION DE LA SESSION MEGA ---
  await restoreMegaSession();

  // Étape 2 : Vérification base de données (si utilisée)
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

  // Étape 3 : Lancement du bot WhatsApp
  try {
    const bot = new Client({
      // Baileys lira automatiquement la session si le dossier existe, sinon il lancera le processus de jumelage.
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