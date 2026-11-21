/**
 * Helpy Finance - backend Google Drive
 *
 * Distribuire come Web App:
 * - Esegui come: Utente che accede all'app web
 * - Chi ha accesso: Chiunque abbia un Account Google
 */


const HF_PROPERTIES = PropertiesService.getScriptProperties();
const HF_OWNER_EMAIL = String(HF_PROPERTIES.getProperty('HF_OWNER_EMAIL') || '').trim().toLowerCase();
const HF_EXTRA_EMAILS = String(HF_PROPERTIES.getProperty('HF_ALLOWED_EMAILS') || '')
  .split(',').map(email => email.trim().toLowerCase()).filter(Boolean);

const HF_CONFIG = Object.freeze({

  APP_NAME: 'Helpy Finance',
  DB_FILE_NAME: 'Helpy-Finance-Database.json',
  DB_FOLDER_NAME: 'Helpy Finance DB',
  DB_FILE_ID_PROPERTY: 'HF_DATABASE_FILE_ID',
  OWNER_EMAIL: HF_OWNER_EMAIL,
  ALLOWED_EMAILS: Object.freeze([HF_OWNER_EMAIL, ...HF_EXTRA_EMAILS].filter(Boolean)),
  MAX_PAYLOAD_BYTES: 8 * 1024 * 1024,
  SCHEMA_VERSION: 1
});


function doGet() {
  requireAuthorizedUser_();
  return HtmlService.createTemplateFromFile('Bridge')
    .evaluate()
    .setTitle('Helpy Finance · Google Drive')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}


function getBridgeConfig() {

  const user = requireAuthorizedUser_();
  const properties = PropertiesService.getScriptProperties();
  const fileId = properties.getProperty(HF_CONFIG.DB_FILE_ID_PROPERTY);
  const date = properties.getProperty('HF_BALANCE_REFERENCE_DATE');
  const rawAmount = properties.getProperty('HF_BALANCE_REFERENCE_AMOUNT');
  const amount = rawAmount === null || !rawAmount.trim() ? NaN : Number(rawAmount);

  return {
    appName: HF_CONFIG.APP_NAME,
    email: user,
    isOwner: user === HF_CONFIG.OWNER_EMAIL,
    initialized: Boolean(fileId),
    reference: /^\d{4}-\d{2}-\d{2}$/.test(date || '') && Number.isFinite(amount) ? { date, amount } : null
  };
}


/**
 * Inizializza il database in una nuova cartella del Drive del proprietario.
 * initialData può essere il contenuto locale della v1.4 da migrare.
 */

function initializeDatabase(initialData) {

  const user = requireAuthorizedUser_();
  if (user !== HF_CONFIG.OWNER_EMAIL) {
    throw new Error('Solo il proprietario può inizializzare il database.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const existingId = properties.getProperty(HF_CONFIG.DB_FILE_ID_PROPERTY);
    if (existingId) {
      const existing = getDatabaseFile_(existingId);
      return buildDatabaseResponse_(readDatabase_(existing), existing);
    }

    const now = new Date().toISOString();
    const database = normalizeDatabase_({
      schemaVersion: HF_CONFIG.SCHEMA_VERSION,
      revision: 1,
      createdAt: now,
      createdBy: user,
      updatedAt: now,
      updatedBy: user,
      data: validateClientData_(initialData)
    });
    const json = JSON.stringify(database);
    assertPayloadSize_(json);

    const folderId = properties.getProperty('HF_DATABASE_FOLDER_ID');
    const folder = folderId
      ? DriveApp.getFolderById(folderId)
      : DriveApp.createFolder(HF_CONFIG.DB_FOLDER_NAME);
    if (!folderId) properties.setProperty('HF_DATABASE_FOLDER_ID', folder.getId());
    const file = folder.createFile(
      HF_CONFIG.DB_FILE_NAME,
      json,
      MimeType.PLAIN_TEXT
    );
    file.setDescription(
      'Database centralizzato di Helpy Finance. Non modificare manualmente.'
    );
    properties.setProperty(HF_CONFIG.DB_FILE_ID_PROPERTY, file.getId());
    return buildDatabaseResponse_(database, file);
  } finally {
    lock.releaseLock();
  }
}


function loadDatabase() {

  requireAuthorizedUser_();
  const file = requireDatabaseFile_();
  return buildDatabaseResponse_(readDatabase_(file), file);
}


/**
 * Salvataggio ottimistico: expectedRevision deve coincidere con la revisione
 * letta dal client, altrimenti la scrittura viene rifiutata.
 */

function saveDatabase(clientData, expectedRevision) {

  const user = requireAuthorizedUser_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const file = requireDatabaseFile_();
    const current = readDatabase_(file);
    const expected = Number(expectedRevision);
    if (!Number.isFinite(expected) || expected !== current.revision) {
      throw new Error(
        'CONFLICT: il database è stato aggiornato da un altro utente. ' +
        'Ricarica i dati prima di salvare.'
      );
    }

    const now = new Date().toISOString();
    const next = normalizeDatabase_({
      schemaVersion: HF_CONFIG.SCHEMA_VERSION,
      revision: current.revision + 1,
      createdAt: current.createdAt,
      createdBy: current.createdBy,
      updatedAt: now,
      updatedBy: user,
      data: validateClientData_(clientData)
    });
    const json = JSON.stringify(next);
    assertPayloadSize_(json);
    file.setContent(json);
    return buildDatabaseResponse_(next, file);
  } finally {
    lock.releaseLock();
  }
}


