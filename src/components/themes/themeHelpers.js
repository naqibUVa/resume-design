/**
 * @file themeHelpers.js
 *
 * Pure data helpers shared by the three themes.
 *
 * Only data lives here — no markup. The themes are meant to look genuinely
 * different, so sharing layout between them would defeat the point; sharing
 * "how do I turn a links object into a list of rows" does not.
 */

import { safeHref } from '../../utils/markdown.js';
import { PROFILE_LINKS } from '../../data/sectionSchemas.js';

/**
 * @typedef {Object} ContactItem
 * @property {string} key
 * @property {string} label Text as it should appear on the page.
 * @property {string} href  '' when the item should render as plain text.
 */

/**
 * Flatten contact details and profile links into an ordered, printable list.
 *
 * Empty fields are dropped and `mailto:`/`tel:` are built for email and phone.
 * How each link *reads* is the caller's choice:
 *
 * - `name`  — the slot's own name, "GitHub". Shortest and most legible; the
 *             address still lives in the `href`, so the PDF stays clickable.
 * - `short` — "github.com/jane", the URL minus its scheme and `www.`.
 * - `full`  — exactly what was typed in.
 *
 * Email, phone and location are never abbreviated under any style. A reader
 * holding a printed page has to be able to copy the address off it.
 *
 * @param {Object} profile
 * @param {Object} [opts]
 * @param {'name'|'short'|'full'} [opts.linkStyle='name'] How link text prints.
 * @returns {ContactItem[]}
 */
export function contactItems(profile, opts = {}) {
  const { linkStyle = 'name' } = opts;
  const { contact = {}, links = {} } = profile || {};
  /** @type {ContactItem[]} */
  const out = [];

  /**
   * @param {string} url
   * @param {string} name Fallback display name for the slot.
   */
  const label = (url, name) => {
    if (linkStyle === 'full') return url;
    if (linkStyle === 'name' && name) return name;
    return String(url)
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\/+$/, '');
  };

  if (contact.email?.trim()) {
    out.push({ key: 'email', label: contact.email.trim(), href: `mailto:${contact.email.trim()}` });
  }
  if (contact.phone?.trim()) {
    out.push({
      key: 'phone',
      label: contact.phone.trim(),
      href: `tel:${contact.phone.replace(/[^\d+]/g, '')}`,
    });
  }
  if (contact.location?.trim()) {
    out.push({ key: 'location', label: contact.location.trim(), href: '' });
  }

  // PROFILE_LINKS is the single ordered list of slots, so a new one (Bluesky,
  // say) appears in every theme's masthead as soon as it is registered.
  PROFILE_LINKS.forEach(({ key, short, label: name }) => {
    const raw = links[key];
    if (typeof raw !== 'string' || !raw.trim()) return;
    const href = safeHref(raw);
    if (!href) return;
    out.push({ key, label: label(href, short || name), href });
  });

  return out;
}

/**
 * Drop blank bullets, which is what an editor textarea produces on a stray
 * newline.
 *
 * @param {string[]} bullets
 * @returns {string[]}
 */
export function cleanBullets(bullets) {
  return (Array.isArray(bullets) ? bullets : []).map((b) => String(b).trim()).filter(Boolean);
}

/**
 * "Sep 2022 – Present", "2021 – 2026", or '' when neither end is set.
 *
 * @param {{start?: string, end?: string, current?: boolean}} item
 * @param {string} [dash='–'] En dash by default; themes may prefer a hyphen.
 * @returns {string}
 */
export function dateRange(item, dash = '–') {
  const start = (item?.start || '').trim();
  const end = item?.current ? 'Present' : (item?.end || '').trim();
  if (!start && !end) return '';
  if (!start) return end;
  if (!end) return start;
  return `${start} ${dash} ${end}`;
}

/**
 * The three project link slots, filtered to the ones that are actually
 * linkable and labelled for display.
 *
 * @param {Object} project
 * @returns {Array<{key: string, label: string, href: string}>}
 */
export function projectLinks(project) {
  return [
    { key: 'demo', label: 'Demo' },
    { key: 'source', label: 'Code' },
    { key: 'paper', label: 'Paper' },
  ]
    .map((l) => ({ ...l, href: safeHref(project?.[l.key]) }))
    .filter((l) => l.href);
}

/**
 * Combine a set of density-dependent class names.
 *
 * @param {'compact'|'normal'|'roomy'} density
 * @param {{compact: string, normal: string, roomy: string}} map
 * @returns {string}
 */
export function byDensity(density, map) {
  return map[density] || map.normal;
}

export { safeHref };
