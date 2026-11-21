const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const nodes = new Map();
function element(id) {
  if (!nodes.has(id)) {
    nodes.set(id, {
      hidden: true, disabled: false, textContent: '',
      events: {},
      addEventListener(name, listener) { this.events[name] = listener; },
      querySelector() { return element('input'); },
    });
  }
  return nodes.get(id);
}

const state = { movements: [{ id: 'hf-test', date: '2026-01-01', amount: 5 }], annual: [] };
let current = 3;
let rejectAsConflict = false;
const data = { state, planning: {}, keywordRules: {}, deletedMovements: [], legacyForecast: {} };
const google = { script: { run: {
  withSuccessHandler(success) {
    return { withFailureHandler(failure) {
      return {
        getBridgeConfig: () => success({ initialized: true, isOwner: true }),
        loadDatabase: () => success({ ok: true, schemaVersion: 1, revision: current, data: structuredClone(data) }),
        saveDatabase: (snapshot, expectedRevision) => {
          assert.equal(expectedRevision, current);
          assert.equal(snapshot.planning['2026'].budget, 25);
          if (rejectAsConflict) return failure(new Error('CONFLICT'));
          success({ ok: true, revision: ++current });
        },
      };
    } };
  },
} } };

const window = { addEventListener() {} };
vm.runInNewContext(fs.readFileSync('apps-script/drive.js', 'utf8'), {
  window, google, document: { getElementById: element },
});
(async () => {
  const bridge = window.HFDrive;
  assert.equal(bridge.storage.getItem('hf-state'), null);
  assert.equal((await bridge.load()).movements[0].amount, 5);
  const button = element('hf-drive-save');
  assert.equal(button.disabled, true);
  bridge.storage.setItem('hf-planning', '{"2026":{"budget":25}}');
  assert.equal(button.disabled, false);
  await button.events.click();
  assert.equal(current, 4);
  assert.equal(button.disabled, true);
  bridge.storage.setItem('hf-deleted-movements', '["hf-test"]');
  rejectAsConflict = true;
  await button.events.click();
  assert.equal(button.disabled, true);
  assert.equal(element('hf-drive-download').hidden, false);
  assert.equal(bridge.storage.getItem('hf-deleted-movements'), '["hf-test"]');
  console.log('Drive: caricamento, salvataggio revisionato e conservazione delle modifiche in caso di conflitto verificati.');
})().catch(error => { console.error(error); process.exitCode = 1; });
