const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

const source = readFileSync('apps-script/Session.gs', 'utf8');
const owner = 'owner@example.org';
const properties = new Map();
const credential = 'a'.repeat(64);
const digest = createHash('sha256').update(credential).digest('hex');
let reads = 0;
let writes = 0;
let activeUser = 'visitor@example.org';

const backend = {
  HF_API_ONLY: false,
  HF_CONFIG: { OWNER_EMAIL: owner, MAX_PAYLOAD_BYTES: 8192 },
  HF_PROPERTIES: {
    getProperties: () => Object.fromEntries(properties),
    getProperty: key => properties.get(key),
    setProperty: (key, value) => properties.set(key, value),
    deleteProperty: key => properties.delete(key),
  },
  requireAuthorizedUser_: () => {
    if (backend.HF_API_ONLY) throw new Error('ACCESS_DENIED');
    return activeUser;
  },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Utilities: {
    DigestAlgorithm: { SHA_256: 'sha256' },
    Charset: { UTF_8: 'utf8' },
    computeDigest: (algorithm, value, charset) => [...createHash(algorithm).update(value, charset).digest()],
  },
  ContentService: {
    MimeType: { JSON: 'json' },
    createTextOutput: json => ({ setMimeType: () => json }),
  },
  bootstrapFor_: user => {
    assert.equal(user, owner);
    reads++;
    return { revision: 5 };
  },
  saveDatabaseFor_: (user, data, revision) => {
    assert.equal(user, owner);
    assert.equal(data.test, true);
    if (revision !== 5) throw new Error('CONFLICT: stale');
    writes++;
    return { ok: true, revision: 6, fileId: 'private' };
  },
};
runInNewContext(source, backend);
function post(method, token, extra) {
  return JSON.parse(backend.doPost({ postData: { contents: JSON.stringify({ method, token, ...extra }) } }));
}

assert.throws(() => backend.enrollBrowser(digest), /non autorizzato/);
activeUser = owner;
assert.equal(post('bootstrapDashboard', credential).error, 'METHOD_NOT_ALLOWED');
backend.enrollBrowser(digest);
backend.HF_API_ONLY = true;
assert.throws(() => backend.enrollBrowser(digest), /ACCESS_DENIED/);
assert.equal(post('bootstrapDashboard').error, 'SESSION_REQUIRED');
assert.equal(post('bootstrapDashboard', digest).error, 'SESSION_REQUIRED');
assert.equal(post('saveDatabase', 'b'.repeat(64)).error, 'SESSION_REQUIRED');
assert.equal(reads + writes, 0);
assert.deepEqual(post('checkSession', credential), { ok: true });
assert.deepEqual(post('bootstrapDashboard', credential), { ok: true, value: { revision: 5 } });
assert.deepEqual(post('saveDatabase', credential, { data: { test: true }, revision: 5 }), {
  ok: true, value: { ok: true, revision: 6 },
});
assert.equal(post('saveDatabase', credential, { data: { test: true }, revision: 4 }).error, 'CONFLICT');
assert.equal(post('initializeDatabase', credential).error, 'METHOD_NOT_ALLOWED');
properties.set('HF_BROWSER_SESSION_' + digest, '1|' + owner);
assert.equal(post('bootstrapDashboard', credential).error, 'SESSION_REQUIRED');
assert.equal(reads, 1);
assert.equal(writes, 1);
console.log('Sessione Drive verificata con dati di prova.');
