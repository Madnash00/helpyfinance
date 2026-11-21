const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

function load(html) {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assert.equal(scripts.length, 3);
  const sandbox = { atob, ArrayBuffer, Blob, Date, fetch, Response, TextDecoder, TextEncoder, Uint8Array };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  vm.runInContext(scripts[0], context);
  vm.runInContext(scripts[1].replace('window.HFReports=', 'window.report={xlsx,pdf:(data)=>new PDF(data).render()};window.HFReports='), context);
  const startup = 'var bC = document.getElementById("root");';
  assert.ok(scripts[2].includes(startup));
  vm.runInContext(scripts[2].replace(startup, 'window.model={EC,gM,iM,NM,Pn,yM};return;'+startup), context);
  return context;
}

async function main() {
  const [html, directory, original] = process.argv.slice(2);
  if (!html || !directory) throw new Error('Uso: node tests/verify.cjs HTML CARTELLA_EXPORT [BASELINE_ORIGINALE]');
  const source = await fs.readFile(html, 'utf8');
  const app = load(source);
  const legacy = async instance => {
    const response = await instance.fetch('/data/Helpy_PL.xlsx');
    return instance.model.EC(await response.arrayBuffer(), 'Helpy_P&L.xlsx');
  };
  const data = await legacy(app);
  assert.equal(data.movements.length, 3);
  assert.equal(data.annual[0].year, 2026);
  assert.equal(app.model.Pn('(1.234,56 €)'), -1234.56);
  assert.equal(app.model.gM(data.movements, '2026-02-28'), 68.2);
  const [income, license] = data.movements;
  assert.equal(income.amount, 122);
  assert.equal(license.amount, -48.8);
  assert.ok(Math.abs(app.model.yM(license, {}) - 40) < 1e-10);
  for (const vat of [0, 0.04, 0.10, 0.22]) {
    assert.ok(Math.abs(app.model.yM({ amount: -100 * (1 + vat), vat }, {}) - 100) < 1e-10);
  }
  const csv = 'DATA;VALUTA;DARE;AVERE;CAUSALE;CAUSALE ABI;IBAN\n20/02/2026;20/02/2026;0;12,20;Entrata di test;;\n';
  const parsed = () => app.model.EC(new TextEncoder().encode(csv), 'test.csv').movements[0];
  assert.equal(parsed().amount, 12.2);
  assert.equal(app.model.NM(parsed()), app.model.NM(parsed()));
  assert.throws(() => app.model.EC(new TextEncoder().encode('DATA;IMPORTO\n20/02/2026;12'), 'bad.csv'), /Tracciato CSV/);
  assert.ok(app.model.iM({ description: 'Saldo contabile' }));

  const plan = [
    { label: 'FATTURATO (IVA escl.)', budget: 150, forecast: 130, actual: 100 },
    { label: 'Canoni e Licenze', budget: 50, forecast: 60, actual: 45 },
    { label: 'MARGINE NETTO (MON)', budget: 100, forecast: 70, actual: 55 },
  ];
  const report = {
    ...data, year: 2026, plan, summary: { revenue: 100, costs: 45, result: 55, cash: 68.2, balance: 68.2 },
    budget: { revenue: 150, costs: 50, result: 100 },
    forecast: { revenue: 130, costs: 60, result: 70 },
    months: [{ name: 'Gen', label: 'Gen', revenue: 100, costs: 0 }, { name: 'Feb', label: 'Feb', revenue: 0, costs: 45 }],
    categories: [], projects: [{ name: 'Progetto A', count: 3, revenue: 100, costs: 45, result: 55 }],
    rules: [], categoryNames: ['Canoni e Licenze'],
  };
  await fs.mkdir(directory, { recursive: true });
  for (const [extension, blob] of [['xlsx', app.report.xlsx(report)], ['pdf', app.report.pdf(report)]]) {
    await fs.writeFile(path.join(directory, 'verifica.' + extension), new Uint8Array(await blob.arrayBuffer()));
  }
  if (original) {
    const baseline = await fs.readFile(original, 'utf8');
    const result = await legacy(load(baseline));
    assert.ok(result.movements.length > 0 && result.annual.length > 0);
    console.log('Workbook originale letto in locale con il parser della dashboard.');
  }
  console.log('Parser, IVA, saldo, chiavi dei duplicati, errori CSV e generazione report verificati.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
