/**
 * Playwright smoke + screenshots for 台語小庄頭 v1.1
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
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
        const style = getComputedStyle(el);
        if (style.whiteSpace === 'nowrap' || el.classList.contains('stat-chip') || el.classList.contains('tool') || el.classList.contains('title')) {
          bad.push({ tag: el.tagName, text: (el.innerText || '').slice(0, 40), sw: el.scrollWidth, cw: el.clientWidth });
        }
      }
    }
    return bad;
  });
}

async function startPlay(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '開始新庄頭' }).click();
  await page.waitForSelector('#map');
  await page.waitForFunction(() => window.__taigiTown && window.__taigiTown.getState);
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

  // main playthrough with seeded demo town
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await startPlay(page);

    // early town (starter + a few builds via seed partial — take early before seed)
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, 'town_early.png') });

    // seed full demo
    await page.evaluate(() => window.__taigiTown.seedDemo());
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT, 'town_grown.png') });

    // close-up of varied buildings
    await page.evaluate(() => window.__taigiTown.zoomTo(1.9, 11, 11));
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, 'closeup.png') });

    // reset zoom a bit and open market card
    await page.evaluate(() => {
      window.__taigiTown.zoomTo(1.35, 11, 11);
      window.__taigiTown.openCard(10, 7); // market in seed
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, 'card.png') });

    await page.locator('#btn-tasks').click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT, 'tasks.png') });

    await page.locator('#btn-save').click();
    await page.locator('[data-save="1"]').click();
    await page.waitForTimeout(200);
    await page.locator('#btn-export').click();

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

  // tablet portrait with seeded town
  {
    const page = await browser.newPage({ viewport: { width: 820, height: 1180 } });
    await startPlay(page);
    await page.evaluate(() => window.__taigiTown.seedDemo());
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT, 'tablet.png') });
    await page.close();
  }

  // overflow checks
  const overflowReport = {};
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    await startPlay(page);
    overflowReport[vp.name] = await overflowCount(page);
    // also with card open
    await page.evaluate(() => {
      window.__taigiTown.seedDemo();
      window.__taigiTown.openCard(10, 7);
    });
    await page.waitForTimeout(200);
    const withCard = await overflowCount(page);
    overflowReport[vp.name + '+card'] = withCard;
    await page.close();
  }

  writeFileSync(join(OUT, 'smoke_report.json'), JSON.stringify({ overflowReport }, null, 2));
  console.log(JSON.stringify({ overflowReport }, null, 2));
  await browser.close();
}

run().catch((e) => { console.error(e); process.exit(1); });
