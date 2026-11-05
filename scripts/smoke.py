#!/usr/bin/env python3
"""Playwright smoke + screenshots for 台語小庄頭."""
from __future__ import annotations
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://127.0.0.1:4175/taigi-town/")
OUT = Path("/workspace/taigi-town/shots")
OUT.mkdir(parents=True, exist_ok=True)

def overflow_count(page):
    return page.evaluate("""() => {
      const bad = [];
      const els = document.querySelectorAll('button, a, h1, h2, .title, .stat-chip, .tool, .msg-bar');
      for (const el of els) {
        if (!(el instanceof HTMLElement)) continue;
        const style = getComputedStyle(el);
        const nowrap = style.whiteSpace === 'nowrap' || el.classList.contains('stat-chip') || el.classList.contains('tool') || el.classList.contains('title');
        if (!nowrap) continue;
        if (el.scrollWidth > el.clientWidth + 2) {
          bad.push({tag: el.tagName, cls: el.className, text: (el.innerText||'').slice(0,40), sw: el.scrollWidth, cw: el.clientWidth});
        }
      }
      return bad;
    }""")

def start_and_seed(page, teacher=False):
    page.goto(BASE, wait_until="networkidle")
    if teacher:
        page.locator("#teacher-mode").check()
    page.get_by_role("button", name="開始新庄頭").click()
    page.wait_for_selector("#map")
    page.wait_for_function("() => window.__taigiTown && window.__taigiTown.seedDemo")
    page.evaluate("() => window.__taigiTown.seedDemo()")
    page.wait_for_timeout(200)

def main():
    report = {"overflow": {}, "ok": True, "notes": []}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.goto(BASE, wait_until="networkidle")
        page.screenshot(path=str(OUT / "home.png"), full_page=True)

        # early town: new game without seed, place a few things via API
        page.get_by_role("button", name="開始新庄頭").click()
        page.wait_for_selector("#map")
        page.wait_for_function("() => window.__taigiTown")
        page.evaluate("""() => {
          const T = window.__taigiTown;
          const s = T.getState();
          // lay a short road and a couple zones
          for (let x = 8; x <= 14; x++) { s.tool='road'; T.placeAt(x, 12, 'road'); }
          for (let x = 8; x <= 14; x++) { s.tool='road'; T.placeAt(x, 10, 'road'); }
          s.tool='residential'; T.placeAt(9,11,'residential'); T.placeAt(10,12,'residential'); T.placeAt(12,12,'residential');
          s.tool='commercial'; T.placeAt(13,12,'commercial');
          s.tool='fac:market'; T.placeAt(9,10,'fac:market');
          s.tool='fac:breakfast'; T.placeAt(13,10,'fac:breakfast');
        }""")
        page.wait_for_timeout(300)
        page.screenshot(path=str(OUT / "town_early.png"))
        page.close()

        # grown demo
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        start_and_seed(page)
        page.screenshot(path=str(OUT / "town_grown.png"))

        # open market card
        page.locator('.tool[data-tool="select"]').click()
        page.evaluate("""() => {
          const s = window.__taigiTown.getState();
          s.selected = {x:10,y:7};
          // trigger card UI via clicking is hard; call open by selecting
        }""")
        # click approximate screen position by finding market via evaluate + dispatch isn't easy;
        # use keyboard-less approach: inject openCard by selecting cell through placeAt select
        page.evaluate("""() => {
          const s = window.__taigiTown.getState();
          s.tool = 'select';
          window.__taigiTown.placeAt(10, 7, 'select');
        }""")
        # manually open panel like the app would — click canvas center then use DOM
        # Force-open by simulating the panel HTML through clicking a known path:
        # Find cell screen pos
        page.evaluate("""() => {
          // reopen via custom event: click side by selecting facility through UI hack
          const s = window.__taigiTown.getState();
          const ev = new CustomEvent('open-card', {detail:{x:10,y:7}});
          // fallback: set selected and rebuild card by clicking map after centering
        }""")
        # Center and click using renderer pick reverse: use page mouse on estimated position
        # Simpler: expose openCard
        page.close()

        # Re-open grown + card with exposed helper
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        start_and_seed(page)
        # patch: call select and open through clicking toolbar + evaluating openCard if we add it
        opened = page.evaluate("""() => {
          const s = window.__taigiTown.getState();
          // locate market
          let target = null;
          for (let y=0;y<24;y++) for (let x=0;x<24;x++) {
            const c = s.cells[y][x];
            if (c.facility === 'market') target = {x,y};
          }
          return target;
        }""")
        print('market at', opened)
        # Use canvas click after computing iso — expose pick reverse
        page.evaluate("""(target) => {
          // Directly build the card panel by dispatching click on a synthetic path:
          const canvas = document.getElementById('map');
          // Approximate: use renderer via temporarily storing
          window.__cardTarget = target;
        }""", opened)
        # Add openCard to window in page
        page.evaluate("""() => {
          const s = window.__taigiTown.getState();
          const t = window.__cardTarget;
          s.selected = t;
          // Trigger UI: find and click by using the same function if exported
        }""")
        # Inject open by clicking the facilities then... better expose from main
        page.close()

        browser.close()

    # Second pass after we expose openCard — do remaining shots in a cleaner script below
    print('partial done, continuing full script...')

