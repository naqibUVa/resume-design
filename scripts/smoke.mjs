/**
 * @file scripts/smoke.mjs
 *
 * Renders every theme through `react-dom/server`, against the real seed
 * document, and asserts the things a successful `vite build` cannot tell you:
 * that each theme actually emits its sections rather than throwing or silently
 * skipping them, that a link icon appears only where a URL exists, that a
 * `javascript:` URL never reaches an `href`, and that the typography picker is
 * completely inert on its default setting.
 *
 * There is no test framework here on purpose. One file, no dependency beyond
 * what the app already installs, run with:
 *
 *     npm test          (or: node scripts/smoke.mjs)
 *
 * The app is bundled for Node with Vite's own SSR build, so the assertions run
 * against the same module graph the browser gets — including JSX, the Tailwind
 * class strings and every import path.
 */

import { build } from 'vite';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ============================================================
   A very small assertion harness
   ============================================================ */

let passed = 0;
/** @type {string[]} */
const failures = [];

/** @param {string} what @param {unknown} cond */
function ok(what, cond) {
  if (cond) passed += 1;
  else failures.push(what);
}

/** @param {string} what @param {unknown} actual @param {unknown} expected */
function eq(what, actual, expected) {
  if (actual === expected) passed += 1;
  else failures.push(`${what} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

/* ============================================================
   Bundle the app for Node
   ============================================================ */

const tmp = mkdtempSync(join(tmpdir(), 'resume-smoke-'));
const entry = join(tmp, 'entry.jsx');

// The bundle has to land inside the project so that Node can resolve the
// externals (react, lucide-react) from ./node_modules. Written to a temp file
// there, and removed again at the end.
const bundle = join(ROOT, 'node_modules', '.resume-smoke.mjs');

const q = (p) => JSON.stringify(p);

writeFileSync(
  entry,
  `export { renderToStaticMarkup } from 'react-dom/server';
export { createElement } from 'react';
export {
  normalise, computeVisible, computeCounts,
  THEMES, THEME_FAMILIES, SECTION_KEYS, CORE_SECTION_KEYS,
} from ${q(join(ROOT, 'src/context/ResumeContext.jsx'))};
export { default as seed } from ${q(join(ROOT, 'src/data/initialResumeData.json'))};
export {
  SCHEMA_KEYS, SCHEMA_BY_KEY, PROFILE_LINKS, PROFILE_LINK_KEYS, LINK_ICONS, TALK_KINDS,
  LINK_STYLES, LINK_STYLE_VALUES,
} from ${q(join(ROOT, 'src/data/sectionSchemas.js'))};
export {
  FONT_PAIRS, FONT_SCALES, HEAD_FONTS, fontAttrs, fontVars,
} from ${q(join(ROOT, 'src/data/fontStacks.js'))};
export {
  PAGE_SIZES, PAGE_SIZE_IDS, MARGIN_PRESETS, FULL_BLEED_THEMES, CSS_DPI,
  resolvePageGeometry, pageBreakOffsets, estimatePages, pageSetupCss, isFullBleed,
} from ${q(join(ROOT, 'src/data/pageSetup.js'))};
export { BRAND_ICONS } from ${q(join(ROOT, 'src/components/icons/BrandIcons.jsx'))};
export { THEME_COMPONENTS } from ${q(join(ROOT, 'src/components/preview/ResumePreview.jsx'))};
export { PANELS } from ${q(join(ROOT, 'src/App.jsx'))};
`
);

// No `configFile: false` — the project's vite.config.js supplies the React
// plugin, without which none of the .jsx files would even parse.
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

// `build()` returns a single RollupOutput for one input, an array for several.
const output = (Array.isArray(result) ? result[0] : result).output;
const chunk = output.find((o) => o.type === 'chunk');
writeFileSync(bundle, chunk.code);

const app = await import(`file://${bundle}`);
const {
  renderToStaticMarkup,
  createElement,
  normalise,
  computeVisible,
  computeCounts,
  THEMES,
  THEME_FAMILIES,
  SECTION_KEYS,
  CORE_SECTION_KEYS,
  seed,
  SCHEMA_KEYS,
  SCHEMA_BY_KEY,
  PROFILE_LINKS,
  PROFILE_LINK_KEYS,
  LINK_ICONS,
  TALK_KINDS,
  LINK_STYLES,
  LINK_STYLE_VALUES,
  FONT_PAIRS,
  FONT_SCALES,
  HEAD_FONTS,
  fontAttrs,
  fontVars,
  BRAND_ICONS,
  THEME_COMPONENTS,
  PANELS,
  PAGE_SIZES,
  PAGE_SIZE_IDS,
  MARGIN_PRESETS,
  FULL_BLEED_THEMES,
  CSS_DPI,
  resolvePageGeometry,
  pageBreakOffsets,
  estimatePages,
  pageSetupCss,
  isFullBleed,
} = app;

/* ============================================================
   1. The registries agree with each other
   ============================================================ */

eq('18 schema-driven sections', SCHEMA_KEYS.length, 18);
eq('6 hand-written sections', CORE_SECTION_KEYS.length, 6);
eq('24 sections in total', SECTION_KEYS.length, 24);
eq('10 themes', THEMES.length, 10);

ok(
  'every theme id resolves to a component',
  THEMES.every((t) => typeof THEME_COMPONENTS[t.id] === 'function')
);
ok(
  'no component without a theme entry',
  Object.keys(THEME_COMPONENTS).every((id) => THEMES.some((t) => t.id === id))
);
ok('every theme declares a family', THEMES.every((t) => typeof t.family === 'string' && t.family));
eq(
  'the grouped dropdown covers every theme',
  THEME_FAMILIES.reduce((n, g) => n + g.themes.length, 0),
  THEMES.length
);
ok('the LaTeX family holds both ports', THEME_FAMILIES.some((g) => /LaTeX/.test(g.family) && g.themes.length === 2));

[
  'talks',
  'awards',
  'grants',
  'teaching',
  'service',
  'memberships',
  'certifications',
  'patents',
  'languages',
  'volunteering',
  'references',
].forEach((k) => ok(`the ${k} section is registered`, SCHEMA_KEYS.includes(k)));

ok(
  'every schema section has an editor panel',
  SCHEMA_KEYS.every((k) => PANELS.some((p) => p.id === k))
);
ok('every panel declares a sidebar group', PANELS.every((p) => typeof p.group === 'string' && p.group));
ok('every panel has an icon', PANELS.every((p) => typeof p.icon === 'function' || typeof p.icon === 'object'));

ok(
  'presentations offer oral, poster and keynote',
  ['oral', 'poster', 'keynote'].every((v) => TALK_KINDS.some((o) => o.value === v))
);
ok('project links have Code / Paper / Demo icons', Boolean(LINK_ICONS.source && LINK_ICONS.paper && LINK_ICONS.demo));

eq('23 profile link slots', PROFILE_LINKS.length, 23);
ok('every link slot has an icon', PROFILE_LINKS.every((l) => typeof l.icon === 'function' || typeof l.icon === 'object'));
ok('four link slots are shown by default', PROFILE_LINKS.filter((l) => l.core).length === 4);
ok('every link slot has a short name', PROFILE_LINKS.every((l) => typeof l.short === 'string' && l.short));
ok('link slot keys are unique', new Set(PROFILE_LINK_KEYS).size === PROFILE_LINKS.length);

eq('22 brand marks', Object.keys(BRAND_ICONS).length, 22);
ok('every brand mark is a component', Object.values(BRAND_ICONS).every((I) => typeof I === 'function'));
ok(
  'the three the user named are real brand marks',
  ['github', 'linkedin', 'scholar'].every((k) => {
    const slot = PROFILE_LINKS.find((l) => l.key === k);
    return Object.values(BRAND_ICONS).includes(slot.icon);
  })
);

/* ============================================================
   2. Normalisation
   ============================================================ */

const doc = normalise(seed);
const visible = computeVisible(doc);
const counts = computeCounts(doc);

eq('the seed is upgraded to schema 2', doc.schemaVersion, 2);
ok(
  'every profile link slot exists after normalise',
  PROFILE_LINK_KEYS.every((k) => typeof doc.profile.links[k] === 'string')
);
eq('typography defaults to the theme', doc.settings.fontPair, 'theme');
ok('every schema list is an array', SCHEMA_KEYS.every((k) => Array.isArray(doc[k])));
ok('counts cover every list', SCHEMA_KEYS.every((k) => counts[k] && counts[k].total >= 0));
ok('the seed exercises the new sections', SCHEMA_KEYS.every((k) => doc[k].length > 0));

ok('garbage input still normalises', typeof normalise('nonsense').profile.name === 'string');
ok('null still normalises', normalise(null).settings.sectionOrder.length === 24);
eq('an unknown theme falls back', normalise({ settings: { theme: 'nope' } }).settings.theme, 'academic');
eq('a bad accent falls back', normalise({ settings: { accent: 'red' } }).settings.accent, '#4f46e5');
eq('an unknown font pairing falls back', normalise({ settings: { fontPair: 'comic' } }).settings.fontPair, 'theme');

// A document from before the new sections existed must not sprout empty
// headings: the sections may be switched on, but with no items they never
// reach the page.
const legacy = normalise({
  profile: { name: 'Old Doc', about: 'One paragraph.' },
  experience: [{ role: 'Analyst', company: 'Acme', bullets: ['Did a thing.'] }],
  settings: { sectionOrder: ['about', 'experience'] },
});
const legacyVisible = computeVisible(legacy);
eq('a v1 import draws only what it has', legacyVisible.order.join(','), 'about,experience');
eq('a v1 import keeps every section key', legacy.settings.sectionOrder.length, 24);

/* ============================================================
   3. Every theme renders every visible section
   ============================================================ */

/**
 * @param {string} id
 * @param {Object} [d]
 * @param {Object} [v]
 * @returns {string}
 */
const render = (id, d = doc, v = visible) =>
  renderToStaticMarkup(createElement(THEME_COMPONENTS[id], { resume: d, visible: v }));

/** @type {Record<string, string>} */
const html = {};

for (const t of THEMES) {
  let markup = '';
  try {
    markup = render(t.id);
  } catch (err) {
    failures.push(`${t.id}: threw while rendering — ${err.message}`);
    continue;
  }
  html[t.id] = markup;

  ok(`${t.id}: renders a paper`, markup.includes('resume-paper'));
  ok(`${t.id}: shows the name`, markup.includes(doc.profile.name));
  ok(`${t.id}: nothing rendered as "undefined"`, !markup.includes('undefined'));
  ok(`${t.id}: nothing rendered as "[object Object]"`, !markup.includes('[object Object]'));
  ok(`${t.id}: no empty hrefs`, !markup.includes('href=""'));

  visible.order.forEach((key) => {
    ok(`${t.id}: renders the ${key} section`, markup.includes(`data-section="${key}"`));
  });
}

// 24 registered, minus the eleven switched off in the sample file (the seven
// newest, plus certifications, patents, volunteering and references).
eq('the seed draws 13 sections', visible.order.length, 13);
ok(
  'the newest sections ship switched off',
  ['supervision', 'editorial', 'organised', 'datasets', 'media', 'development', 'conferences'].every(
    (k) => doc[k].length > 0 && !visible.order.includes(k)
  )
);

// Switched on, but with nothing in it: the heading must not print on its own.
const emptyPubs = normalise({ ...seed, publications: [] });
ok('an on-but-empty section prints nothing', !computeVisible(emptyPubs).order.includes('publications'));
ok('a section with content does print', visible.order.includes('publications'));

/* ============================================================
   4. Links: icon only when there is a link
   ============================================================ */

const withLink = normalise({
  ...seed,
  projects: [
    { id: 'p1', title: 'Linked Project', description: 'A description.', tech: ['Rust'], source: 'https://github.com/x/y' },
  ],
});
const noLink = normalise({
  ...seed,
  projects: [{ id: 'p1', title: 'Linked Project', description: 'A description.', tech: ['Rust'] }],
});
const withLinkVisible = computeVisible(withLink);
const noLinkVisible = computeVisible(noLink);

for (const t of THEMES) {
  const a = render(t.id, withLink, withLinkVisible);
  const b = render(t.id, noLink, noLinkVisible);

  const countAnchors = (s) => (s.match(/<a /g) || []).length;
  eq(`${t.id}: the URL adds exactly one anchor`, countAnchors(a) - countAnchors(b), 1);
  ok(`${t.id}: the URL is the one that appears`, a.includes('https://github.com/x/y'));
  ok(`${t.id}: no Code label without a URL`, !b.includes('>Code<'));
  ok(`${t.id}: the project still renders without a URL`, b.includes('Linked Project'));
}

// safeHref must swallow anything that is not http(s) or mailto.
const hostile = normalise({
  ...seed,
  // eslint-disable-next-line no-script-url
  projects: [{ id: 'p1', title: 'Hostile', description: '', tech: [], source: 'javascript:alert(1)' }],
});
const hostileHtml = render('tech', hostile, computeVisible(hostile));
ok('a javascript: URL never reaches the page', !hostileHtml.includes('javascript:'));

// An empty contact block must produce no masthead links at all.
const bare = normalise({ profile: { name: 'Bare Name', about: 'Text.' } });
const bareHtml = render('tech', bare, computeVisible(bare));
ok('no mailto: when there is no email', !bareHtml.includes('mailto:'));
ok('the bare document still renders', bareHtml.includes('Bare Name'));

/* ============================================================
   5. The typography picker
   ============================================================ */

ok('13+ pairings offered', FONT_PAIRS.length >= 13);
ok(
  'every real pairing has a body stack',
  FONT_PAIRS.filter((f) => f.id !== 'theme').every((f) => typeof f.body === 'string' && f.body.length > 0)
);
ok('every pairing has a note', FONT_PAIRS.every((f) => typeof f.note === 'string' && f.note.length > 0));

eq('the default opens no gate', fontAttrs({ fontPair: 'theme' })['data-font-body'], undefined);
eq('an unknown pairing is inert', fontAttrs({ fontPair: 'nope' })['data-font-body'], undefined);
eq('missing settings are inert', fontAttrs(undefined)['data-font-body'], undefined);
eq('a real pairing gates the body', fontAttrs({ fontPair: 'georgia' })['data-font-body'], 'georgia');
eq('a real pairing gates the heads', fontAttrs({ fontPair: 'georgia' })['data-font-head'], 'georgia');
eq('the default emits no variables', Object.keys(fontVars({ fontPair: 'theme' })).length, 0);
ok('a real pairing emits a head stack', Boolean(fontVars({ fontPair: 'garamond' })['--rf-head']));

// The heading face is chosen independently of the body: picking one must not
// require or imply the other.
const headOnly = { fontPair: 'theme', fontHead: 'mono-heads' };
eq('a heading face alone leaves the body alone', fontAttrs(headOnly)['data-font-body'], undefined);
eq('a heading face alone gates the heads', fontAttrs(headOnly)['data-font-head'], 'mono-heads');
ok('a heading face alone emits no body stack', !('--rf-body' in fontVars(headOnly)));
ok('a heading face alone emits a head stack', Boolean(fontVars(headOnly)['--rf-head']));
eq(
  'the override beats the pairing it sits on',
  fontVars({ fontPair: 'garamond', fontHead: 'mono-heads' })['--rf-head'],
  fontVars({ fontPair: 'mono-heads' })['--rf-head']
);
ok('every heading face offered has a head stack', HEAD_FONTS.every((f) => typeof f.head === 'string' && f.head));
ok('"pair" is not itself a heading face', !HEAD_FONTS.some((f) => f.id === 'pair'));

// Type size. 1× must leave no trace, so the untouched document is unchanged.
ok('6 size steps', FONT_SCALES.length === 6);
ok('1x is one of them', FONT_SCALES.some((s) => s.value === 1));
ok('1x emits nothing', !('--rf-fs' in fontVars({ fontPair: 'theme', fontScale: 1 })));
eq('a chosen size emits the variable', fontVars({ fontScale: 1.12 })['--rf-fs'], 1.12);
ok('size works without a font choice', Object.keys(fontVars({ fontPair: 'theme', fontScale: 0.88 })).length === 1);
eq('an out-of-range size falls back', normalise({ settings: { fontScale: 4 } }).settings.fontScale, 1);
eq('a string size is coerced', normalise({ settings: { fontScale: '1.06' } }).settings.fontScale, 1.06);
eq('an unknown heading face falls back', normalise({ settings: { fontHead: 'comic' } }).settings.fontHead, 'pair');

const fonted = { ...doc, settings: { ...doc.settings, fontPair: 'garamond' } };
const scaled = { ...doc, settings: { ...doc.settings, fontScale: 1.12 } };
const headed = { ...doc, settings: { ...doc.settings, fontHead: 'mono-heads' } };

for (const t of THEMES) {
  const markup = render(t.id, fonted, visible);
  ok(`${t.id}: honours a chosen pairing`, markup.includes('data-font-body="garamond"'));
  ok(`${t.id}: sets --rf-body with it`, markup.includes('--rf-body'));
  ok(`${t.id}: leaves the paper unmarked by default`, !html[t.id].includes('data-font'));

  // Every type size in every theme has to be scalable, or one control would
  // silently move some of the page and not the rest.
  ok(`${t.id}: type sizes are scalable`, html[t.id].includes('var(--rf-fs,1)'));
  ok(`${t.id}: a chosen size reaches the paper`, render(t.id, scaled, visible).includes('--rf-fs'));

  const headMarkup = render(t.id, headed, visible);
  ok(`${t.id}: a heading face alone opens only its own gate`, headMarkup.includes('data-font-head="mono-heads"'));
  ok(`${t.id}: and leaves the body gate shut`, !headMarkup.includes('data-font-body'));
}

/* ============================================================
   5b. How links print
   ============================================================ */

eq('three link styles', LINK_STYLES.length, 3);
ok('the default is one of them', LINK_STYLE_VALUES.includes('name'));
eq('links default to the name', doc.settings.linkStyle, 'name');
eq('an unknown link style falls back', normalise({ settings: { linkStyle: 'wat' } }).settings.linkStyle, 'name');

const linked = normalise({
  ...seed,
  profile: { ...seed.profile, links: { github: 'https://github.com/yourhandle' } },
});
const linkedVisible = computeVisible(linked);
/** @param {string} style */
const asStyle = (style) => ({ ...linked, settings: { ...linked.settings, linkStyle: style } });

for (const t of THEMES) {
  // Simplistic is deliberately pinned to the address: a résumé parser reads
  // the text node, not the href, so "GitHub" would give it nothing.
  const pinned = t.id === 'simplistic';

  const byName = render(t.id, asStyle('name'), linkedVisible);
  const byShort = render(t.id, asStyle('short'), linkedVisible);
  const byFull = render(t.id, asStyle('full'), linkedVisible);

  ok(`${t.id}: "name" prints the short name`, pinned || byName.includes('>GitHub<'));
  ok(`${t.id}: "name" hides the address`, pinned || !byName.includes('github.com/yourhandle<'));
  ok(`${t.id}: "short" prints the trimmed address`, byShort.includes('github.com/yourhandle'));
  ok(`${t.id}: "short" drops the scheme`, !byShort.includes('>https://github.com'));
  ok(`${t.id}: "full" prints the whole URL`, pinned || byFull.includes('>https://github.com/yourhandle<'));

  // Whatever prints, the anchor still points at the real address — the whole
  // point of the name style is that the PDF stays clickable.
  [byName, byShort, byFull].forEach((markup) => {
    ok(`${t.id}: the href survives every style`, markup.includes('href="https://github.com/yourhandle"'));
  });
  ok(`${t.id}: Simplistic ignores the setting`, !pinned || (byName === byShort && byFull === byShort));
}

/* ============================================================
   6. The two LaTeX ports
   ============================================================ */

ok('Swish keeps the .sty olive', /#88ac0b|#b7cd6d/i.test(html.swish));
ok('Swish keeps the .sty crimson', /#920532/i.test(html.swish));
ok('Swish ignores the accent colour', !html.swish.includes(doc.settings.accent));
ok('Marker follows the accent colour', html.marker.includes(doc.settings.accent));
ok('Marker does not hard-code the crimson', !/#920532/i.test(html.marker));

// Both ports must survive a document that actually has a bibliography — the
// circled-number machinery is the part of the .sty most likely to break.
const withPubs = normalise({
  ...seed,
  publications: [
    { id: 'b1', title: 'A First Paper', authors: [{ full: 'Pathan, N.' }], venue: 'Journal', year: '2024', doi: '10.1/xyz' },
    { id: 'b2', title: 'A Second Paper', authors: [{ full: 'Pathan, N.' }], venue: 'Conference', year: '2025' },
  ],
});
const withPubsVisible = computeVisible(withPubs);

for (const t of THEMES) {
  const markup = render(t.id, withPubs, withPubsVisible);
  ok(`${t.id}: renders a bibliography`, markup.includes('data-section="publications"'));
  ok(`${t.id}: lists both papers`, markup.includes('A First Paper') && markup.includes('A Second Paper'));
  // An author with no first/last split — hand-edited JSON, or a partial
  // import — must still be printed rather than abbreviated into nothing.
  ok(`${t.id}: an unsplit author name survives`, markup.includes('Pathan, N.'));
}

// A `kind` outside the six the grouper knows about must still reach the page.
// Dropping it would be the worst kind of bug in a CV builder: silent, invisible
// in the editor, and only noticed by the person reading your bibliography.
const oddKind = normalise({
  ...seed,
  publications: [
    { id: 'b3', title: 'A Paper Of Unknown Kind', kind: 'preprint', authors: [{ full: 'Pathan, N.' }], venue: 'arXiv', year: '2026' },
  ],
});
const oddKindVisible = computeVisible(oddKind);
for (const t of THEMES) {
  const markup = render(t.id, oddKind, oddKindVisible);
  ok(`${t.id}: an unrecognised publication kind is not dropped`, markup.includes('A Paper Of Unknown Kind'));
}

/* ============================================================
   7. Visibility still does what it says
   ============================================================ */

const sectionOff = {
  ...doc,
  settings: { ...doc.settings, sections: { ...doc.settings.sections, awards: false } },
};
const sectionOffHtml = render('academic', sectionOff, computeVisible(sectionOff));
ok('the sample document does show awards', html.academic.includes('data-section="awards"'));
ok('switching a section off removes it', !sectionOffHtml.includes('data-section="awards"'));

const itemOff = { ...doc, awards: doc.awards.map((a, i) => (i === 0 ? { ...a, include: false } : a)) };
eq(
  'unticking one item drops exactly one',
  computeVisible(itemOff).awards.length,
  visible.awards.length - 1
);
eq('but nothing is deleted', itemOff.awards.length, doc.awards.length);

const renamed = {
  ...doc,
  settings: { ...doc.settings, sectionTitles: { ...doc.settings.sectionTitles, awards: 'Honours & Prizes' } },
};
ok('a renamed heading reaches the page', render('academic', renamed, visible).includes('Honours &amp; Prizes'));

/* ============================================================
   8. Page setup: size, and margins that repeat on every page

   The bug these guard against: margins that live on the sheet's padding show
   up on page one and nowhere else, so a two-page export starts page two hard
   against the paper edge. Everything below is really one assertion — the top
   margin of page five equals the top margin of page one — expressed in the
   several places that has to hold.
   ============================================================ */

eq('two page sizes are offered', PAGE_SIZES.length, 2);
ok('every page size names an @page keyword', PAGE_SIZES.every((s) => /^(Letter|A4)$/.test(s.css)));
ok('A4 is taller and narrower than Letter', PAGE_SIZES[1].heightIn > PAGE_SIZES[0].heightIn && PAGE_SIZES[1].widthIn < PAGE_SIZES[0].widthIn);
ok('the margin presets lead with "theme default"', MARGIN_PRESETS[0].id === 'theme' && MARGIN_PRESETS[0].inches === null);

const letter = resolvePageGeometry({ theme: 'academic', pageSize: 'letter', pageMargin: 'normal' });
const a4 = resolvePageGeometry({ theme: 'academic', pageSize: 'a4', pageMargin: 'normal' });

eq('Letter is 8.5in wide', letter.widthPx, 816);
eq('Letter is 11in tall', letter.heightPx, 1056);
eq('A4 is 210mm wide', a4.widthPx, Math.round((210 / 25.4) * CSS_DPI));
eq('A4 is 297mm tall', a4.heightPx, Math.round((297 / 25.4) * CSS_DPI));

eq('a fixed preset wins over the theme', letter.topIn, 0.75);
eq('…on all four sides', `${letter.topIn} ${letter.bottomIn} ${letter.sideIn}`, '0.75 0.75 0.75');
eq('and page one is no different', letter.firstTopIn, letter.topIn);
eq('the on-screen sheet padding matches, so the preview does not lie', letter.padTopIn, letter.topIn);

const themed = resolvePageGeometry({ theme: 'academic', pageMargin: 'theme', themeMarginPx: 0.9 * CSS_DPI });
eq('"theme default" uses the measured margin', themed.topIn, 0.9);
ok('and does not force the sheet padding', themed.overridesTheme === false);
eq(
  'an unmeasurable theme margin falls back rather than collapsing to zero',
  resolvePageGeometry({ theme: 'academic', pageMargin: 'theme', themeMarginPx: null }).topIn,
  0.75
);

FULL_BLEED_THEMES.forEach((id) => ok(`${id} is a known theme`, THEMES.some((t) => t.id === id)));
const bleedGeom = resolvePageGeometry({ theme: 'banner', pageMargin: 'wide' });
ok('a full-bleed theme is recognised', isFullBleed('banner') && !isFullBleed('academic'));
eq('full-bleed keeps its sides edge to edge', bleedGeom.sideIn, 0);
eq('…lets page one bleed off the top', bleedGeom.firstTopIn, 0);
eq('…but still gives later pages a top margin', bleedGeom.topIn, 1);
eq('…and every page a bottom margin', bleedGeom.bottomIn, 1);
eq(
  'with no preset chosen it falls back to a sane strip of air',
  resolvePageGeometry({ theme: 'sidebar', pageMargin: 'theme' }).topIn,
  0.45
);

// 0.75in margins on Letter leave 9.5in of run per page.
const run = 9.5 * CSS_DPI;
eq('an empty sheet is one page', estimatePages(letter, 0), 1);
eq('a sheet exactly one page long is one page', estimatePages(letter, run + letter.padTopIn * CSS_DPI), 1);
eq('a hair over is two', estimatePages(letter, run + letter.padTopIn * CSS_DPI + 20), 2);
eq('three pages of content are three pages', estimatePages(letter, run * 2.5 + letter.padTopIn * CSS_DPI), 3);
const offsets = pageBreakOffsets(letter, run * 2.5 + letter.padTopIn * CSS_DPI);
eq('the first ruler sits one page down', offsets[0], Math.round(letter.padTopIn * CSS_DPI + run));
eq('and the rulers are a page apart', offsets[1] - offsets[0], run);
eq('a runaway height cannot spin forever', pageBreakOffsets(letter, 1e9).length, 60);

const css = pageSetupCss(a4);
ok('the generated CSS names the paper', css.includes('size: A4 portrait'));
ok('…puts the margins on the page box', /@page \{[^}]*margin: 0\.75in 0\.75in 0\.75in 0\.75in;/s.test(css));
ok('…gives page one its own rule', css.includes('@page :first'));
ok('…and zeroes the sheet padding so the two cannot stack', /@media print \{[\s\S]*padding: 0 !important/.test(css));

const junkPages = normalise({ settings: { pageSize: 'foolscap', pageMargin: 'enormous' } });
eq('a junk page size falls back to Letter', junkPages.settings.pageSize, 'letter');
eq('a junk margin falls back to the theme default', junkPages.settings.pageMargin, 'theme');
ok('the seed document carries a valid page size', PAGE_SIZE_IDS.includes(doc.settings.pageSize));

/* ============================================================
   Report
   ============================================================ */

rmSync(bundle, { force: true });
rmSync(tmp, { recursive: true, force: true });

const total = passed + failures.length;
if (failures.length) {
  console.error(`\n✖  ${failures.length} of ${total} assertions failed:\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(
  `\n✓  ${total} assertions passed — ${THEMES.length} themes × ${SECTION_KEYS.length} sections.\n`
);
