/**
 * @file pageSetup.js
 *
 * Sheet geometry: page size (US Letter or A4) and the margins.
 *
 * ## Why margins cannot live on the sheet's padding
 *
 * The résumé is one long `.resume-paper` block that the print engine slices
 * into pages. Padding on that block is padding on the *block*, not on the
 * *page*: it opens a gap above the first line and below the last one, and
 * nothing anywhere else. So a two-page export used to come out with a proper
 * top margin on page 1 and text starting hard against the paper edge on page 2
 * — the exact symptom of "it makes one long page and then splits it".
 *
 * The only thing that repeats per page is the page box itself, so that is where
 * the margins belong:
 *
 *   - `@page { margin: … }` — applied by the print engine to every sheet, so
 *     page 5 gets the same air as page 1.
 *   - `.resume-paper { padding: 0 }` while printing, so the two do not stack
 *     into a doubled margin on the first page.
 *
 * On screen the reverse holds: there is no page box, so the sheet keeps its
 * padding and matches what the first page will look like. The two are kept
 * numerically identical here, which is also what makes the page-break rulers in
 * the preview land where the real breaks do.
 *
 * ## Full-bleed themes
 *
 * Banner and Sidebar are drawn edge to edge — a colour band across the top, a
 * coloured rail down the left. Side margins would put white gutters around
 * them, so those themes get `side: 0` and keep their own internal gutters.
 * Vertically they still need air on continuation pages, which is what
 * `@page :first { margin-top: 0 }` buys: the band bleeds off the top of page 1,
 * every later page starts with a normal top margin.
 *
 * Everything here is pure — no DOM. `applyPageSetup()` in utils/pdfExporter.js
 * is what puts the generated CSS into the document.
 */

/**
 * @typedef {Object} PageSize
 * @property {string} id
 * @property {string} label
 * @property {string} note     One-line hint for the picker.
 * @property {string} css      Keyword for the `@page size` descriptor.
 * @property {number} widthIn
 * @property {number} heightIn
 */

/**
 * The only two sizes worth offering. Both are named in the `@page` rule by
 * keyword rather than by measurement, so the print engine matches its own
 * paper definition exactly instead of rounding a millimetre value.
 * @type {PageSize[]}
 */
export const PAGE_SIZES = [
  {
    id: 'letter',
    label: 'US Letter',
    note: '8.5 × 11 in. The default in the US and Canada.',
    css: 'Letter',
    widthIn: 8.5,
    heightIn: 11,
  },
  {
    id: 'a4',
    label: 'A4',
    note: '210 × 297 mm. The default nearly everywhere else — narrower and taller than Letter.',
    css: 'A4',
    widthIn: 210 / 25.4,
    heightIn: 297 / 25.4,
  },
];

/** @type {string[]} */
export const PAGE_SIZE_IDS = PAGE_SIZES.map((s) => s.id);

/** @type {Record<string, PageSize>} */
export const PAGE_SIZE_BY_ID = Object.fromEntries(PAGE_SIZES.map((s) => [s.id, s]));

/** @type {string} */
export const DEFAULT_PAGE_SIZE = 'letter';

/**
 * @typedef {Object} MarginPreset
 * @property {string} id
 * @property {string} label
 * @property {number|null} inches `null` means "whatever the theme asks for".
 * @property {string} note
 */

/**
 * Margin presets. "Theme default" is first and is the default: each theme
 * already picks a margin per density, and those choices are part of the design.
 * The other three exist because fitting a CV onto two pages is usually a margin
 * decision, not a font-size one.
 * @type {MarginPreset[]}
 */
export const MARGIN_PRESETS = [
  {
    id: 'theme',
    label: 'Theme default',
    inches: null,
    note: 'The margin the theme picks for the current density.',
  },
  { id: 'narrow', label: 'Narrow', inches: 0.5, note: '0.5 in / 13 mm. Buys roughly two extra lines a page.' },
  { id: 'normal', label: 'Normal', inches: 0.75, note: '0.75 in / 19 mm. The safe default for any printer.' },
  { id: 'wide', label: 'Wide', inches: 1, note: '1 in / 25 mm. Roomy, traditional, costs you a line or two.' },
];