if __name__ == '__main__':
    # Full clean version:
    report = {"overflow": {}, "ok": True, "notes": []}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.goto(BASE, wait_until="networkidle")
        page.screenshot(path=str(OUT / "home.png"), full_page=True)

        page.get_by_role("button", name="開始新庄頭").click()
        page.wait_for_function("() => window.__taigiTown")
        page.evaluate("""() => {
          const T = window.__taigiTown; const s = T.getState();
          for (let x = 8; x <= 14; x++) T.placeAt(x, 12, 'road');
          for (let x = 8; x <= 14; x++) T.placeAt(x, 10, 'road');
          T.placeAt(9,11,'residential'); T.placeAt(10,12,'residential'); T.placeAt(12,12,'residential');
          T.placeAt(13,12,'commercial');
          T.placeAt(9,10,'fac:market'); T.placeAt(13,10,'fac:breakfast');
        }""")
        page.wait_for_timeout(250)
        page.screenshot(path=str(OUT / "town_early.png"))

        page.evaluate("() => window.__taigiTown.seedDemo()")
        page.wait_for_timeout(250)
        page.screenshot(path=str(OUT / "town_grown.png"))

        # open card for market via exposed helper
        page.evaluate("() => window.__taigiTown.openCard(10,7)")
        page.wait_for_timeout(200)
        page.screenshot(path=str(OUT / "card.png"))

        page.locator("#btn-tasks").click()
        page.wait_for_timeout(200)
        page.screenshot(path=str(OUT / "tasks.png"))

        page.locator("#btn-save").click()
        page.locator('[data-save="1"]').click()
        page.wait_for_timeout(200)
        page.locator("#btn-export").click()
        report["notes"].append("save+export ok")
        page.close()

        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.goto(BASE, wait_until="networkidle")
        page.locator("#teacher-mode").check()
        page.get_by_role("button", name="開始新庄頭").click()
        page.wait_for_function("() => window.__taigiTown")
        page.evaluate("() => window.__taigiTown.seedDemo()")
        page.locator("#btn-islands").click()
        page.wait_for_timeout(250)
        page.screenshot(path=str(OUT / "teacher.png"))
        page.close()

        page = browser.new_page(viewport={"width": 820, "height": 1180})
        page.goto(BASE, wait_until="networkidle")
        page.get_by_role("button", name="開始新庄頭").click()
        page.wait_for_function("() => window.__taigiTown")
        page.evaluate("() => window.__taigiTown.seedDemo()")
        page.wait_for_timeout(300)
        page.screenshot(path=str(OUT / "tablet.png"))
        page.close()

        for name, w, h in [
            ("1024x768", 1024, 768), ("1280x800", 1280, 800), ("1366x768", 1366, 768),
            ("1920x1080", 1920, 1080), ("ipad-l", 1180, 820), ("ipad-p", 820, 1180),
        ]:
            page = browser.new_page(viewport={"width": w, "height": h})
            page.goto(BASE, wait_until="networkidle")
            page.get_by_role("button", name="開始新庄頭").click()
            page.wait_for_selector("#map")
            page.locator("#btn-tasks").click()
            page.wait_for_timeout(120)
            report["overflow"][name] = overflow_count(page)
            page.close()

        browser.close()

    (OUT / "smoke_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    total = sum(len(v) for v in report["overflow"].values())
    if total > 12:
        raise SystemExit(f"too many overflow issues: {total}")
