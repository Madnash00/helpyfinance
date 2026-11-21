(() => {
  'use strict';

  const enrollmentUrl = 'https://script.google.com/macros/s/AKfycbzJ9yRfI3jp_M2oKSVLd2XkjsB8f5GR1lh63cLkJ0x0hLxcN8CS6SqiMWj51WmRhKItSw/exec';
  const apiUrl = 'https://script.google.com/macros/s/AKfycbxh4pfCNfVCz_hri5GnzpwNIvocvhdcBfeNNjHm4mTtxE0q4ns_txSvvswk4mCZ19vrNw/exec';
  const storageKey = 'helpyfinance:drive-session';
  let token;
  let enrollment;

  try {
    const stored = localStorage.getItem(storageKey);
    if (/^[0-9a-f]{64}$/.test(stored || '')) token = stored;
  } catch {}

  async function send(method, credential, args = []) {
    if (!apiUrl) throw new Error('Il servizio Google Drive è in fase di configurazione.');
    const [data, revision] = args;
    const response = await fetch(apiUrl, {
      method: 'POST',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ method, token: credential, data, revision }),
    });
    if (!response.ok) throw new Error('Il servizio Google Drive non ha risposto.');
    return response.json();
  }

  function hex(bytes) {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function enroll() {
    const credential = hex(crypto.getRandomValues(new Uint8Array(32)));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(credential));
    const url = new URL(enrollmentUrl);
    url.searchParams.set('transport', 'enroll');
    url.searchParams.set('digest', hex(new Uint8Array(digest)));

    const dialog = document.createElement('dialog');
    const heading = document.createElement('h2');
    heading.textContent = 'Accedi a Helpy Finance';
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = 'Autorizza questo browser per accedere alla dashboard.';
    const link = document.createElement('a');
    link.href = url.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Continua con Google';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Annulla';
    dialog.append(heading, status, link, document.createTextNode(' '), cancel);
    document.body.append(dialog);

    try {
      await new Promise((resolve, reject) => {
        let timer;
        let active = false;
        let attempt = 0;
        function stop(callback, error) {
          clearTimeout(timer);
          active = false;
          callback(error);
        }
        dialog.addEventListener('close', () => stop(reject, new Error('Accesso annullato. Ricarica la pagina per riprovare.')));
        cancel.addEventListener('click', () => dialog.close());
        link.addEventListener('click', () => {
          if (active) return;
          active = true;
          attempt = 0;
          status.textContent = 'Completa l’autorizzazione Google. La dashboard si aprirà qui.';
          async function poll() {
            try {
              const result = await send('checkSession', credential);
              if (!active) return;
              if (result.ok) {
                stop(resolve);
                return;
              }
              if (result.error !== 'SESSION_REQUIRED') throw new Error('Collegamento non disponibile.');
              if (++attempt < 48) {
                timer = setTimeout(poll, 2500);
                return;
              }
              status.textContent = 'La conferma non è arrivata. Seleziona Continua con Google per riprovare.';
            } catch {
              status.textContent = 'Il servizio Google Drive non risponde. Riprova.';
            }
            active = false;
          }
          timer = setTimeout(poll, 2500);
        });
        dialog.showModal();
      });
      token = credential;
      try { localStorage.setItem(storageKey, credential); } catch {}
    } finally {
      dialog.remove();
    }
  }

  function ensureEnrollment() {
    if (!enrollment) enrollment = enroll().finally(() => { enrollment = null; });
    return enrollment;
  }

  window.HFGithubDrive = {
    mountFeedback(element) {
      if (!element) return;
      const feedback = document.querySelector('.hf-drive-controls');
      element.append(feedback);
      feedback.hidden = false;
    },
    async request(method, ...args) {
      if (!apiUrl) throw new Error('Il servizio Google Drive è in fase di configurazione.');
      if (!token) await ensureEnrollment();
      const credential = token;
      let result = await send(method, credential, args);
      if (result.error === 'SESSION_REQUIRED') {
        if (token === credential) await ensureEnrollment();
        result = await send(method, token, args);
      }
      if (result.ok) return result.value;
      if (result.error === 'CONFLICT') throw new Error('CONFLICT: il database è stato aggiornato.');
      throw new Error('Operazione Google Drive non riuscita.');
    },
  };
})();
