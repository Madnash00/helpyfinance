(() => {
  'use strict';

  const backend = new URL('https://script.google.com/macros/s/AKfycbzJ9yRfI3jp_M2oKSVLd2XkjsB8f5GR1lh63cLkJ0x0hLxcN8CS6SqiMWj51WmRhKItSw/exec');
  const pending = new Map();
  let channel, target, peer, peerOrigin, timer, ready, resolveReady;
  let frame, host, next = 0;
  let connected = false;
  let waiting = false;

  function notify() {
    if (!host) return;
    host.querySelector('#hf-drive-auth').hidden = connected || Boolean(timer);
  }

  function begin(mode) {
    clearTimeout(timer);
    channel = crypto.randomUUID();
    backend.searchParams.set('channel', channel);
    backend.searchParams.set('transport', mode);
    if (!waiting) {
      waiting = true;
      ready = new Promise(resolve => { resolveReady = resolve; });
    }
    connected = false;
    peer = null;
    if (mode === 'iframe') {
      frame = document.createElement('iframe');
      frame.hidden = true;
      frame.title = 'Servizio Google Drive';
      frame.src = backend.href;
      document.body.append(frame);
      target = frame.contentWindow;
    } else {
      frame?.remove();
      target = window.open(backend.href, 'HelpyFinanceDrive', 'popup,width=610,height=680');
    }
    timer = setTimeout(() => {
      timer = null;
      // Keep the initial request waiting so reauthorization can resume it.
      notify();
    }, mode === 'iframe' ? 7000 : 12000);
    notify();
  }

  window.addEventListener('message', event => {
    const message = event.data;
    const google = /^https:\/\/(?:script\.google\.com|(?:[a-z0-9-]+-)?script\.googleusercontent\.com)$/;
    if (!target || !message || message.channel !== channel || !google.test(event.origin)) return;
    if (message.type === 'hf-ready' && event.source && isDescendant(event.source, target)) {
      peer = event.source;
      peerOrigin = event.origin;
      connected = true;
      waiting = false;
      clearTimeout(timer);
      timer = null;
      resolveReady();
      notify();
      document.dispatchEvent(new Event('hf-drive-reconnected'));
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

  function isDescendant(window, ancestor) {
    let candidate = window;
    while (candidate) {
      if (candidate === ancestor) return true;
      const parent = candidate.parent;
      if (candidate === parent) return false;
      candidate = parent;
    }
    return false;
  }

  window.HFGithubDrive = {
    mountFeedback(element) {
      if (!element) return;
      host = document.querySelector('.hf-drive-controls');
      element.append(host);
      host.hidden = false;
      host.querySelector('#hf-drive-auth').addEventListener('click', event => {
        event.preventDefault();
        begin('popup');
      });
      notify();
    },
    async request(method, ...args) {
      await ready;
      if (!peer || target?.closed) {
        connected = false;
        notify();
        throw new Error('Autorizza di nuovo Google Drive.');
      }
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
  begin('iframe');
})();
