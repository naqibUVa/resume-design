/**
 * @file sectionModel.js
 *
 * Turns the résumé document into a list of *view models* — one per visible
 * section, in page order — that any theme can draw without knowing what an
 * "award" or a "grant" is.
 *
 * Why this exists: eight themes multiplied by seventeen sections is 136 render
 * paths. Written by hand that is unmaintainable, and every new section would
 * mean eight more edits. Instead each theme implements six small renderers
 * (heading, entry, skills, publications, inline, prose) and this file decides
 * *what* goes into them.
 *
 * A theme is still free to override any single section — AcademicTheme does
 * exactly that for publications, because a numbered citation list is the whole
 * point of that theme.
 */

import { groupPublications } from '../../utils/bibtexParser.js';
import { LINK_ICONS, SCHEMA_BY_KEY, buildLinks, groupItems, joinParts } from '../../data/sectionSchemas.js';
import { cleanBullets, dateRange } from './themeHelpers.js';

/**
 * @typedef {Object} EntryVM
 * @property {string} id
 * @property {string} primary   Bold headline of the entry.
 * @property {string} secondary Quieter line beneath it.
 * @property {string} tertiary  Third line, quieter still.
 * @property {string} meta      Right-hand column: a year or a date range.
 * @property {string} badge     Short pill: "Poster", "Granted", "PI · $248,000".
 * @property {string} detail    Markdown prose.
 * @property {string[]} bullets
 * @property {string[]} tags
 * @property {Array<{key: string, label: string, href: string, icon: Function}>} links
 */

/**
 * @typedef {Object} SectionVM
 * @property {string} key
 * @property {string} title
 * @property {Function} [icon]
 * @property {'prose'|'entries'|'inline'|'skills'|'publications'} layout
 * @property {string} [text]      layout 'prose'
 * @property {any[]} [skills]     layout 'skills'
 * @property {any[]} [pubGroups]  layout 'publications'
 * @property {string} [inlineText] layout 'inline'
 * @property {Array<{key: string, label: string, items: EntryVM[]}>} [groups]
 * @property {number} count       Total entries, for themes that want to balance columns.
 */

/** Fill in the fields an entry did not set, so themes can read them blindly. */
const EMPTY_ENTRY = {
  primary: '',
  secondary: '',
  tertiary: '',
  meta: '',
  badge: '',
  detail: '',
  bullets: [],
  tags: [],
  links: [],
};

/**
 * @param {Object} partial
 * @returns {EntryVM}
 */
function entryVM(partial) {
  return {
    ...EMPTY_ENTRY,
    ...partial,
    bullets: cleanBullets(partial.bullets),
    tags: Array.isArray(partial.tags) ? partial.tags.filter(Boolean) : [],
    links: Array.isArray(partial.links) ? partial.links : [],
  };
}

/* ============================================================
   The six original sections
   ============================================================ */

/**
 * Build view models for the sections that predate the schema registry.
 *
 * @param {Object} resume
 * @param {Object} visible
 * @returns {Record<string, () => SectionVM|null>}
 */
function coreModels(resume, visible) {
  const titles = resume.settings.sectionTitles;

  return {
    about: () =>
      visible.about.trim()
        ? { key: 'about', title: titles.about, layout: 'prose', text: visible.about, count: 1 }
        : null,

    education: () =>
      visible.education.length
        ? {
            key: 'education',
            title: titles.education,
            layout: 'entries',
            count: visible.education.length,
            groups: [
              {
                key: 'all',
                label: '',
                items: visible.education.map((e) =>
                  entryVM({
                    id: e.id,
                    primary: e.degree,
                    secondary: joinParts([e.institution, e.location], ', '),
                    meta: dateRange(e),
                    detail: e.detail,
                  })
                ),
              },
            ],
          }
        : null,

    experience: () =>
      visible.experience.length
        ? {
            key: 'experience',
            title: titles.experience,
            layout: 'entries',
            count: visible.experience.length,
            groups: [
              {
                key: 'all',
                label: '',
                items: visible.experience.map((e) =>
                  entryVM({
                    id: e.id,
                    primary: e.role,
                    secondary: joinParts([e.company, e.location], ', '),
                    meta: dateRange(e),
                    bullets: e.bullets,
                  })
                ),
              },
            ],
          }
        : null,

    projects: () =>
      visible.projects.length
        ? {
            key: 'projects',
            title: titles.projects,
            layout: 'entries',
            count: visible.projects.length,
            groups: [
              {
                key: 'all',
                label: '',
                items: visible.projects.map((p) =>
                  entryVM({
                    id: p.id,
                    primary: p.title,
                    detail: p.description,
                    tags: p.tech,
                    // Only the slots that hold a usable URL survive `buildLinks`,
                    // so an icon can never appear without a link behind it.
                    links: buildLinks([
                      { key: 'demo', label: 'Demo', raw: p.demo, icon: LINK_ICONS.demo },
                      { key: 'source', label: 'Code', raw: p.source, icon: LINK_ICONS.source },
                      { key: 'paper', label: 'Paper', raw: p.paper, icon: LINK_ICONS.paper },
                    ]),
                  })
                ),
              },
            ],
          }
        : null,

    publications: () => {
      const pubGroups = groupPublications(visible.publications);
      return pubGroups.length
        ? {
            key: 'publications',
            title: titles.publications,
            layout: 'publications',
            pubGroups,
            count: visible.publications.length,
          }
        : null;
    },

    skills: () =>
      visible.skills.length
        ? {
            key: 'skills',
            title: titles.skills,
            layout: 'skills',
            skills: visible.skills,
            count: visible.skills.length,
          }
        : null,
  };
}

