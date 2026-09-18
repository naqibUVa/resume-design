/**
 * @file pdfExporter.js
 *
 * PDF export.
 *
 * ## Why native print, and not html2canvas + jsPDF
 *
 * The requirement is a *vector* PDF with *clickable links*. Those two things
 * rule out the canvas-screenshot approach that most "export to PDF" snippets
 * use: html2canvas rasterises the DOM to a bitmap, so the text stops being
 * text (unselectable, unsearchable, blurry when zoomed, invisible to the
 * applicant-tracking systems that parse résumés) and every anchor stops being
 * an anchor.
 *
 * The browser's own print pipeline is the only client-side path that produces
 * real vector output with live link annotations. So this module drives that
 * pipeline properly instead of fighting it:
 *
 *   1. The active theme is portalled into `#print-portal`, a sibling of the
 *      React root. That escapes the app's flex + `overflow` containers, which
 *      are the usual reason printed output comes out clipped to one page.
 *   2. `@media print` in `styles/index.css` hides everything except the portal.
 *   3. `document.title` is swapped for the duration of the print, because
 *      Chrome and Edge seed the "Save as PDF" filename from it.
 *   4. `afterprint` restores the title and resolves the promise.
 *
 * The user still confirms in the browser's print sheet — no web page can write
 * a file to disk unattended. `printTips` surfaces the settings that matter
 * ("Destination: Save as PDF", "Margins: Default") so the first attempt comes
 * out right.
 *
 * ## Where the margins come from
 *
 * `@page`, generated at runtime by `applyPageSetup` — not the sheet's padding.
 * Padding only ever pads the first and last page; the page box repeats. The
 * reasoning, and the geometry, live in src/data/pageSetup.js.
 */

import { pageSetupCss, resolvePageGeometry } from '../data/pageSetup.js';

/** @type {string} Id of the print target in index.html. */
export const PRINT_PORTAL_ID = 'print-portal';

/** @type {string} Id of the runtime-generated `@page` stylesheet. */
export const PAGE_SETUP_STYLE_ID = 'rf-page-setup';

/**
 * Put the current page geometry into the document.
 *
 * Appended to `<head>` — after the bundled stylesheet, so its `@page` rule wins
 * over the Letter/0.75in fallback baked into styles/index.css. One element,
 * rewritten in place, so changing the page size does not leak stylesheets.
 *
 * @param {import('../data/pageSetup.js').PageGeometry} geom
 * @returns {void}
 */
export function applyPageSetup(geom) {
  if (typeof document === 'undefined' || !geom) return;

  let el = document.getElementById(PAGE_SETUP_STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = PAGE_SETUP_STYLE_ID;
    document.head.appendChild(el);
  }

  const css = pageSetupCss(geom);
  if (el.textContent !== css) el.textContent = css;
}

/**
 * @typedef {Object} PrintOptions
 * @property {string} [filename] Suggested PDF name, without extension.
 * @property {number} [settleMs=180] Time to let fonts/layout settle first.
 * @property {() => void} [onBefore] Called just before the dialog opens.
 * @property {() => void} [onAfter]  Called once printing finishes or is cancelled.
 */

/**
 * Wait until webfonts have loaded, so the print layout matches the preview.
 *
 * @param {number} timeoutMs Give up after this long and print anyway.
 * @returns {Promise<void>}
 */
function waitForFonts(timeoutMs = 1500) {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
  return Promise.race([
    document.fonts.ready.catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]).then(() => undefined);
}

/**
 * Resolve once the browser reports that printing has ended.
 *
 * Firefox and Safari fire `afterprint`; Chrome fires it too, but only after
 * the modal closes. A timeout backstop keeps the promise from hanging forever
 * if a browser skips the event.
 *
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
function afterPrint(timeoutMs = 60000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener('afterprint', finish);
      if (mql && mql.removeEventListener) mql.removeEventListener('change', onMedia);
      clearTimeout(timer);
      resolve();
    };

    /** @param {MediaQueryListEvent} e */
    const onMedia = (e) => {
      if (!e.matches) finish();
    };

    const mql = typeof window.matchMedia === 'function' ? window.matchMedia('print') : null;
    window.addEventListener('afterprint', finish);
    if (mql && mql.addEventListener) mql.addEventListener('change', onMedia);

    const timer = setTimeout(finish, timeoutMs);
  });
}

