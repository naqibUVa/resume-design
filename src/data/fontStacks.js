/**
 * @file fontStacks.js
 *
 * The font pairings offered by the typography picker.
 *
 * Every stack is built from fonts that are already on the machine. Nothing here
 * is fetched from a CDN, for two reasons: the app is meant to run offline from
 * `start.sh`, and a webfont that has not finished loading when the print dialog
 * opens produces a PDF set in the fallback — silently, and only sometimes.
 * Local fonts cannot do that.
 *
 * Each pairing names a `body` and a `head` stack. Choosing "Theme default"
 * leaves both unset, so each theme keeps the typography it was designed with;
 * that is the default and the recommended setting.
 */

/**
 * @typedef {Object} FontPair
 * @property {string} id
 * @property {string} label
 * @property {string} note   One-line description shown in the picker.
 * @property {string} [body] CSS font-family list, or undefined for "theme default".
 * @property {string} [head]
 */

const SANS_TAIL = 'ui-sans-serif, system-ui, sans-serif';
const SERIF_TAIL = 'ui-serif, Georgia, serif';
const MONO_TAIL = 'ui-monospace, monospace';

/** @type {FontPair[]} */
export const FONT_PAIRS = [
  {
    id: 'theme',
    label: 'Theme default',
    note: 'Whatever the selected theme was designed with.',
  },
  {
    id: 'inter',
    label: 'Inter / system sans',
    note: 'Clean neutral sans throughout. The safest modern choice.',
    body: `Inter, "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ${SANS_TAIL}`,
    head: `Inter, "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ${SANS_TAIL}`,
  },
  {
    id: 'helvetica',
    label: 'Helvetica / Arial',
    note: 'The classic grotesque. Installed everywhere, prints predictably.',
    body: `"Helvetica Neue", Helvetica, Arial, "Liberation Sans", ${SANS_TAIL}`,
    head: `"Helvetica Neue", Helvetica, Arial, "Liberation Sans", ${SANS_TAIL}`,
  },
  {
    id: 'calibri',
    label: 'Calibri / Carlito',
    note: 'Humanist sans. What most résumé parsers were tested against.',
    body: `Calibri, Carlito, "Segoe UI", "Helvetica Neue", Arial, ${SANS_TAIL}`,
    head: `Calibri, Carlito, "Segoe UI", "Helvetica Neue", Arial, ${SANS_TAIL}`,
  },
  {
    id: 'georgia',
    label: 'Georgia',
    note: 'Warm screen serif with sturdy numerals. Reads well at small sizes.',
    body: `Georgia, "Iowan Old Style", "Times New Roman", ${SERIF_TAIL}`,
    head: `Georgia, "Iowan Old Style", "Times New Roman", ${SERIF_TAIL}`,
  },
  {
    id: 'palatino',
    label: 'Palatino',
    note: 'Calligraphic old-style serif. The traditional humanities CV face.',
    body: `"TeX Gyre Pagella", "Palatino Linotype", Palatino, "Book Antiqua", ${SERIF_TAIL}`,
    head: `"TeX Gyre Pagella", "Palatino Linotype", Palatino, "Book Antiqua", ${SERIF_TAIL}`,
  },
  {
    id: 'garamond',
    label: 'Garamond',
    note: 'Light and economical — fits more words on a page than it looks.',
    body: `"EB Garamond", "Adobe Garamond Pro", Garamond, "Apple Garamond", Baskerville, ${SERIF_TAIL}`,
    head: `"EB Garamond", "Adobe Garamond Pro", Garamond, Baskerville, ${SERIF_TAIL}`,
  },
  {
    id: 'charter',
    label: 'Charter / Cambria',
    note: 'Sturdy transitional serif built for low-resolution printing.',
    body: `Charter, "Bitstream Charter", "Charis SIL", Cambria, "Source Serif Pro", ${SERIF_TAIL}`,
    head: `Charter, "Bitstream Charter", Cambria, "Source Serif Pro", ${SERIF_TAIL}`,
  },
  {
    id: 'times',
    label: 'Times New Roman',
    note: 'The journal default. Conservative, and expected in some fields.',
    body: `"Times New Roman", "Liberation Serif", Times, ${SERIF_TAIL}`,
    head: `"Times New Roman", "Liberation Serif", Times, ${SERIF_TAIL}`,
  },
  {
    id: 'latex',
    label: 'Latin Modern (LaTeX)',
    note: 'Computer Modern. What a plain LaTeX document looks like.',
    body: `"Latin Modern Roman", "Computer Modern Serif", "CMU Serif", "TeX Gyre Pagella", ${SERIF_TAIL}`,
    head: `"Latin Modern Sans", "CMU Sans Serif", "TeX Gyre Heros", "Helvetica Neue", ${SANS_TAIL}`,
  },
  {
    id: 'serif-sans',
    label: 'Serif body, sans heads',
    note: 'Georgia set against a crisp sans. Good contrast without shouting.',
    body: `Georgia, "Iowan Old Style", "Times New Roman", ${SERIF_TAIL}`,
    head: `Inter, "SF Pro Display", "Segoe UI", "Helvetica Neue", ${SANS_TAIL}`,
  },
  {
    id: 'sans-serif-heads',
    label: 'Sans body, serif heads',
    note: 'The inverse. Modern text, traditional headings.',
    body: `Inter, "SF Pro Text", "Segoe UI", "Helvetica Neue", ${SANS_TAIL}`,
    head: `"TeX Gyre Pagella", "Palatino Linotype", Georgia, ${SERIF_TAIL}`,
  },
  {
    id: 'slab',
    label: 'Slab headings',
    note: 'Heavy slab-serif headings over a plain sans body.',
    body: `"Source Sans Pro", Inter, "Segoe UI", "Helvetica Neue", ${SANS_TAIL}`,
    head: `"Roboto Slab", Rockwell, "Bitstream Charter", Charter, Cambria, ${SERIF_TAIL}`,
  },
  {
    id: 'mono-heads',
    label: 'Monospace headings',
    note: 'Terminal-flavoured headings. Pairs with the Tech theme.',
    body: `Inter, "SF Pro Text", "Segoe UI", "Helvetica Neue", ${SANS_TAIL}`,
    head: `"JetBrains Mono", "SFMono-Regular", Menlo, Consolas, "Liberation Mono", ${MONO_TAIL}`,
  },
];