/* ============================================================
   Assembly
   ============================================================ */

/**
 * Build every visible section, in page order.
 *
 * @param {Object} resume
 * @param {Object} visible
 * @returns {SectionVM[]}
 */
export function buildSections(resume, visible) {
  const core = coreModels(resume, visible);
  const titles = resume.settings.sectionTitles;

  return visible.order
    .map((key) => {
      if (core[key]) return core[key]();

      const schema = SCHEMA_BY_KEY[key];
      const items = visible[key];
      if (!schema || !items?.length) return null;

      const title = titles[key] || schema.title;

      if (schema.layout === 'inline') {
        return {
          key,
          title,
          icon: schema.icon,
          layout: 'inline',
          count: items.length,
          inlineText: items.map((i) => schema.inlineText(i)).filter(Boolean).join(' · '),
        };
      }

      return {
        key,
        title,
        icon: schema.icon,
        layout: 'entries',
        count: items.length,
        groups: groupItems(schema, items).map((g) => ({
          key: g.key,
          label: g.items.length && g.label ? g.label : '',
          items: g.items.map((item) => entryVM({ id: item.id, ...schema.entry(item) })),
        })),
      };
    })
    .filter(Boolean);
}

/**
 * Split sections into a narrow rail and a wide main column.
 *
 * Used by the Sidebar theme. Anything short and list-like goes left; anything
 * that carries prose or bullets goes right, because a 2.4in rail cannot hold a
 * paragraph without turning into a ladder of two-word lines.
 *
 * @param {SectionVM[]} sections
 * @param {string[]} railKeys Section keys preferred in the rail.
 * @returns {{rail: SectionVM[], main: SectionVM[]}}
 */
export function splitForRail(sections, railKeys) {
  /** @type {SectionVM[]} */
  const rail = [];
  /** @type {SectionVM[]} */
  const main = [];
  sections.forEach((s) => (railKeys.includes(s.key) ? rail : main).push(s));
  return { rail, main };
}

/**
 * Greedily split sections into two balanced columns, keeping page order within
 * each column. Used by the Compact CV theme.
 *
 * The weight is a rough proxy for rendered height: a heading plus a line per
 * entry, plus extra for anything with prose or bullets.
 *
 * @param {SectionVM[]} sections
 * @returns {[SectionVM[], SectionVM[]]}
 */
export function balanceColumns(sections) {
  /** @param {SectionVM} s */
  const weight = (s) => {
    if (s.layout === 'prose') return 6;
    if (s.layout === 'inline') return 2;
    if (s.layout === 'skills') return 1 + s.skills.length;
    if (s.layout === 'publications') return 1 + s.count * 2;
    const bulletCount = (s.groups || []).reduce(
      (n, g) => n + g.items.reduce((m, i) => m + i.bullets.length + (i.detail ? 2 : 0), 0),
      0
    );
    return 1 + s.count * 2 + bulletCount;
  };

  /** @type {SectionVM[][]} */
  const cols = [[], []];
  const load = [0, 0];
  sections.forEach((s) => {
    const target = load[0] <= load[1] ? 0 : 1;
    cols[target].push(s);
    load[target] += weight(s);
  });
  return /** @type {[SectionVM[], SectionVM[]]} */ (cols);
}
