(() => {
  'use strict';
  const backend = new URL('https://script.google.com/macros/s/AKfycbzJ9yRfI3jp_M2oKSVLd2XkjsB8f5GR1lh63cLkJ0x0hLxcN8CS6SqiMWj51WmRhKItSw/exec');
  const button = document.querySelector('#hf-connect');
  const status = document.querySelector('#hf-drive-status');
  const pending = new Map();
  let popup, channel, peer, peerOrigin;
  let ready;
  let resolveReady;
  let next = 0;

  function resetConnection() {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error('Collegamento interrotto. Riconnetti Google Drive e riprova.'));
    }
    pending.clear();
    peer = null;
    ready = new Promise(resolve => { resolveReady = resolve; });
  }
  resetConnection();

  button.addEventListener('click', () => {
    if (popup && !popup.closed) popup.close();
    resetConnection();
    channel = crypto.randomUUID();
    backend.searchParams.set('channel', channel);
    popup = window.open(backend.href, 'HelpyFinanceDrive', 'popup,width=610,height=680');
    status.textContent = popup ? 'Completa il collegamento nella finestra Google.' : 'Consenti i popup e riprova.';
  });

  function googleOrigin(origin) {
    return /^https:\/\/(?:script\.google\.com|(?:[a-z0-9-]+-)?script\.googleusercontent\.com)$/.test(origin);
  }

  window.addEventListener('message', event => {
    const message = event.data;
    if (!popup || !message || message.channel !== channel || !googleOrigin(event.origin)) return;
    if (message.type === 'hf-ready' && event.source?.top === popup) {
      peer = event.source;
      peerOrigin = event.origin;
      button.textContent = 'Riconnetti Google Drive';
      resolveReady();
      return;
    }
    if (event.source !== peer || event.origin !== peerOrigin || message.type !== 'hf-response') return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.ok) request.resolve(message.value);
    else request.reject(new Error(message.error));
  });

  window.HFGithubDrive = {
    async request(method, ...args) {
      await ready;
      if (!peer || !popup || popup.closed) {
        throw new Error('Finestra Google chiusa. Usa Riconnetti Google Drive.');
      }
      return new Promise((resolve, reject) => {
        const id = ++next;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error('Google Drive non ha risposto. Riconnetti e verifica la revisione prima di salvare.'));
        }, 45000);
        pending.set(id, { resolve, reject, timer });
        peer.postMessage({ type: 'hf-request', channel, id, method, args }, peerOrigin);
      });
    },
  };
})();