/** @type {Record<string, FontPair>} */
export const FONT_PAIR_BY_ID = Object.fromEntries(FONT_PAIRS.map((f) => [f.id, f]));

/** Ids of every pairing. @type {string[]} */
export const FONT_PAIR_IDS = FONT_PAIRS.map((f) => f.id);

/**
 * Pairings that can supply a heading face on their own.
 *
 * The heading picker reuses the same stacks rather than defining a second list:
 * "Garamond headings over an Inter body" is a combination worth having, and
 * every stack here is already known to be installed and to print predictably.
 *
 * @type {FontPair[]}
 */
export const HEAD_FONTS = FONT_PAIRS.filter((f) => f.head);

/** @type {string[]} */
export const HEAD_FONT_IDS = HEAD_FONTS.map((f) => f.id);

/**
 * @typedef {Object} FontScale
 * @property {number} value Multiplier applied to every type size on the page.
 * @property {string} label
 * @property {string} note
 */

/**
 * The size steps offered by the picker.
 *
 * Deliberately narrow. Below about −12% a Letter page stops being comfortable
 * to read at arm's length, and above +20% the themes' fixed spacing starts to
 * look mean against the larger type. Spacing is density's job, not this
 * control's — the two are independent on purpose, so you can tighten leading
 * without shrinking the words or vice versa.
 *
 * @type {FontScale[]}
 */
export const FONT_SCALES = [
  { value: 0.88, label: 'Extra small', note: '−12%. Buys roughly half a page.' },
  { value: 0.94, label: 'Small', note: '−6%. Useful when you are one line over.' },
  { value: 1, label: 'Default', note: "Each theme's own sizes." },
  { value: 1.06, label: 'Large', note: '+6%. Easier on a printed page.' },
  { value: 1.12, label: 'Larger', note: '+12%.' },
  { value: 1.2, label: 'Extra large', note: '+20%. Costs about half a page.' },
];

/** @type {number[]} */
export const FONT_SCALE_VALUES = FONT_SCALES.map((s) => s.value);

/**
 * Resolve the two font stacks actually in force.
 *
 * `fontPair` owns the body and, unless overridden, the headings; `fontHead`
 * overrides the headings alone. Either may be absent, which is why the two are
 * returned separately rather than as a single pairing.
 *
 * @param {Object} settings
 * @returns {{bodyId?: string, headId?: string, body?: string, head?: string}}
 */
function resolveFonts(settings) {
  const pair = FONT_PAIR_BY_ID[settings?.fontPair];
  const override = FONT_PAIR_BY_ID[settings?.fontHead];

  const body = pair?.body;
  // The heading face comes from the override if one is chosen, otherwise from
  // the pairing. A pairing with no body has no head worth using either.
  const head = override?.head || (body ? pair.head || pair.body : undefined);

  return {
    bodyId: body ? pair.id : undefined,
    headId: head ? override?.id || pair?.id : undefined,
    body,
    head,
  };
}

/**
 * The attributes that open the override gates in index.css.
 *
 * Spread onto the theme's `<article>`. Both are `undefined` on the default
 * path, and an `undefined` attribute is one React does not render — so a theme
 * on "Theme default" produces exactly the markup it did before the picker
 * existed, and neither CSS rule can match it.
 *
 * @param {Object} settings The résumé `settings` object.
 * @returns {{'data-font-body'?: string, 'data-font-head'?: string}}
 */
export function fontAttrs(settings) {
  const { bodyId, headId } = resolveFonts(settings);
  return { 'data-font-body': bodyId, 'data-font-head': headId };
}

/**
 * The custom properties the override rules read. Spread this into a theme's
 * existing `style` object, after its own variables.
 *
 * `--rf-fs` is the type scale, and it is emitted even when no font family is
 * chosen: size and family are independent controls. It is omitted at 1× so the
 * `calc(9.5pt * var(--rf-fs, 1))` in every theme falls back to its literal
 * default and the untouched document stays byte-identical.
 *
 * @param {Object} settings
 * @returns {Object} `{}` when nothing has been overridden.
 */
export function fontVars(settings) {
  const { body, head } = resolveFonts(settings);
  /** @type {Record<string, string|number>} */
  const vars = {};
  if (body) vars['--rf-body'] = body;
  if (head) vars['--rf-head'] = head;

  const scale = Number(settings?.fontScale);
  if (Number.isFinite(scale) && scale !== 1) vars['--rf-fs'] = scale;

  return vars;
}
