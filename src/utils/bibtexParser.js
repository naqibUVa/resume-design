/**
 * @file bibtexParser.js
 *
 * A dependency-free BibTeX parser, written for the résumé builder's importer.
 *
 * Scope, honestly stated: this is a *pragmatic* parser aimed at the kind of
 * `.bib` files Zotero, Mendeley, Google Scholar, ACM, IEEE and arXiv emit. It
 * is not a full LaTeX engine. It handles nested braces, quoted values,
 * `@string` abbreviations, `#` concatenation, comments, and the accent /
 * escape sequences that actually show up in author names. Exotic LaTeX macros
 * inside a title are passed through with their braces stripped rather than
 * being interpreted.
 *
 * Everything here is pure: no DOM, no I/O. That keeps it trivially testable.
 */

/* ============================================================
   Entry-type metadata
   ============================================================ */

/**
 * Human labels and the "venue" field to prefer, per entry type.
 * @type {Record<string, {label: string, venueField: string, kind: 'journal'|'conference'|'book'|'thesis'|'report'|'other'}>}
 */
export const ENTRY_TYPES = {
  article: { label: 'Journal Article', venueField: 'journal', kind: 'journal' },
  inproceedings: { label: 'Conference Paper', venueField: 'booktitle', kind: 'conference' },
  conference: { label: 'Conference Paper', venueField: 'booktitle', kind: 'conference' },
  incollection: { label: 'Book Chapter', venueField: 'booktitle', kind: 'book' },
  inbook: { label: 'Book Chapter', venueField: 'booktitle', kind: 'book' },
  book: { label: 'Book', venueField: 'publisher', kind: 'book' },
  booklet: { label: 'Booklet', venueField: 'howpublished', kind: 'other' },
  phdthesis: { label: 'PhD Thesis', venueField: 'school', kind: 'thesis' },
  mastersthesis: { label: "Master's Thesis", venueField: 'school', kind: 'thesis' },
  techreport: { label: 'Technical Report', venueField: 'institution', kind: 'report' },
  manual: { label: 'Manual', venueField: 'organization', kind: 'report' },
  unpublished: { label: 'Unpublished', venueField: 'note', kind: 'other' },
  patent: { label: 'Patent', venueField: 'assignee', kind: 'other' },
  misc: { label: 'Preprint / Misc', venueField: 'howpublished', kind: 'other' },
};

/** Fields we lift out of an entry and expose as first-class properties. */
const CORE_FIELDS = [
  'title',
  'author',
  'editor',
  'journal',
  'booktitle',
  'publisher',
  'school',
  'institution',
  'organization',
  'howpublished',
  'year',
  'month',
  'volume',
  'number',
  'pages',
  'doi',
  'url',
  'eprint',
  'archiveprefix',
  'note',
  'address',
  'series',
  'edition',
  'isbn',
  'issn',
  'abstract',
  'keywords',
];

/* ============================================================
   LaTeX → plain text
   ============================================================ */

