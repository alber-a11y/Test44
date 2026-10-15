// Usage: node tools/dev/flow.mjs <outdir> <w> <h> '<json steps>'
// steps: [["wait",ms],["click","css or text=..."],["shot","name"],["eval","js"],["tap",x,y]]
import { chromium } from 'playwright';
const [,, out, w, h, stepsJson, query = ''] = process.argv;
const steps = JSON.parse(stepsJson);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, locale: 'ru-RU', hasTouch: false });
const logs = [];
page.on('console', (m) => { if (!m.text().includes('vite')) logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack ?? '').split('\n').slice(0, 5).join(' / ')));
if (process.env.INIT_SAVE) await page.addInitScript((v) => { if (!sessionStorage.getItem('init')) { localStorage.setItem('hearthguard.save.v1', v); sessionStorage.setItem('init', '1'); } }, process.env.INIT_SAVE);
await page.goto('http://localhost:5173/' + query);
for (const s of steps) {
  try {
    if (s[0] === 'wait') await page.waitForTimeout(s[1]);
    else if (s[0] === 'click') await page.locator(s[1]).first().click({ timeout: 5000, force: true });
    else if (s[0] === 'tap') await page.mouse.click(s[1], s[2]);
    else if (s[0] === 'shot') await page.screenshot({ path: `${out}/${s[1]}.png`, animations: 'disabled' });
    else if (s[0] === 'eval') logs.push('EVAL: ' + JSON.stringify(await page.evaluate(s[1])));
    else if (s[0] === 'key') await page.keyboard.press(s[1]);
    else if (s[0] === 'reload') await page.reload();
  } catch (e) { logs.push('STEPERR ' + JSON.stringify(s) + ': ' + e.message.split('\n').slice(0, 12).join(' / ')); }
}
console.log(logs.filter((l) => !l.includes('404')).slice(0, 60).join('\n'));
await browser.close();
