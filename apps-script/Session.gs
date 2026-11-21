const HF_SESSION_PREFIX = 'HF_BROWSER_SESSION_';
const HF_SESSION_TTL = 30 * 24 * 60 * 60 * 1000;

function enrollBrowser(digest) {
  const user = requireAuthorizedUser_();
  if (user !== HF_CONFIG.OWNER_EMAIL || typeof digest !== 'string' || !/^[0-9a-f]{64}$/.test(digest)) {
    throw new Error('Collegamento non autorizzato.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const now = Date.now();
    const properties = HF_PROPERTIES.getProperties();
    for (const key of Object.keys(properties)) {
      if (key.startsWith(HF_SESSION_PREFIX) && Number(properties[key].split("|")[0]) <= now) {
        HF_PROPERTIES.deleteProperty(key);
      }
    }
    HF_PROPERTIES.setProperty(HF_SESSION_PREFIX + digest, (now + HF_SESSION_TTL) + "|" + user);
  } finally {
    lock.releaseLock();
  }
}

function doPost(event) {
  if (!HF_API_ONLY) return sessionJson_({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  try {
    const body = event?.postData?.contents;
    if (typeof body !== 'string' || body.length > HF_CONFIG.MAX_PAYLOAD_BYTES + 4096) {
      return sessionJson_({ ok: false, error: 'INVALID_REQUEST' });
    }
    const request = JSON.parse(body);
    if (!hasBrowserSession_(request?.token)) {
      return sessionJson_({ ok: false, error: 'SESSION_REQUIRED' });
    }

    const user = HF_CONFIG.OWNER_EMAIL;
    switch (request.method) {
      case 'checkSession':
        return sessionJson_({ ok: true });
      case 'bootstrapDashboard':
        return sessionJson_({ ok: true, value: bootstrapFor_(user) });
      case 'saveDatabase': {
        const saved = saveDatabaseFor_(user, request.data, request.revision);
        return sessionJson_({ ok: true, value: { ok: saved.ok, revision: saved.revision } });
      }
      default:
        return sessionJson_({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    }
  } catch (error) {
    const message = String(error?.message || '');
    return sessionJson_({ ok: false, error: message.startsWith('CONFLICT:') ? 'CONFLICT' : 'REQUEST_FAILED' });
  }
}

function hasBrowserSession_(token) {
  if (!HF_CONFIG.OWNER_EMAIL || typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) return false;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token, Utilities.Charset.UTF_8)
    .map(byte => (byte & 255).toString(16).padStart(2, '0')).join('');
  const [expires, email] = (HF_PROPERTIES.getProperty(HF_SESSION_PREFIX + digest) || "").split("|");
  return email === HF_CONFIG.OWNER_EMAIL && Number(expires) > Date.now();
}

function sessionJson_(response) {
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}
