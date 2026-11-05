#!/usr/bin/env python3
"""Playwright smoke + screenshots for 台語小庄頭 v1.1."""
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
      const els = document.querySelectorAll('button, a, h1, h2, .title, .stat-chip, .tool, .msg-bar, .panel-body h2, .tailo');
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

def start_new(page, teacher=False):
    page.goto(BASE, wait_until="networkidle")
    if teacher:
        page.locator("#teacher-mode").check()
    page.get_by_role("button", name="開始新庄頭").click()
    page.wait_for_function("() => window.__taigiTown && window.__taigiTown.seedDemo")

def main():
    report = {"overflow": {}, "ok": True, "notes": []}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.goto(BASE, wait_until="networkidle")
        page.screenshot(path=str(OUT / "home.png"), full_page=True)

        page.get_by_role("button", name="開始新庄頭").click()
        page.wait_for_function("() => window.__taigiTown")
        page.evaluate("""() => {
          const T = window.__taigiTown;
          // roads parallel to starter
          for (let x = 6; x <= 14; x++) T.placeAt(x, 13, 'road');
          for (let y = 8; y <= 14; y++) T.placeAt(9, y, 'road');
          for (let y = 8; y <= 14; y++) T.placeAt(13, y, 'road');
          // zones beside roads
          T.placeAt(8,11,'residential'); T.placeAt(8,12,'residential'); T.placeAt(8,13,'residential');
          T.placeAt(10,12,'residential'); T.placeAt(10,13,'residential');
          T.placeAt(12,12,'commercial'); T.placeAt(12,13,'commercial'); T.placeAt(14,11,'commercial');
          T.placeAt(14,12,'industrial'); T.placeAt(14,13,'industrial');
          T.placeAt(10,10,'fac:market'); T.placeAt(12,10,'fac:breakfast'); T.placeAt(8,10,'fac:temple');
          const s = T.getState();
          for (const [x,y,lv] of [[8,11,1],[8,12,2],[8,13,3],[10,12,2],[10,13,1],[12,12,2],[12,13,1],[14,11,1],[14,12,2],[14,13,1]]) {
            const c = s.cells[y][x]; if (c && c.kind==='zone') c.level = lv;
          }
        }""")
        page.wait_for_timeout(400)
        page.screenshot(path=str(OUT / "town_early.png"))

        page.evaluate("() => window.__taigiTown.seedDemo()")
        page.wait_for_timeout(500)
        page.screenshot(path=str(OUT / "town_grown.png"))

        # close-up of varied buildings
        page.evaluate("() => window.__taigiTown.zoomTo(2.4, 11, 10)")
        page.wait_for_timeout(350)
        page.screenshot(path=str(OUT / "closeup.png"))

        page.evaluate("""() => {
          window.__taigiTown.zoomTo(2.0, 11, 11);
          window.__taigiTown.openCard(10, 7);
        }""")
        page.wait_for_timeout(350)
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
        start_new(page, teacher=True)
        page.evaluate("() => window.__taigiTown.seedDemo()")
        page.locator("#btn-islands").click()
        page.wait_for_timeout(250)
        page.screenshot(path=str(OUT / "teacher.png"))
        page.close()

        page = browser.new_page(viewport={"width": 820, "height": 1180})
        start_new(page)
        page.evaluate("() => window.__taigiTown.seedDemo()")
        page.wait_for_timeout(400)
        page.screenshot(path=str(OUT / "tablet.png"))
        page.close()

        for name, w, h in [
            ("1024x768", 1024, 768), ("1280x800", 1280, 800), ("1366x768", 1366, 768),
            ("1920x1080", 1920, 1080), ("ipad-l", 1180, 820), ("ipad-p", 820, 1180),
        ]:
            page = browser.new_page(viewport={"width": w, "height": h})
            start_new(page)
            page.evaluate("() => { window.__taigiTown.seedDemo(); window.__taigiTown.openCard(10,7); }")
            page.wait_for_timeout(150)
            report["overflow"][name] = overflow_count(page)
            page.close()

        browser.close()

    (OUT / "smoke_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    total = sum(len(v) for v in report["overflow"].values())
    if total > 12:
        raise SystemExit(f"too many overflow issues: {total}")

if __name__ == "__main__":
    main()
