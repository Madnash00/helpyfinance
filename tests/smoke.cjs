const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const sections = [
  'Dashboard', 'Conto economico', 'Movimenti', 'Budget & Forecast',
  'Analisi progetti', 'Anagrafiche', 'Importa / Esporta',
];
const csv = Buffer.from(
  'DATA;VALUTA;DARE;AVERE;CAUSALE;CAUSALE ABI;IBAN\n' +
  '20/02/2026;20/02/2026;0;12,20;Entrata di test;;\n',
);

async function exportFile(page, label, name, directory) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: label }).click(),
  ]);
  await download.saveAs(path.join(directory, name));
}

async function main() {
  const [html, exports, ...workbooks] = process.argv.slice(2);
  if (!html || !exports) throw new Error('Uso: node tests/smoke.cjs HTML CARTELLA_EXPORT [BASELINE RICOSTRUITA]');
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    const remote = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/^https?:/, route => {
      remote.push(route.request().url());
      return route.abort();
    });
    await page.goto(pathToFileURL(path.resolve(html)).href);
    await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor();
    for (const section of sections) {
      await page.getByRole('button', { name: section, exact: true }).click();
      await page.getByRole('heading', { name: section, exact: true }).waitFor();
    }

    await page.getByRole('button', { name: 'Movimenti', exact: true }).click();
    const search = page.getByPlaceholder(/Cerca movimenti/);
    await search.fill('Ricavo dimostrativo');
    await page.getByText('Ricavo dimostrativo', { exact: true }).waitFor();
    assert.equal(await page.getByText('Licenza dimostrativa', { exact: true }).count(), 0);
    await search.clear();

    await page.getByRole('button', { name: 'Tema scuro' }).click();
    await page.reload();
    await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');

    await page.getByRole('button', { name: 'Importa / Esporta', exact: true }).click();
    const upload = page.locator('input[type=file]');
    await upload.setInputFiles({ name: 'test.csv', mimeType: 'text/csv', buffer: csv });
    await page.getByText('1 aggiunte', { exact: true }).waitFor();
    await upload.setInputFiles({ name: 'test.csv', mimeType: 'text/csv', buffer: csv });
    await page.getByText('1 duplicate escluse', { exact: true }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Importa / Esporta', exact: true }).click();

    await fs.mkdir(exports, { recursive: true });
    await exportFile(page, /Workbook Excel/, 'smoke.xlsx', exports);
    await exportFile(page, /Workbook PDF/, 'smoke.pdf', exports);
    await exportFile(page, /Backup completo/, 'smoke.json', exports);
    const backup = JSON.parse(await fs.readFile(path.join(exports, 'smoke.json'), 'utf8'));
    assert.equal(backup.data.movements.length, 4);
    assert.equal(backup.data.movements.find(row => row.description === 'Entrata di test').amount, 12.2);

    for (const width of [1024, 768, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.reload();
      await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(remote, []);

    if (workbooks.length) {
      assert.equal(workbooks.length, 2);
      const originalPage = await browser.newPage();
      const snapshots = [];
      await originalPage.route(/^https?:/, route => route.abort());
      for (const privateHtml of workbooks) {
        await originalPage.goto(pathToFileURL(path.resolve(privateHtml)).href);
        await originalPage.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor();
        snapshots.push(await originalPage.locator('.kpi').allTextContents());
      }
      assert.ok(snapshots[0].length > 0);
      assert.deepEqual(snapshots[0], snapshots[1]);
    }
    console.log('Navigazione, ricerca, tema, CSV, persistenza, backup, export e viewport verificati.');
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
