import { chromium } from 'playwright';
const dir = 'C:/Users/Bat/AppData/Local/Temp/claude/e--Projects-LitStudio-3/93b8e825-8930-42cc-b5f1-6f80820d3671/scratchpad';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 300, height: 700 }, deviceScaleFactor: 2 });
await page.goto('file:///' + dir + '/sidebar-harness.html');
await page.waitForTimeout(300);
await page.screenshot({ path: dir + '/sidebar-default.png', fullPage: true });

await page.addStyleTag({ content: '.row-actions{opacity:1 !important;display:flex !important;}' });
await page.waitForTimeout(150);
await page.screenshot({ path: dir + '/sidebar-hover.png', fullPage: true });

const metrics = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { w: Math.round(r.width), h: Math.round(r.height),
      minH: cs.minHeight, minW: cs.minWidth, pad: cs.padding,
      border: cs.borderTopWidth + ' ' + cs.borderTopStyle,
      bg: cs.backgroundColor, color: cs.color, fontSize: cs.fontSize };
  };
  return {
    accSummary: pick('.acc-summary'),
    accArrow: pick('.acc-arrow'),
    toggleIcon: pick('.toggle-icon'),
    addLink: pick('.add-link'),
    iconBtn: pick('.icon-btn'),
    sceneSelect: pick('.scene-select'),
    chapterToggle: pick('.chapter-toggle'),
    bookRow: pick('.book-row'),
    sceneRow: pick('.scene-row'),
    addBook: pick('.add-book'),
    bookSelect: pick('.book-select'),
  };
});
console.log(JSON.stringify(metrics));
await browser.close();