function getDatabaseStatus() {

  const user = requireAuthorizedUser_();
  const file = requireDatabaseFile_();
  const db = readDatabase_(file);
  return {
    ok: true,
    email: user,
    fileId: file.getId(),
    fileName: file.getName(),
    revision: db.revision,
    updatedAt: db.updatedAt,
    updatedBy: db.updatedBy
  };
}


function createManualBackup() {

  const user = requireAuthorizedUser_();
  const file = requireDatabaseFile_();
  const db = readDatabase_(file);
  const folder = getDatabaseFolder_(file);
  const stamp = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || 'Europe/Rome',
    'yyyyMMdd-HHmmss'
  );
  const backup = folder.createFile(
    'Backup-Helpy-Finance-' + stamp + '-r' + db.revision + '.json',
    JSON.stringify(db),
    MimeType.PLAIN_TEXT
  );
  return {
    ok: true,
    fileId: backup.getId(),
    fileName: backup.getName(),
    createdBy: user
  };
}


function requireAuthorizedUser_() {

  const email = String(Session.getActiveUser().getEmail() || '')
    .trim()
    .toLowerCase();
  if (!email) {
    throw new Error(
      'Account Google non identificato. Distribuisci la Web App con ' +
      '“Esegui come: Utente che accede all’app web” e accedi con Google.'
    );
  }
  if (HF_CONFIG.ALLOWED_EMAILS.indexOf(email) === -1) {
    throw new Error('ACCESS_DENIED: account non autorizzato: ' + email);
  }
  return email;
}


function requireDatabaseFile_() {

  const fileId = PropertiesService.getScriptProperties()
    .getProperty(HF_CONFIG.DB_FILE_ID_PROPERTY);
  if (!fileId) {
    throw new Error(
      'DATABASE_NOT_INITIALIZED: il proprietario deve inizializzare il database.'
    );
  }
  return getDatabaseFile_(fileId);
}


function getDatabaseFile_(fileId) {

  try {
    return DriveApp.getFileById(fileId);
  } catch (error) {
    throw new Error(
      'DATABASE_UNAVAILABLE: file non trovato o account privo di accesso.'
    );
  }
}


function readDatabase_(file) {

  let parsed;
  try {
    parsed = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  } catch (error) {
    throw new Error('DATABASE_CORRUPTED: il file JSON non è leggibile.');
  }
  return normalizeDatabase_(parsed);
}


function normalizeDatabase_(value) {

  const db = value && typeof value === 'object' ? value : {};
  return {
    schemaVersion: Number(db.schemaVersion) || HF_CONFIG.SCHEMA_VERSION,
    revision: Math.max(1, Number(db.revision) || 1),
    createdAt: String(db.createdAt || new Date().toISOString()),
    createdBy: String(db.createdBy || HF_CONFIG.OWNER_EMAIL),
    updatedAt: String(db.updatedAt || new Date().toISOString()),
    updatedBy: String(db.updatedBy || HF_CONFIG.OWNER_EMAIL),
    data: normalizeClientData_(db.data)
  };
}


function normalizeClientData_(value) {

  const source = value && typeof value === 'object' ? value : {};
  // Solo i dati condivisi. Tema scuro e preferenze puramente visive restano locali.
  return {
    state: source.state && typeof source.state === 'object' ? source.state : null,
    keywordRules:
      source.keywordRules && typeof source.keywordRules === 'object'
        ? source.keywordRules
        : {},
    planning:
      source.planning && typeof source.planning === 'object'
        ? source.planning
        : {},
    deletedMovements: Array.isArray(source.deletedMovements)
      ? source.deletedMovements
      : [],
    legacyForecast:
      source.legacyForecast && typeof source.legacyForecast === 'object'
        ? source.legacyForecast
        : {}
  };
}


function validateClientData_(value) {
  const data = normalizeClientData_(value);
  if (!data.state || !Array.isArray(data.state.movements) || !Array.isArray(data.state.annual) ||
      !data.state.movements.every(row => row && typeof row.id === 'string' && typeof row.date === 'string') ||
      !data.state.annual.every(year => year && Array.isArray(year.rows))) {
    throw new Error('INVALID_STATE: formato database Helpy Finance non valido.');
  }
  return data;
}


function buildDatabaseResponse_(database, file) {

  return {
    ok: true,
    fileId: file.getId(),
    fileName: file.getName(),
    schemaVersion: database.schemaVersion,
    revision: database.revision,
    createdAt: database.createdAt,
    createdBy: database.createdBy,
    updatedAt: database.updatedAt,
    updatedBy: database.updatedBy,
    data: database.data
  };
}


function assertPayloadSize_(json) {

  const bytes = Utilities.newBlob(json).getBytes().length;
  if (bytes > HF_CONFIG.MAX_PAYLOAD_BYTES) {
    throw new Error(
      'PAYLOAD_TOO_LARGE: database oltre il limite di ' +
      Math.floor(HF_CONFIG.MAX_PAYLOAD_BYTES / 1024 / 1024) +
      ' MB.'
    );
  }
}


function getDatabaseFolder_(file) {
  const parents = file.getParents();
  if (!parents.hasNext()) throw new Error('Cartella del database non disponibile.');
  return parents.next();
}