/** Accent command → combining behaviour, keyed by the LaTeX control char. */
const ACCENTS = {
  '`': { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù', A: 'À', E: 'È', I: 'Ì', O: 'Ò', U: 'Ù', n: 'ǹ' },
  "'": { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', y: 'ý', c: 'ć', n: 'ń', s: 'ś', z: 'ź', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú', C: 'Ć', N: 'Ń', S: 'Ś', Z: 'Ź' },
  '^': { a: 'â', e: 'ê', i: 'î', o: 'ô', u: 'û', c: 'ĉ', g: 'ĝ', s: 'ŝ', A: 'Â', E: 'Ê', I: 'Î', O: 'Ô', U: 'Û' },
  '"': { a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü', y: 'ÿ', A: 'Ä', E: 'Ë', I: 'Ï', O: 'Ö', U: 'Ü' },
  '~': { a: 'ã', n: 'ñ', o: 'õ', A: 'Ã', N: 'Ñ', O: 'Õ' },
  '=': { a: 'ā', e: 'ē', i: 'ī', o: 'ō', u: 'ū', A: 'Ā', E: 'Ē', I: 'Ī', O: 'Ō', U: 'Ū' },
  '.': { a: 'ȧ', e: 'ė', z: 'ż', A: 'Ȧ', E: 'Ė', Z: 'Ż' },
  c: { c: 'ç', s: 'ş', t: 'ţ', C: 'Ç', S: 'Ş', T: 'Ţ' },
  v: { c: 'č', s: 'š', z: 'ž', r: 'ř', e: 'ě', n: 'ň', d: 'ď', t: 'ť', C: 'Č', S: 'Š', Z: 'Ž', R: 'Ř', E: 'Ě', N: 'Ň' },
  u: { a: 'ă', g: 'ğ', e: 'ĕ', A: 'Ă', G: 'Ğ' },
  H: { o: 'ő', u: 'ű', O: 'Ő', U: 'Ű' },
  k: { a: 'ą', e: 'ę', A: 'Ą', E: 'Ę' },
  r: { a: 'å', u: 'ů', A: 'Å', U: 'Ů' },
};

/** Standalone LaTeX symbol commands. */
const SYMBOLS = {
  '\\ss': 'ß',
  '\\ae': 'æ',
  '\\AE': 'Æ',
  '\\oe': 'œ',
  '\\OE': 'Œ',
  '\\o': 'ø',
  '\\O': 'Ø',
  '\\aa': 'å',
  '\\AA': 'Å',
  '\\l': 'ł',
  '\\L': 'Ł',
  '\\i': 'ı',
  '\\j': 'ȷ',
  '\\dag': '†',
  '\\ddag': '‡',
  '\\S': '§',
  '\\P': '¶',
  '\\pounds': '£',
  '\\copyright': '©',
  '\\textendash': '–',
  '\\textemdash': '—',
  '\\textquotesingle': "'",
  '\\ldots': '…',
  '\\dots': '…',
};

/**
 * Convert a raw BibTeX field value into readable plain text.
 *
 * @param {string} input Raw value, braces already balanced.
 * @returns {string} Human-readable text.
 */
export function latexToText(input) {
  if (!input) return '';
  let s = String(input);

  // 1. Accents in both spellings: {\"o}  \"{o}  \"o  \c{c}  {\c c}
  //    Run repeatedly so \'{\i} style nesting resolves.
  for (let pass = 0; pass < 3; pass += 1) {
    s = s.replace(/\{?\\([`'^"~=.cvuHkr])\s*\{?\\?([a-zA-Z])\}?\}?/g, (m, acc, ch) => {
      const table = ACCENTS[acc];
      return table && table[ch] ? table[ch] : ch;
    });
  }

  // 2. Symbol commands. Longest first so \AA beats \A.
  Object.keys(SYMBOLS)
    .sort((a, b) => b.length - a.length)
    .forEach((cmd) => {
      s = s.split(cmd + '{}').join(SYMBOLS[cmd]);
      s = s.replace(new RegExp(cmd.replace(/\\/g, '\\\\') + '(?![a-zA-Z])', 'g'), SYMBOLS[cmd]);
    });

  // 3. Dashes and quotes, before brace stripping.
  s = s.replace(/---/g, '—').replace(/--/g, '–');
  s = s.replace(/``/g, '“').replace(/''/g, '”').replace(/`/g, '‘');

  // 4. Text-style wrappers: keep the content, drop the command.
  s = s.replace(/\\(?:emph|textit|textbf|textsc|texttt|textrm|textsf|mbox|text)\{([^{}]*)\}/g, '$1');

  // 5. Inline math: strip the delimiters, keep the content.
  s = s.replace(/\$([^$]*)\$/g, '$1');
  s = s.replace(/\\ensuremath\{([^{}]*)\}/g, '$1');

  // 6. Escaped specials.
  s = s.replace(/\\([&%$#_{}])/g, '$1');

  // 7. Any remaining braces are BibTeX capitalisation guards — drop them.
  s = s.replace(/[{}]/g, '');

  // 8. Tildes are non-breaking spaces; \\ is a line break.
  s = s.replace(/\\\\/g, ' ').replace(/~/g, ' ');

  // 9. Collapse the whitespace a multi-line .bib entry leaves behind.
  return s.replace(/\s+/g, ' ').trim();
}

/* ============================================================
   Author handling
   ============================================================ */

/**
 * @typedef {Object} BibAuthor
 * @property {string} first  Given name(s), may be empty.
 * @property {string} last   Family name.
 * @property {string} full   "First Last", ready to display.
 */

/**
 * Split an author field on top-level " and " — ignoring any that sit inside
 * braces, e.g. `{Institute for Cats and Dogs}`.
 *
 * @param {string} field Raw `author` or `editor` value.
 * @returns {string[]} One raw name per author.
 */
function splitAuthorField(field) {
  const parts = [];
  let depth = 0;
  let buf = '';

  for (let i = 0; i < field.length; i += 1) {
    const ch = field[i];
    if (ch === '{') depth += 1;
    if (ch === '}') depth = Math.max(0, depth - 1);

    if (depth === 0 && /\s/.test(ch) && /^\s*and\s/i.test(field.slice(i))) {
      const m = field.slice(i).match(/^\s*and\s/i);
      parts.push(buf);
      buf = '';
      i += m[0].length - 1;
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) parts.push(buf);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/**
 * Parse one raw name into its components. Handles both BibTeX orders:
 * `"Last, First"` and `"First Last"`, plus von/particle prefixes and
 * corporate names wrapped in braces.
 *
 * @param {string} raw One author string.
 * @returns {BibAuthor}
 */
export function parseAuthorName(raw) {
  const cleaned = latexToText(raw);
  if (!cleaned) return { first: '', last: '', full: '' };

  // Corporate / bracketed name: treat the whole thing as the surname.
  if (/^\{.*\}$/.test(raw.trim())) {
    return { first: '', last: cleaned, full: cleaned };
  }

  if (cleaned.includes(',')) {
    const [lastPart, firstPart = ''] = cleaned.split(',').map((s) => s.trim());
    const first = firstPart;
    const last = lastPart;
    return { first, last, full: [first, last].filter(Boolean).join(' ') };
  }

  const tokens = cleaned.split(/\s+/);
  if (tokens.length === 1) return { first: '', last: tokens[0], full: tokens[0] };

  // Pull a lowercase particle ("van", "de", "von der") into the surname.
  let splitAt = tokens.length - 1;
  for (let i = tokens.length - 2; i >= 1; i -= 1) {
    if (/^(van|von|de|del|della|der|den|di|da|dos|du|la|le|el|bin|ibn|al)$/i.test(tokens[i]) && tokens[i][0] === tokens[i][0].toLowerCase()) {
      splitAt = i;
    } else {
      break;
    }
  }

  const first = tokens.slice(0, splitAt).join(' ');
  const last = tokens.slice(splitAt).join(' ');
  return { first, last, full: `${first} ${last}`.trim() };
}

/**
 * Format an author list for display.
 *
 * @param {BibAuthor[]} authors
 * @param {Object} [opts]
 * @param {'full'|'initials'} [opts.style='full'] `initials` gives "J. Doe".
 * @param {number} [opts.max=Infinity] Truncate to N names, then "et al."
 * @param {string} [opts.highlight] Exact full name to wrap in **bold** markers.
 * @returns {string}
 */
export function formatAuthors(authors, opts = {}) {
  const { style = 'full', max = Infinity } = opts;
  if (!Array.isArray(authors) || authors.length === 0) return '';

  const render = (a) => {
    if (style === 'initials') {
      const initials = (a.first || '')
        .split(/[\s.-]+/)
        .filter(Boolean)
        .map((p) => `${p[0].toUpperCase()}.`)
        .join(' ');
      const abbreviated = [initials, a.last].filter(Boolean).join(' ');
      // A name that was never split into first/last — hand-edited JSON, or an
      // import that only carried one string — has no initials to abbreviate.
      // Printing it whole is right; printing nothing would silently drop an
      // author out of the citation.
      if (abbreviated) return abbreviated;
    }
    return a.full || a.last;
  };

  const shown = authors.slice(0, max).map(render);
  const truncated = authors.length > max;

  if (truncated) return `${shown.join(', ')}, et al.`;
  if (shown.length === 1) return shown[0];
  if (shown.length === 2) return `${shown[0]} and ${shown[1]}`;
  return `${shown.slice(0, -1).join(', ')}, and ${shown[shown.length - 1]}`;
}

/* ============================================================
   Tokeniser
   ============================================================ */

/**
 * Read a brace-balanced `{...}` block starting at `start` (which must be the
 * opening brace). Respects `\{` escapes.
 *
 * @param {string} src
 * @param {number} start Index of the opening brace.
 * @returns {{value: string, end: number}} Inner text, and index *after* the closing brace.
 */
function readBraced(src, start) {
  let depth = 0;
  let i = start;
  for (; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '\\') {
      i += 1;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return { value: src.slice(start + 1, i), end: i + 1 };
    }
  }
  // Unbalanced: take the rest rather than throwing away the entry.
  return { value: src.slice(start + 1), end: src.length };
}

/**
 * Read a `"..."` value, honouring brace nesting inside it.
 *
 * @param {string} src
 * @param {number} start Index of the opening quote.
 * @returns {{value: string, end: number}}
 */
function readQuoted(src, start) {
  let depth = 0;
  let i = start + 1;
  for (; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '\\') {
      i += 1;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === '"' && depth === 0) return { value: src.slice(start + 1, i), end: i + 1 };
  }
  return { value: src.slice(start + 1), end: src.length };
}

/**
 * Strip `%` comments that are not escaped and not inside a braced value.
 * BibTeX comments run to end of line.
 *
 * @param {string} src
 * @returns {string}
 */
function stripComments(src) {
  let out = '';
  let depth = 0;
  let inQuote = false;

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];

    if (ch === '\\') {
      out += ch + (src[i + 1] || '');
      i += 1;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') depth = Math.max(0, depth - 1);
    if (ch === '"' && depth === 0) inQuote = !inQuote;

    if (ch === '%' && depth === 0 && !inQuote) {
      const nl = src.indexOf('\n', i);
      if (nl === -1) break;
      i = nl - 1;
      out += '\n';
      continue;
    }
    out += ch;
  }
  return out;
}

/* ============================================================
   Main parser
   ============================================================ */

/**
 * @typedef {Object} Publication
 * @property {string}  id            Stable id for React keys and toggles.
 * @property {string}  citationKey   The BibTeX key, e.g. "doe2025sparse".
 * @property {string}  entryType     Lower-cased type, e.g. "article".
 * @property {string}  typeLabel     Friendly label, e.g. "Journal Article".
 * @property {string}  title
 * @property {BibAuthor[]} authors
 * @property {string}  venue         Journal / conference / publisher.
 * @property {string}  year
 * @property {string}  volume
 * @property {string}  number
 * @property {string}  pages
 * @property {string}  doi
 * @property {string}  url
 * @property {string}  note
 * @property {boolean} include       Item-level visibility toggle.
 * @property {Record<string,string>} fields All raw fields, cleaned.
 */

/**
 * @typedef {Object} ParseResult
 * @property {Publication[]} entries
 * @property {string[]}      errors  Human-readable problems, non-fatal.
 * @property {number}        skipped Count of unparseable blocks.
 */

let uidCounter = 0;
/** @returns {string} A collision-resistant id. */
const makeId = () => `pub-${Date.now().toString(36)}-${(uidCounter += 1).toString(36)}`;

/**
 * Parse a BibTeX document.
 *
 * Never throws: malformed entries are reported in `errors` and skipped, so a
 * single bad record in a 300-entry library does not lose the other 299.
 *
 * @param {string} source Raw `.bib` file contents.
 * @returns {ParseResult}
 */
export function parseBibtex(source) {
  /** @type {ParseResult} */
  const result = { entries: [], errors: [], skipped: 0 };

  if (typeof source !== 'string' || !source.trim()) {
    return result;
  }

  const src = stripComments(source);
  /** @type {Record<string,string>} `@string` abbreviations. */
  const strings = {};

  let i = 0;
  while (i < src.length) {
    const at = src.indexOf('@', i);
    if (at === -1) break;

    const typeMatch = /^@([a-zA-Z]+)\s*[{(]/.exec(src.slice(at));
    if (!typeMatch) {
      i = at + 1;
      continue;
    }

    const entryType = typeMatch[1].toLowerCase();
    const openIdx = at + typeMatch[0].length - 1;
    const { value: body, end } = readBraced(src, openIdx);
    i = end;

    if (entryType === 'comment') continue;

    if (entryType === 'preamble') continue;

    if (entryType === 'string') {
      const m = /^\s*([^=\s]+)\s*=\s*([\s\S]*)$/.exec(body);
      // Store the body verbatim. Running latexToText here would collapse and
      // trim the value, and `abbrev # " Series"` concatenation depends on the
      // spacing surviving; every field is passed through latexToText once the
      // parts have been joined.
      if (m) strings[m[1].toLowerCase()] = m[2].trim().replace(/^[{"]|[}"]$/g, '');
      continue;
    }

    try {
      const entry = parseEntryBody(entryType, body, strings);
      if (entry) result.entries.push(entry);
      else result.skipped += 1;
    } catch (err) {
      result.skipped += 1;
      result.errors.push(`Could not parse a @${entryType} entry: ${err.message}`);
    }
  }

  if (result.entries.length === 0 && result.skipped === 0 && source.trim()) {
    result.errors.push('No BibTeX entries found. Entries must start with @article{, @inproceedings{, and so on.');
  }

  return result;
}

/**
 * Parse the inside of one `@type{ ... }` block.
 *
 * @param {string} entryType
 * @param {string} body Text between the outer braces.
 * @param {Record<string,string>} strings `@string` table.
 * @returns {Publication|null}
 */
function parseEntryBody(entryType, body, strings) {
  // Citation key: everything up to the first top-level comma.
  const commaIdx = indexOfTopLevel(body, ',');
  const citationKey = (commaIdx === -1 ? body : body.slice(0, commaIdx)).trim();
  const fieldsSrc = commaIdx === -1 ? '' : body.slice(commaIdx + 1);

  /** @type {Record<string,string>} */
  const raw = {};

  let i = 0;
  while (i < fieldsSrc.length) {
    // key
    const keyMatch = /^\s*([a-zA-Z][a-zA-Z0-9_:+-]*)\s*=\s*/.exec(fieldsSrc.slice(i));
    if (!keyMatch) {
      // Skip to the next top-level comma and try again.
      const next = indexOfTopLevel(fieldsSrc.slice(i), ',');
      if (next === -1) break;
      i += next + 1;
      continue;
    }
    const key = keyMatch[1].toLowerCase();
    i += keyMatch[0].length;

    // value — possibly several parts joined with #
    let value = '';
    let expectMore = true;

    while (expectMore && i < fieldsSrc.length) {
      while (i < fieldsSrc.length && /\s/.test(fieldsSrc[i])) i += 1;
      const ch = fieldsSrc[i];

      if (ch === '{') {
        const r = readBraced(fieldsSrc, i);
        value += r.value;
        i = r.end;
      } else if (ch === '"') {
        const r = readQuoted(fieldsSrc, i);
        value += r.value;
        i = r.end;
      } else {
        // Bare word: a number, or an @string abbreviation.
        const m = /^([^,\s#}]+)/.exec(fieldsSrc.slice(i));
        if (!m) break;
        const token = m[1];
        value += strings[token.toLowerCase()] ?? token;
        i += token.length;
      }

      while (i < fieldsSrc.length && /\s/.test(fieldsSrc[i])) i += 1;
      if (fieldsSrc[i] === '#') {
        i += 1;
        expectMore = true;
      } else {
        expectMore = false;
      }
    }

    raw[key] = value;

    const next = indexOfTopLevel(fieldsSrc.slice(i), ',');
    if (next === -1) break;
    i += next + 1;
  }

  const title = latexToText(raw.title || raw.booktitle || '');
  const hasAnything = title || raw.author || raw.year;
  if (!hasAnything) return null;

  const meta = ENTRY_TYPES[entryType] || ENTRY_TYPES.misc;

  /** @type {Record<string,string>} */
  const fields = {};
  CORE_FIELDS.forEach((f) => {
    if (raw[f] != null) fields[f] = latexToText(raw[f]);
  });
  Object.keys(raw).forEach((f) => {
    if (fields[f] == null) fields[f] = latexToText(raw[f]);
  });

  const authors = raw.author ? splitAuthorField(raw.author).map(parseAuthorName) : [];
  const editors = raw.editor ? splitAuthorField(raw.editor).map(parseAuthorName) : [];

  // Venue: preferred field for the type, then sensible fallbacks.
  const venue =
    fields[meta.venueField] ||
    fields.journal ||
    fields.booktitle ||
    fields.publisher ||
    fields.school ||
    fields.institution ||
    fields.howpublished ||
    '';

  // arXiv preprints put the identifier in `eprint`, not `url`.
  const arxivUrl =
    !fields.url && fields.eprint && /arxiv/i.test(fields.archiveprefix || 'arxiv')
      ? `https://arxiv.org/abs/${fields.eprint}`
      : '';

  return {
    id: makeId(),
    citationKey: citationKey || title.slice(0, 24),
    entryType,
    typeLabel: meta.label,
    kind: meta.kind,
    title,
    authors,
    editors,
    venue,
    year: (fields.year || '').replace(/[^0-9]/g, '').slice(0, 4),
    volume: fields.volume || '',
    number: fields.number || '',
    pages: (fields.pages || '').replace(/--+/g, '–'),
    doi: (fields.doi || '').replace(/^https?:\/\/(dx\.)?doi\.org\//i, ''),
    url: fields.url || arxivUrl,
    note: fields.note || '',
    address: fields.address || '',
    publisher: fields.publisher || '',
    include: true,
    fields,
  };
}

/**
 * Index of the first occurrence of `char` at brace/quote depth zero.
 *
 * @param {string} s
 * @param {string} char Single character to find.
 * @returns {number} Index, or -1.
 */
function indexOfTopLevel(s, char) {
  let depth = 0;
  let inQuote = false;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === '\\') {
      i += 1;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === '"' && depth === 0) inQuote = !inQuote;
    else if (ch === char && depth === 0 && !inQuote) return i;
  }
  return -1;
}

/* ============================================================
   Presentation helpers
   ============================================================ */

/**
 * Build a resolvable URL for a publication, preferring DOI.
 *
 * @param {Publication} pub
 * @returns {string} Absolute URL, or '' when the entry has no link.
 */
export function publicationUrl(pub) {
  if (!pub) return '';
  if (pub.doi) return `https://doi.org/${pub.doi}`;
  if (pub.url) return pub.url;
  return '';
}

/**
 * Render a publication as a single citation string.
 *
 * @param {Publication} pub
 * @param {Object} [opts]
 * @param {'apa'|'numeric'|'compact'} [opts.style='apa']
 * @param {'full'|'initials'} [opts.authorStyle='full']
 * @param {number} [opts.maxAuthors=Infinity]
 * @returns {string}
 */
export function formatCitation(pub, opts = {}) {
  const { style = 'apa', authorStyle = 'full', maxAuthors = Infinity } = opts;
  if (!pub) return '';

  const authors = formatAuthors(pub.authors, { style: authorStyle, max: maxAuthors });
  const year = pub.year ? `(${pub.year})` : '';
  const bits = [];

  if (style === 'compact') {
    bits.push(pub.title);
    if (pub.venue) bits.push(pub.venue);
    if (pub.year) bits.push(pub.year);
    return bits.filter(Boolean).join(', ') + '.';
  }

  if (authors) bits.push(authors);
  if (year) bits.push(year);
  if (pub.title) bits.push(`${pub.title}.`);

  let venuePart = pub.venue || '';
  if (venuePart) {
    if (pub.volume) venuePart += `, ${pub.volume}`;
    if (pub.number) venuePart += `(${pub.number})`;
    if (pub.pages) venuePart += `, ${pub.pages}`;
    bits.push(`${venuePart}.`);
  } else if (pub.pages) {
    bits.push(`pp. ${pub.pages}.`);
  }

  if (pub.note) bits.push(`${pub.note}.`);

  return bits
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\.\./g, '.')
    .trim();
}

/**
 * Sort publications newest-first, then alphabetically by title.
 *
 * @param {Publication[]} pubs
 * @returns {Publication[]} A new, sorted array.
 */
export function sortPublications(pubs) {
  return [...(pubs || [])].sort((a, b) => {
    const ya = parseInt(a.year, 10) || 0;
    const yb = parseInt(b.year, 10) || 0;
    if (ya !== yb) return yb - ya;
    return (a.title || '').localeCompare(b.title || '');
  });
}

/**
 * Group publications by their `kind` for CV-style sub-headings.
 *
 * @param {Publication[]} pubs
 * @returns {Array<{kind: string, label: string, items: Publication[]}>}
 */
export function groupPublications(pubs) {
  const ORDER = [
    ['journal', 'Journal Articles'],
    ['conference', 'Conference Papers'],
    ['book', 'Books & Chapters'],
    ['thesis', 'Theses'],
    ['report', 'Technical Reports'],
    ['other', 'Preprints & Other'],
  ];
  const known = new Set(ORDER.map(([kind]) => kind));
  // An unrecognised `kind` — from a hand-edited data/resume.json, or an import
  // that used its own vocabulary ("preprint", "workshop") — falls into the last
  // bucket. Matching on the known kinds alone would drop the entry from the
  // document entirely: no heading, no warning, just a publication that is not
  // on your CV. Filing it under "Preprints & Other" is visible and correctable.
  const bucket = (p) => {
    const kind = p.kind || 'other';
    return known.has(kind) ? kind : 'other';
  };

  return ORDER.map(([kind, label]) => ({
    kind,
    label,
    items: sortPublications((pubs || []).filter((p) => bucket(p) === kind)),
  })).filter((g) => g.items.length > 0);
}

/**
 * Merge freshly parsed entries into an existing list, de-duplicating on DOI
 * first and citation key second. Existing entries keep their `include` state.
 *
 * @param {Publication[]} existing
 * @param {Publication[]} incoming
 * @returns {{merged: Publication[], added: number, duplicates: number}}
 */
export function mergePublications(existing, incoming) {
  const list = [...(existing || [])];
  const seen = new Map();

  list.forEach((p) => {
    if (p.doi) seen.set(`doi:${p.doi.toLowerCase()}`, p);
    seen.set(`key:${(p.citationKey || '').toLowerCase()}`, p);
  });

  let added = 0;
  let duplicates = 0;

  (incoming || []).forEach((p) => {
    const doiKey = p.doi ? `doi:${p.doi.toLowerCase()}` : null;
    const citeKey = `key:${(p.citationKey || '').toLowerCase()}`;
    if ((doiKey && seen.has(doiKey)) || seen.has(citeKey)) {
      duplicates += 1;
      return;
    }
    list.push(p);
    if (doiKey) seen.set(doiKey, p);
    seen.set(citeKey, p);
    added += 1;
  });

  return { merged: list, added, duplicates };
}
