(() => {
  'use strict';

  const backend = new URL('https://script.google.com/macros/s/AKfycbzJ9yRfI3jp_M2oKSVLd2XkjsB8f5GR1lh63cLkJ0x0hLxcN8CS6SqiMWj51WmRhKItSw/exec');
  const direct = window.parent === window;
  const session = new URLSearchParams(window.location.search).get('hf-session');
  const channel = direct ? crypto.randomUUID() : session;
  const google = /^https:\/\/(?:script\.google\.com|(?:[a-z0-9-]+-)?script\.googleusercontent\.com)$/;
  const pending = new Map();
  const routeKey = 'hf-drive-same-tab';
  let target, peer, peerOrigin, timer, next = 0;
  let resolveReady, rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  ready.catch(() => {});

  function useGoogleSession() {
    try { localStorage.setItem(routeKey, '1'); } catch {}
    backend.searchParams.set('transport', 'host');
    window.location.replace(backend.href);
  }

  function start() {
    if (!direct) {
      if (!/^[0-9a-f-]{36}$/.test(channel || '')) {
        rejectReady(new Error('Apri Helpy Finance dal suo indirizzo ufficiale.'));
        return;
      }
      target = window.parent;
      // Apps Script assigns a variable Google-controlled origin to the sandbox.
      // The hello carries only the page nonce. Financial data uses an exact origin.
      target.postMessage({ type: 'hf-hello', channel }, '*');
      timer = setTimeout(() => rejectReady(new Error('La sessione Google non risponde. Ricarica la pagina.')), 10000);
      return;
    }

    backend.searchParams.set('channel', channel);
    try {
      if (localStorage.getItem(routeKey) === '1') {
        useGoogleSession();
        return;
      }
    } catch {}
    backend.searchParams.set('transport', 'iframe');
    const frame = document.createElement('iframe');
    frame.hidden = true;
    frame.title = 'Servizio Google Drive';
    frame.src = backend.href;
    document.body.append(frame);
    target = frame.contentWindow;
    frame.addEventListener('load', () => {
      if (peer) return;
      clearTimeout(timer);
      timer = setTimeout(useGoogleSession, 750);
    }, { once: true });
    timer = setTimeout(useGoogleSession, 4000);
  }

  function isDescendant(frame, ancestor) {
    while (frame) {
      if (frame === ancestor) return true;
      const parent = frame.parent;
      if (frame === parent) return false;
      frame = parent;
    }
    return false;
  }

  window.addEventListener('message', event => {
    const message = event.data;
    if (!target || !message || message.channel !== channel || !google.test(event.origin)) return;
    if (message.type === 'hf-ready' && !peer &&
        (direct ? isDescendant(event.source, target) : event.source === target)) {
      peer = event.source;
      peerOrigin = event.origin;
      clearTimeout(timer);
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
    mountFeedback(element) {
      if (!element) return;
      const feedback = document.querySelector('.hf-drive-controls');
      element.append(feedback);
      feedback.hidden = false;
    },
    async request(method, ...args) {
      await ready;
      return new Promise((resolve, reject) => {
        const id = ++next;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error('Google Drive non ha risposto.'));
        }, 30000);
        pending.set(id, { resolve, reject, timer });
        peer.postMessage({ type: 'hf-request', channel, id, method, args }, peerOrigin);
      });
    },
  };
  start();
})();