/** @type {string[]} */
export const MARGIN_PRESET_IDS = MARGIN_PRESETS.map((m) => m.id);

/** @type {Record<string, MarginPreset>} */
export const MARGIN_PRESET_BY_ID = Object.fromEntries(MARGIN_PRESETS.map((m) => [m.id, m]));

/** @type {string} */
export const DEFAULT_PAGE_MARGIN = 'theme';

/**
 * Themes drawn to the paper edge. They set `--page-margin: 0` themselves; this
 * list is what tells the print geometry not to fence them in with side margins.
 * @type {string[]}
 */
export const FULL_BLEED_THEMES = ['banner', 'sidebar'];

/** CSS reference pixels per inch. Fixed by the spec, not by the display. */
export const CSS_DPI = 96;

/** Top/bottom air given to a full-bleed theme's continuation pages. */
export const BLEED_EDGE_MARGIN_IN = 0.45;

/** Used when a theme's own margin cannot be measured yet. */
export const FALLBACK_MARGIN_IN = 0.75;

/**
 * @param {string} themeId
 * @returns {boolean} Whether the theme paints to the paper edge.
 */
export function isFullBleed(themeId) {
  return FULL_BLEED_THEMES.includes(themeId);
}

/** Trim float noise so the generated CSS reads like something a human wrote. */
const round = (n) => Math.round(n * 10000) / 10000;

/**
 * @typedef {Object} PageGeometry
 * @property {PageSize} size
 * @property {string} pageMargin      Id of the active margin preset.
 * @property {boolean} bleed          Theme paints to the paper edge.
 * @property {number} widthPx         Sheet width at 96 dpi.
 * @property {number} heightPx        Sheet height at 96 dpi.
 * @property {number} topIn           `@page` top margin, pages 2+.
 * @property {number} bottomIn        `@page` bottom margin, every page.
 * @property {number} sideIn          `@page` left/right margin.
 * @property {number} firstTopIn      `@page :first` top margin.
 * @property {number} padTopIn        On-screen sheet padding, top.
 * @property {number} padSideIn       On-screen sheet padding, left/right.
 * @property {boolean} overridesTheme Whether the sheet padding must be forced.
 */

/**
 * Work out every number the preview and the print stylesheet need.
 *
 * `themeMarginPx` is the theme's own margin, measured off the rendered sheet.
 * It is only consulted for the "Theme default" preset — for the fixed presets
 * the user has already said what they want, so nothing is measured and there is
 * no measure → restyle → measure loop.
 *
 * @param {Object} opts
 * @param {string} [opts.theme]           Active theme id.
 * @param {string} [opts.pageSize]        Page size id.
 * @param {string} [opts.pageMargin]      Margin preset id.
 * @param {number|null} [opts.themeMarginPx] Measured `padding-top` of the sheet.
 * @returns {PageGeometry}
 */
export function resolvePageGeometry({
  theme = '',
  pageSize = DEFAULT_PAGE_SIZE,
  pageMargin = DEFAULT_PAGE_MARGIN,
  themeMarginPx = null,
} = {}) {
  const size = PAGE_SIZE_BY_ID[pageSize] || PAGE_SIZE_BY_ID[DEFAULT_PAGE_SIZE];
  const preset = MARGIN_PRESET_BY_ID[pageMargin] || MARGIN_PRESET_BY_ID[DEFAULT_PAGE_MARGIN];
  const bleed = isFullBleed(theme);

  const measured =
    typeof themeMarginPx === 'number' && Number.isFinite(themeMarginPx) && themeMarginPx >= 0
      ? themeMarginPx / CSS_DPI
      : null;

  // The theme's own value, only meaningful when the preset defers to it.
  const themeIn = measured ?? FALLBACK_MARGIN_IN;

  const base = {
    size,
    pageMargin: preset.id,
    bleed,
    widthPx: Math.round(size.widthIn * CSS_DPI),
    heightPx: Math.round(size.heightIn * CSS_DPI),
  };

  if (bleed) {
    // Sides stay at zero whatever the preset — a gutter beside the rail or
    // around the banner is not a margin, it is a broken layout. The preset
    // still gets a say vertically, which is where the pagination bug lived.
    const v = round(preset.inches ?? BLEED_EDGE_MARGIN_IN);
    return {
      ...base,
      topIn: v,
      bottomIn: v,
      sideIn: 0,
      firstTopIn: 0, // let the band/rail bleed off the top of page one
      padTopIn: 0,
      padSideIn: 0,
      overridesTheme: false,
    };
  }

  const m = round(preset.inches ?? themeIn);
  return {
    ...base,
    topIn: m,
    bottomIn: m,
    sideIn: m,
    firstTopIn: m,
    padTopIn: m,
    padSideIn: m,
    overridesTheme: preset.inches != null,
  };
}

