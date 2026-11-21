(() => {
  'use strict';

  const fields = {
    'hf-state': 'state',
    'hf-keyword-rules': 'keywordRules',
    'hf-planning': 'planning',
    'hf-deleted-movements': 'deletedMovements',
    'hf-forecast': 'legacyForecast',
  };

  const status = document.getElementById('hf-drive-status');
  const saveButton = document.getElementById('hf-drive-save');
  const download = document.getElementById('hf-drive-download');
  const seed = document.getElementById('hf-drive-seed');
  const automatic = !!window.HFGithubDrive;
  let saveTimer;
  let retry = 0;
  let data;
  let revision;
  let generation = 0;
  let savedGeneration = 0;
  let saving = false;
  let conflicted = false;

  function call(method, ...args) {
    if (automatic) return window.HFGithubDrive.request(method, ...args);
    return new Promise((resolve, reject) => {
      google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[method](...args);
    });
  }

  function message(text) {
    status.textContent = text;
    if (automatic) status.hidden = !text;
  }

  function validState(state) {
    return state && Array.isArray(state.movements) && Array.isArray(state.annual) &&
      state.movements.every(row => row && typeof row.date === 'string' && typeof row.id === 'string') &&
      state.annual.every(year => year && Array.isArray(year.rows));
  }

  function install(response) {
    if (response.schemaVersion !== 1 || !Number.isSafeInteger(response.revision) || response.revision < 1 ||
        !validState(response.data?.state)) {
      throw new Error('Il database non contiene uno stato Helpy Finance valido. Verifica il file su Drive.');
    }
    data = response.data;
    revision = response.revision;
    seed.hidden = true;
    message(automatic ? '' : 'Drive · Revisione ' + revision);
    return data.state;
  }

  function controls() {
    const changed = generation !== savedGeneration;
    if (saveButton) saveButton.disabled = !changed || saving || conflicted;
    download.hidden = !changed || (automatic && !conflicted && retry < 3);
  }

  function scheduleSave(delay = 650) {
    if (!automatic || saving || conflicted) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, delay);
  }

  window.HFDrive = {
    async load() {
      try {
        const config = await call(automatic ? 'bootstrapDashboard' : 'getBridgeConfig');
        this.reference = config.reference;
        if (!config.initialized) {
          seed.hidden = !config.isOwner;
          throw new Error('Database Drive da inizializzare con un backup Helpy Finance.');
        }
        const state = install(automatic ? config : await call('loadDatabase'));
        if (saveButton) saveButton.hidden = false;
        controls();
        return state;
      } catch (error) {
        message(String(error?.message || error));
        throw error;
      }
    },
    storage: {
      getItem(key) {
        const value = data?.[fields[key]];
        return value == null ? null : JSON.stringify(value);
      },
      setItem(key, value) {
        const field = fields[key];
        if (!field || JSON.stringify(data[field]) === value) return;
        data[field] = JSON.parse(value);
        generation += 1;
        controls();
        if (!saving && !conflicted) {
          retry = 0;
          message(automatic ? '' : 'Drive · Modifiche da salvare');
          scheduleSave();
        }
      },
    },
  };

  async function save() {
    if (saving || conflicted || generation === savedGeneration) return;
    saving = true;
    const snapshot = JSON.parse(JSON.stringify(data));
    const savingGeneration = generation;
    controls();
    if (!automatic) message('Drive · Salvataggio in corso…');
    try {
      const response = await call('saveDatabase', snapshot, revision);
      if (!response?.ok || response.revision !== revision + 1) {
        throw new Error('Risposta di salvataggio inattesa. Scarica la copia prima di ricaricare.');
      }
      revision = response.revision;
      savedGeneration = savingGeneration;
      retry = 0;
      message(automatic ? '' : 'Drive · Revisione ' + revision +
        (generation !== savedGeneration ? ' · Modifiche da salvare' : ' · Salvato'));
    } catch (error) {
      const detail = String(error?.message || error);
      conflicted = detail.includes('CONFLICT');
      retry += 1;
      message(conflicted ? 'Un altro utente ha salvato. Scarica le tue modifiche prima di ricaricare.' : detail);
    } finally {
      saving = false;
      controls();
      if (generation !== savedGeneration && retry < 3) scheduleSave(retry ? 1500 * retry : 650);
    }
  }
  saveButton?.addEventListener('click', save);
  if (automatic) document.addEventListener('hf-drive-reconnected', () => {
    retry = 0;
    if (generation !== savedGeneration) scheduleSave(0);
  });

  download.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.download = 'Helpy-Finance-Backup-Drive.json';
    link.href = url;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  seed.querySelector('input').addEventListener('change', async event => {
    const input = event.currentTarget;
    const file = input.files[0];
    if (!file) return;
    input.disabled = true;
    try {
      const backup = JSON.parse(await file.text());
      const state = backup.state ?? backup.data?.state ?? backup.data;
      if (!validState(state) || (!state.movements.length && !state.annual.length)) {
        throw new Error('Il backup non contiene i movimenti o gli esercizi della dashboard.');
      }
      const source = backup.data?.state ? backup.data : backup;
      const initial = { ...source, state };
      message('Drive · Inizializzazione in corso…');
      install(await call('initializeDatabase', initial));
      message('Database inizializzato. Riapri la Web App per caricare i dati.');
    } catch (error) {
      message(String(error?.message || error));
    } finally {
      input.disabled = false;
      input.value = '';
    }
  });

  window.addEventListener('beforeunload', event => {
    if (generation !== savedGeneration) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
})();