/**
 * Render the current résumé to PDF via the browser's print pipeline.
 *
 * @param {PrintOptions} [options]
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function exportToPdf(options = {}) {
  const { filename, settleMs = 180, onBefore, onAfter } = options;

  if (typeof window === 'undefined' || typeof window.print !== 'function') {
    return { ok: false, reason: 'Printing is not available in this environment.' };
  }

  const portal = document.getElementById(PRINT_PORTAL_ID);
  if (!portal || !portal.firstChild) {
    return {
      ok: false,
      reason: 'The preview has not rendered yet. Give it a moment and try again.',
    };
  }

  const originalTitle = document.title;
  const html = document.documentElement;
  const prevMode = html.getAttribute('data-mode');
  const prevColorScheme = html.style.colorScheme;
  const prevBg = document.body.style.backgroundColor;

  try {
    if (typeof onBefore === 'function') onBefore();

    // Chrome/Edge seed the Save-as-PDF filename from document.title.
    if (filename) document.title = filename;

    // Force light mode so Chrome's print canvas never renders dark or black page margins
    html.setAttribute('data-mode', 'light');
    html.style.colorScheme = 'light';
    document.body.style.backgroundColor = '#ffffff';

    await waitForFonts();
    await new Promise((r) => setTimeout(r, settleMs));

    const finished = afterPrint();
    window.print();
    await finished;

    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err && err.message ? err.message : 'Printing failed.' };
  } finally {
    document.title = originalTitle;
    if (prevMode) {
      html.setAttribute('data-mode', prevMode);
    } else {
      html.removeAttribute('data-mode');
    }
    html.style.colorScheme = prevColorScheme;
    document.body.style.backgroundColor = prevBg;
    if (typeof onAfter === 'function') onAfter();
  }
}

/**
 * What the user should set in the print dialog, per browser. Shown in the UI
 * so the first export comes out right instead of with doubled or missing
 * margins.
 *
 * Note the flip from earlier versions: margins must now be left on **Default**,
 * not set to None. The page box carries the margins, and every engine's "None"
 * setting overrides `@page` with zero — which is precisely how you get text
 * printed into the paper edge on page two.
 *
 * @param {string} [sizeLabel] Active page size, named in the tips.
 * @returns {{browser: string, tips: string[]}}
 */
export function printTips(sizeLabel = '') {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isFirefox = /firefox/i.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isEdge = /edg\//i.test(ua);

  const paper = sizeLabel ? `Paper size → ${sizeLabel}, to match Page setup.` : '';

  if (isFirefox) {
    return {
      browser: 'Firefox',
      tips: [
        'Destination → “Save to PDF”.',
        paper,
        'Margins → “Default”. The page setup supplies the real margins; “None” throws them away.',
        'Tick “Print backgrounds” so accent rules and badges survive.',
      ].filter(Boolean),
    };
  }
  if (isSafari) {
    return {
      browser: 'Safari',
      tips: [
        'Use the PDF ▾ menu at the bottom-left → “Save as PDF”.',
        paper || 'Paper size → match the size chosen in Page setup.',
        'Open “Show Details” and set the dialog margins to 0 — the page setup adds its own on top.',
        'Tick “Print backgrounds”.',
      ],
    };
  }
  return {
    browser: isEdge ? 'Edge' : 'Chrome',
    tips: [
      'Destination → “Save as PDF”.',
      paper,
      'More settings → Margins → “Default”. Choosing “None” discards the page margins and prints into the paper edge.',
      'More settings → tick “Background graphics”.',
      'Leave Scale at 100% so the page geometry matches the preview.',
    ].filter(Boolean),
  };
}

/**
 * Export the résumé as a standalone, self-contained HTML file.
 *
 * A useful companion to the PDF: it keeps the links live, weighs a few KB,
 * opens anywhere, and can be re-printed later without the builder — so it
 * carries the same page geometry, or it would re-print with different breaks.
 *
 * @param {string} bodyHtml  `outerHTML` of the rendered résumé.
 * @param {string} title     Document title.
 * @param {string} [cssText] Extra CSS to inline.
 * @param {import('../data/pageSetup.js').PageGeometry} [geom] Page geometry.
 * @returns {string} Complete HTML document.
 */
export function buildStandaloneHtml(bodyHtml, title, cssText = '', geom = null) {
  const g = geom || resolvePageGeometry({});

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f1f5f9; }
  .resume-paper {
    width: ${g.size.widthIn}in; min-height: ${g.size.heightIn}in; margin: 24px auto; background: #fff;
    padding: ${g.padTopIn}in ${g.padSideIn}in;
    box-shadow: 0 12px 32px -12px rgba(15,23,42,.25);
  }
  a { color: inherit; }
  @media print {
    body { background: #fff; }
    .resume-paper { margin: 0; box-shadow: none; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
${pageSetupCss(g)}
${cssText}
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

/**
 * Minimal HTML escaping for values interpolated into the standalone export.
 *
 * @param {string} s
 * @returns {string}
 */
function escapeHtml(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}
