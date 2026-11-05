/**
 * Playwright smoke + screenshots for 台語小庄頭
 * Usage: /workspace/pwenv/bin/python is not needed — use node with playwright from pwenv via npx? 
 * Actually use playwright from /workspace/pwenv via a small python script or install playwright for node.
 */
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173/taigi-town/';
const OUT = '/workspace/taigi-town/shots';
mkdirSync(OUT, { recursive: true });

function overflowCount(page) {
  return page.evaluate(() => {
    const bad = [];
    const els = document.querySelectorAll('button, a, h1, h2, .title, .stat-chip, .tool, .task-card .prompt, .msg-bar, .panel-body h2');
    for (const el of els) {
      if (!(el instanceof HTMLElement)) continue;
      if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2) {
        // allow multiline natural wrap; only flag single-line chips/tools
        const style = getComputedStyle(el);
        if (style.whiteSpace === 'nowrap' || el.classList.contains('stat-chip') || el.classList.contains('tool') || el.classList.contains('title')) {
          bad.push({ tag: el.tagName, text: (el.innerText || '').slice(0, 40), sw: el.scrollWidth, cw: el.clientWidth });
        }
      }
    }
    return bad;
  });
}

async function growTown(page) {
  // start new game
  await page.getByRole('button', { name: '開始新庄頭' }).click();
  await page.waitForSelector('#map');
  const canvas = page.locator('#map');
  const box = await canvas.boundingBox();
  // helper: click tool then click near center-ish of canvas multiple times
  async function useTool(name, clicks) {
    await page.locator(`.tool[data-tool="${name}"]`).click();
    for (const [dx, dy] of clicks) {
      await canvas.click({ position: { x: box.width / 2 + dx, y: box.height / 2 + dy } });
      await page.waitForTimeout(40);
    }
  }
  // roads outward from station (centered)
  await useTool('road', [
    [-30, 0], [-50, 10], [-70, 20], [-40, -20], [-20, -30],
    [20, -20], [40, -10], [30, 20], [10, 30], [-10, 40],
    [-60, -10], [-80, 0], [-90, 15], [50, 0], [60, 15],
    [-25, 15], [15, 25], [-45, 30], [0, -40], [25, 40],
  ]);
  await useTool('residential', [
    [-35, -15], [-55, 5], [-15, 20], [5, -25], [-70, 25],
    [35, 10], [-25, 35], [20, -35], [-85, 10], [45, -5],
  ]);
  await useTool('commercial', [
    [-50, -25], [-10, -5], [30, 30], [-40, 15], [10, 15], [55, 20], [-65, -20], [0, 25],
  ]);
  await useTool('industrial', [
    [-75, 35], [40, 40], [-20, 50], [60, 30], [-90, 30], [70, 10],
  ]);
  // facilities via panel
  async function placeFac(label, dx, dy) {
    await page.locator('.tool[data-tool="facilities"]').click();
    await page.getByRole('button', { name: new RegExp(label) }).click();
    await canvas.click({ position: { x: box.width / 2 + dx, y: box.height / 2 + dy } });
    await page.waitForTimeout(80);
  }
  await placeFac('市場', -55, -5);
  await placeFac('學堂', -20, -40);
  await placeFac('旅社', 25, -15);
  await placeFac('早餐店', -35, 25);
  await placeFac('廟口', 10, 40);
  await placeFac('病院', 50, 5);
  await placeFac('心情公園', -80, -25);
  await placeFac('遊樂園', 70, -20);
  await placeFac('公園', -5, 55);
  await placeFac('百業街', 55, 35);
  await placeFac('氣象台', -100, 5);
  await placeFac('派出所', 80, 15);
  await placeFac('親情館', -45, 50);

  // unpause and speed up to grow
  await page.locator('#btn-speed').click(); // x2
  await page.locator('#btn-speed').click(); // x3
  const pause = page.locator('#btn-pause');
  if (await pause.getAttribute('aria-pressed') === 'true') await pause.click();
  await page.waitForTimeout(9000);
  await page.locator('#btn-pause').click(); // pause again for screenshots
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { name: '1024x768', w: 1024, h: 768 },
    { name: '1280x800', w: 1280, h: 800 },
    { name: '1366x768', w: 1366, h: 768 },
    { name: '1920x1080', w: 1920, h: 1080 },
    { name: 'ipad-l', w: 1180, h: 820 },
    { name: 'ipad-p', w: 820, h: 1180 },
  ];

  // home
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.screenshot({ path: join(OUT, 'home.png'), fullPage: true });
    await page.close();
  }

  // main playthrough at 1280
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await growTown(page);
    await page.screenshot({ path: join(OUT, 'town_early.png') });

    // wait more growth for town_grown — speed already x3, unpause briefly
    const pause = page.locator('#btn-pause');
    if (await pause.getAttribute('aria-pressed') === 'true') await pause.click();
    await page.waitForTimeout(14000);
    await page.locator('#btn-pause').click();
    await page.screenshot({ path: join(OUT, 'town_grown.png') });

    // open building card — select tool and click near station/market
    await page.locator('.tool[data-tool="select"]').click();
    const canvas = page.locator('#map');
    const box = await canvas.boundingBox();
    await canvas.click({ position: { x: box.width / 2 - 55, y: box.height / 2 - 5 } });
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, 'card.png') });

    await page.locator('#btn-tasks').click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT, 'tasks.png') });

    // save/load smoke
    await page.locator('#btn-save').click();
    await page.locator('[data-save="1"]').click();
    await page.waitForTimeout(200);
    const toast = page.locator('#toast');
    // export
    await page.locator('#btn-export').click();

    // teacher mode shot: go home, new with teacher
    await page.locator('#btn-home').click();
    page.once('dialog', (d) => d.accept());
    await page.waitForTimeout(100);
    // if still in play, click again after dialog
    await page.waitForSelector('#btn-new', { timeout: 5000 }).catch(() => {});
    await page.close();
  }

  // teacher mode
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.locator('#teacher-mode').check();
    await page.getByRole('button', { name: '開始新庄頭' }).click();
    await page.waitForSelector('#map');
    await page.locator('#btn-islands').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, 'teacher.png') });
    await page.close();
  }

  // tablet portrait
  {
    const page = await browser.newPage({ viewport: { width: 820, height: 1180 } });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: '開始新庄頭' }).click();
    await page.waitForSelector('#map');
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, 'tablet.png') });
    await page.close();
  }

  // overflow checks
  const overflowReport = {};
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: '開始新庄頭' }).click();
    await page.waitForSelector('#map');
    overflowReport[vp.name] = await overflowCount(page);
    await page.close();
  }

  console.log(JSON.stringify({ overflowReport }, null, 2));
  await browser.close();
}

run().catch((e) => { console.error(e); process.exit(1); });