/**
 * Where the printed pages will break, in sheet coordinates.
 *
 * The on-screen sheet is one continuous column: content starts at `padTopIn`
 * and runs to the bottom. Page 1 can hold `height − firstTop − bottom` of it;
 * every later page holds `height − top − bottom`. Walking that gives the y
 * positions the preview draws its rulers at, and the count of them plus one is
 * the page count.
 *
 * It is still an estimate — `break-inside: avoid` on a card can push a break
 * upwards — but it is the same arithmetic the print engine starts from, which
 * the old "total height ÷ 11in" never was.
 *
 * @param {PageGeometry} geom
 * @param {number} contentHeightPx Rendered height of the sheet, unscaled.
 * @param {number} [maxPages=60]   Runaway guard.
 * @returns {number[]} Offsets from the top of the sheet, in px.
 */
export function pageBreakOffsets(geom, contentHeightPx, maxPages = 60) {
  const height = Number(contentHeightPx) || 0;
  if (!geom || height <= 0) return [];

  const pageH = geom.heightPx;
  const firstTop = geom.firstTopIn * CSS_DPI;
  const top = geom.topIn * CSS_DPI;
  const bottom = geom.bottomIn * CSS_DPI;

  const firstRun = pageH - firstTop - bottom;
  const laterRun = pageH - top - bottom;
  if (firstRun <= 1 || laterRun <= 1) return []; // margins swallowed the page

  /** @type {number[]} */
  const offsets = [];
  // Content begins at the sheet's own top padding, which mirrors firstTop.
  let y = geom.padTopIn * CSS_DPI + firstRun;

  // A 2px slack keeps a sheet that ends exactly on the boundary at one page.
  while (y < height - 2 && offsets.length < maxPages) {
    offsets.push(Math.round(y));
    y += laterRun;
  }
  return offsets;
}

/**
 * @param {PageGeometry} geom
 * @param {number} contentHeightPx
 * @returns {number} Estimated page count, minimum 1.
 */
export function estimatePages(geom, contentHeightPx) {
  return pageBreakOffsets(geom, contentHeightPx).length + 1;
}

/**
 * The print stylesheet for the current geometry.
 *
 * Emitted at runtime rather than written into index.css because `@page` takes
 * no custom properties: `margin: var(--x)` inside `@page` is dropped by every
 * engine, so the values have to be baked into the rule text.
 *
 * @param {PageGeometry} geom
 * @returns {string} CSS text.
 */
export function pageSetupCss(geom) {
  const { size, topIn, bottomIn, sideIn, firstTopIn } = geom;

  return `/* Generated from the Page setup controls — see src/data/pageSetup.js */
@page {
  size: ${size.css} portrait;
  margin: ${topIn}in ${sideIn}in ${bottomIn}in ${sideIn}in;
}

/* Page one differs only for full-bleed themes, where the band or rail is meant
   to run off the top edge. Elsewhere this repeats the value above. */
@page :first {
  margin-top: ${firstTopIn}in;
}

@media print {
  /* Margins are the page box's job now; padding here as well would double the
     first page's and leave every other page with none. */
  .resume-paper {
    width: auto !important;
    min-height: 0 !important;
    padding: 0 !important;
  }
}
`;
}
