// Usage: node tools/dev/shot.mjs "<url query>" out.png [width height waitMs]
import { chromium } from 'playwright';
const [,, query = '', out = 'shot.png', w = '1280', h = '800', wait = '4000'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }).catch(() => chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }));
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack ?? '').split('\n').slice(0, 6).join(' / ')));
await page.goto('http://localhost:5173/' + query);
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
console.log(logs.slice(0, 40).join('\n'));
await browser.close();
