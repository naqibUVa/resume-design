/**
 * @file shots.mjs — see what the themes actually look like, without a browser
 * session and without clicking through ten dropdowns.
 *
 *   npm run shots
 *
 * Writes one standalone HTML page per variant into `.shots/`, and — if Chrome
 * is installed — a PNG beside each one. Open `.shots/index.html` to see them
 * all in a grid.
 *
 * Why this exists. `npm test` proves the markup is *correct*: every section
 * renders, every link is safe, nothing throws. It cannot tell you whether the
 * page is *readable* — whether a heading collides with a date column, whether
 * the brand marks sit level with the text beside them, whether a citation
 * quietly lost its authors. Those are things you have to look at. This turns
 * looking at them into one command.
 *
 * How it works: the same Vite SSR bundle trick as `scripts/smoke.mjs`, then the
 * markup is dropped into a page that links the real built stylesheet from
 * `dist/`. So what you see is the production CSS, not an approximation.
 *
 * Requires a build first (`npm run build`), which `npm run shots` does for you.
 */

import { build } from 'vite';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.shots');
const DIST = join(ROOT, 'dist');

/** Where Chrome tends to live. First hit wins; none is not an error. */
const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

/**
 * The variants to render. Each is one page in `.shots/`.
 *
 * The first block is coverage — one page per theme family so a layout
 * regression shows up. The second is the settings that are hard to eyeball any
 * other way: the type-size extremes, a heading-only font override, and each
 * link style.
 *
 * @type {Array<{id: string, theme: string, note: string, settings?: object}>}
 */
const VARIANTS = [
  { id: 'academic', theme: 'academic', note: 'Classic — serif, ruled headings' },
  { id: 'simplistic', theme: 'simplistic', note: 'ATS-safe — no icons, no colour' },
  { id: 'editorial', theme: 'editorial', note: 'Magazine — display serif, drop cap' },
  { id: 'tech', theme: 'tech', note: 'Modern — tinted header, skill chips' },
  { id: 'sidebar', theme: 'sidebar', note: 'Coloured left rail' },
  { id: 'banner', theme: 'banner', note: 'Full-bleed header, monogram' },
  { id: 'timeline', theme: 'timeline', note: 'Dated vertical rail' },
  { id: 'compact', theme: 'compact', note: 'Two dense columns' },
  { id: 'swish', theme: 'swish', note: 'LaTeX — faithful cv-llt port' },
  { id: 'marker', theme: 'marker', note: 'LaTeX — accent-driven variant' },

  {
    id: 'size-small',
    theme: 'academic',
    note: 'Size: extra small (0.88) + Garamond',
    settings: { fontScale: 0.88, fontPair: 'garamond' },
  },
  {
    id: 'size-large',
    theme: 'tech',
    note: 'Size: extra large (1.2) + Charter body, mono headings',
    settings: { fontScale: 1.2, fontPair: 'charter', fontHead: 'mono-heads' },
  },
  {
    id: 'links-full',
    theme: 'tech',
    note: 'Links: full URL',
    settings: { linkStyle: 'full' },
  },
  {
    id: 'links-short',
    theme: 'tech',
    note: 'Links: short address',
    settings: { linkStyle: 'short' },
  },
];

/* ------------------------------------------------------------------ build */

if (!existsSync(DIST)) {
  console.error('No dist/ yet. Run `npm run build` first — the pages link its stylesheet.');
  process.exit(1);
}

const cssFile = readdirSync(join(DIST, 'assets')).find((f) => f.endsWith('.css'));
if (!cssFile) {
  console.error('No stylesheet in dist/assets. Run `npm run build` again.');
  process.exit(1);
}
const cssHref = `file://${join(DIST, 'assets', cssFile)}`;

const tmp = mkdtempSync(join(tmpdir(), 'resume-shots-'));
const entry = join(tmp, 'entry.jsx');
// Same reason as in smoke.mjs: the bundle must sit inside the project so Node
// resolves react and lucide-react from ./node_modules.
const bundle = join(ROOT, 'node_modules', '.resume-shots.mjs');
const q = (p) => JSON.stringify(p);

