"""Build the Apps Script Bridge.html from the dashboard without any operational data."""

import argparse
import base64
import gzip
import re
from tempfile import TemporaryDirectory
from pathlib import Path

from standalone import ROOT, build, write_new

SHELL = """<!doctype html>
<html lang="it">
<head><meta charset="utf-8"><base target="_top"></head>
<body>
<p id="loading" role="status">Apertura di Helpy Finance…</p>
<script>
(async () => {
  try {
    const binary = Uint8Array.from(atob('@@GZIP@@'), c => c.charCodeAt(0));
    const stream = new Blob([binary]).stream().pipeThrough(new DecompressionStream('gzip'));
    const source = new DOMParser().parseFromString(await new Response(stream).text(), 'text/html');
    const scripts = [...source.querySelectorAll('script')];
    scripts.forEach(script => script.remove());
    document.head.append(...source.head.querySelectorAll('style, link'));
    document.body.replaceChildren(...source.body.childNodes);
    for (const source of scripts) {
      const script = document.createElement('script');
      script.textContent = source.textContent;
      document.body.append(script);
    }
  } catch (error) {
    document.body.textContent = 'Apertura non riuscita. ' + error.message;
  }
})();
</script>
</body>
</html>
"""

TOOLBAR = """<section aria-label="Database Google Drive" style="display:flex;align-items:center;flex-wrap:wrap;gap:.75rem;padding:.6rem 1rem;border-bottom:1px solid #bed2e5;font-size:.875rem">
  <strong id="hf-drive-status" role="status" aria-live="polite">Collegamento a Google Drive…</strong>
  <button type="button" id="hf-drive-save" hidden disabled>Salva su Drive</button>
  <button type="button" id="hf-drive-download" hidden>Scarica modifiche</button>
  <label id="hf-drive-seed" hidden>Inizializza da backup <input type="file" accept=".json,application/json"></label>
</section>"""


def replace_once(source, previous, next_value):
    if source.count(previous) != 1:
        raise ValueError("La baseline non contiene più il punto di integrazione previsto.")
    return source.replace(previous, next_value, 1)


def assemble(source):
    source = re.sub(r'<script>\s*window\.__HF_WORKBOOK_BASE64__=.*?</script>', '', source, count=1, flags=re.S)
    marker = '<div id="root"></div>'
    source = replace_once(source, marker, TOOLBAR + marker + '<script>' +
                          (ROOT / 'apps-script/drive.js').read_text(encoding='utf-8') + '</script>')
    source = replace_once(source, 'var qM = "2026-01-01",\n          sM = 0;',
                          'var qM = "",\n          sM = null;')
    source = replace_once(source, 'return (\n            a >= qM', 'if (sM === null) return null;\n          return (\n            a >= qM')
    start = source.index('            try {\n', source.index('B(localStorage.getItem("hf-dark")'))
    end = source.index('          }, []),', start)
    source = source[:start] + """            window.HFDrive.load()
              .then((W) => {
                te(JSON.parse(window.HFDrive.storage.getItem("hf-keyword-rules") || "{}"));
                le(JSON.parse(window.HFDrive.storage.getItem("hf-planning") || "{}"));
                const reference = window.HFDrive.reference;
                if (reference) { qM = reference.date; sM = reference.amount; }
                const deleted = hfDeletedIds();
                W.movements = W.movements.filter(row => !iM(row) && !deleted.has(row.id));
                r(W);
                u(String(W.annual[0]?.year || "all"));
              })
              .catch((error) => s(String(error?.message || error)))
              .finally(() => l(!1));
""" + source[end:]
    source = re.sub(r'localStorage(?=\.(?:getItem|setItem)\(\s*"hf-(?!dark))', 'window.HFDrive.storage', source)
    source = source.replace('wa.format(M.balance)', '(M.balance === null ? "N/D" : wa.format(M.balance))')
    source = source.replace('d.summary.balance,0,0', "d.summary.balance ?? 'N/D',0,0")
    source = source.replace("Helpy Finance | Dati dimostrativi", "Helpy Finance | Database Google Drive")
    source = source.replace('            "Progetto A",', '            "Equine Formulary",')
    source = source.replace('            "Progetto B",', '            "Unique Feet Fantasy",')
    source = source.replace('<title>Helpy Finance', '<title>Helpy Finance v1.8')
    return source


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--payload", action="store_true", help="Genera solo il JavaScript per il caricatore Apps Script.")
    parser.add_argument("--pages", action="store_true", help="Genera la Web App per GitHub Pages.")
    args = parser.parse_args()
    with TemporaryDirectory() as directory:
        plain = Path(directory) / 'base.html'
        build(plain, None)
        source = assemble(plain.read_text(encoding='utf-8'))
    if args.pages:
        transport = (ROOT / 'pages/transport.js').read_text(encoding='utf-8')
        source = replace_once(source, '<strong id="hf-drive-status"', '<button type="button" id="hf-connect">Collega Google Drive</button><strong id="hf-drive-status"')
        source = replace_once(source, '</section><div id="root"></div>', '</section><div id="root"></div><script>' + transport + '</script>')
        source = replace_once(source, '    return new Promise((resolve, reject) => {\n      google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[method](...args);\n    });', '    return window.HFGithubDrive.request(method, ...args);')
        source = replace_once(source, 'Collegamento a Google Drive…</strong>', 'Collega Google Drive per caricare i dati.</strong>')
    payload = base64.b64encode(gzip.compress(source.encode(), mtime=0)).decode('ascii')
    output = SHELL.replace('@@GZIP@@', payload)
    if args.payload:
        output = output.split('<script>\n', 1)[1].split('</script>', 1)[0]
    write_new(args.output, output.encode('utf-8'))


if __name__ == "__main__":
    main()