writeFileSync(
  entry,
  `export { renderToStaticMarkup } from 'react-dom/server';
export { createElement } from 'react';
export { normalise, computeVisible } from ${q(join(ROOT, 'src/context/ResumeContext.jsx'))};
export { default as seed } from ${q(join(ROOT, 'src/data/initialResumeData.json'))};
export { THEME_COMPONENTS } from ${q(join(ROOT, 'src/components/preview/ResumePreview.jsx'))};
`
);

const result = await build({
  root: ROOT,
  logLevel: 'error',
  build: {
    write: false,
    ssr: entry,
    target: 'node18',
    minify: false,
    rollupOptions: {
      external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime', 'lucide-react'],
    },
  },
});

const output = (Array.isArray(result) ? result[0] : result).output;
writeFileSync(bundle, output.find((o) => o.type === 'chunk').code);

const { renderToStaticMarkup, createElement, normalise, computeVisible, seed, THEME_COMPONENTS } =
  await import(`file://${bundle}`);

/* ----------------------------------------------------------------- render */

mkdirSync(OUT, { recursive: true });

/**
 * Turn a theme's markup into a standalone page.
 *
 * @param {string} title
 * @param {string} markup
 * @returns {string}
 */
const page = (title, markup) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<link rel="stylesheet" href="${cssHref}">
<style>
  /* The app scales the paper to fit a pane. Here it is shown at full size on a
     grey backdrop, which is closer to what the PDF will look like. */
  body { margin: 0; padding: 24px; background: #e5e7eb; }
  .resume-paper { margin: 0 auto; box-shadow: 0 10px 40px rgb(0 0 0 / 0.18); }
</style>
</head>
<body>${markup}</body>
</html>
`;

const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
const made = [];

for (const v of VARIANTS) {
  const doc = normalise({
    ...seed,
    settings: { ...seed.settings, ...(v.settings || {}), theme: v.theme },
  });
  const Component = THEME_COMPONENTS[v.theme];
  const markup = renderToStaticMarkup(
    createElement(Component, { resume: doc, visible: computeVisible(doc) })
  );

  const htmlPath = join(OUT, `${v.id}.html`);
  writeFileSync(htmlPath, page(`${v.id} — ${v.note}`, markup));

  let png = null;
  if (chrome) {
    png = join(OUT, `${v.id}.png`);
    try {
      execFileSync(
        chrome,
        [
          '--headless',
          '--disable-gpu',
          '--hide-scrollbars',
          '--allow-file-access-from-files',
          '--window-size=900,2400',
          `--screenshot=${png}`,
          `file://${htmlPath}`,
        ],
        { stdio: 'ignore', timeout: 60_000 }
      );
    } catch {
      // A missing screenshot is a nuisance, not a failure — the HTML is there.
      png = null;
    }
  }
  made.push({ ...v, png: png ? `${v.id}.png` : null });
  console.log(`  ${v.id.padEnd(14)} ${png ? 'html + png' : 'html'}  — ${v.note}`);
}

/* ------------------------------------------------------------ contact sheet */

writeFileSync(
  join(OUT, 'index.html'),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Résumé builder — rendered themes</title>
<style>
  body { margin: 0; padding: 32px; background: #111827; color: #e5e7eb;
         font: 14px/1.5 -apple-system, system-ui, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p.lede { margin: 0 0 28px; color: #9ca3af; }
  .grid { display: grid; gap: 24px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
  figure { margin: 0; }
  figure img { width: 100%; display: block; border-radius: 6px; background: #fff; }
  figcaption { padding-top: 8px; }
  b { color: #fff; }
  span { color: #9ca3af; }
  a { color: #93c5fd; }
</style>
</head>
<body>
<h1>Rendered themes</h1>
<p class="lede">Production CSS, server-rendered from the sample document. Click a title for the full page.</p>
<div class="grid">
${made
  .map(
    (m) => `  <figure>
    ${m.png ? `<a href="${m.id}.html"><img src="${m.png}" alt="${m.id}"></a>` : ''}
    <figcaption><b><a href="${m.id}.html">${m.id}</a></b><br><span>${m.note}</span></figcaption>
  </figure>`
  )
  .join('\n')}
</div>
</body>
</html>
`
);

rmSync(bundle, { force: true });
rmSync(tmp, { recursive: true, force: true });

console.log(`\n${made.length} pages in .shots/ — open .shots/index.html`);
if (!chrome) console.log('No Chrome found, so no PNGs. The HTML pages open in any browser.');
