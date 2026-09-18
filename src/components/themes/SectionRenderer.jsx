/**
 * @file SectionRenderer.jsx
 *
 * The shared half of the theme engine: iteration, grouping, citation text and
 * the icon-bearing link rows. Themes supply the *look* through a small `ui`
 * object; nothing here decides colour, type or spacing beyond what it is handed.
 *
 * The `ui` contract
 * -----------------
 *   Heading({section})            section title
 *   SubHeading({children})        group label inside a section ("Poster Presentations")
 *   Section({section, children})  wrapper — optional, defaults to <section>
 *   Entry({e, section, index})    one EntryVM
 *   Prose({section})              the About block
 *   Skills({section})             the skills block
 *   Inline({section})             one-line sections such as Languages
 *   Publications({section})       the citation list
 *
 * Any of the last five may be omitted; the section is then skipped rather than
 * crashing, which keeps a half-written theme runnable.
 */

import { safeHref } from '../../utils/markdown.js';
import { formatAuthors, publicationUrl } from '../../utils/bibtexParser.js';
import { CONTACT_ICONS } from '../../data/sectionSchemas.js';
import { contactItems } from './themeHelpers.js';

/* ============================================================
   Icons
   ============================================================ */

/**
 * A lucide glyph sized for print.
 *
 * `strokeWidth` is raised slightly and the size pinned in points rather than
 * pixels: at 300 dpi a 1px hairline disappears into the paper, and a px-sized
 * icon does not scale with the theme's type size.
 *
 * @param {{icon: Function, size?: string, className?: string, strokeWidth?: number}} props
 * @returns {JSX.Element|null}
 */
export function Glyph({ icon: IconComponent, size = '1em', className = '', strokeWidth = 2 }) {
  if (!IconComponent) return null;
  return (
    <IconComponent
      aria-hidden="true"
      focusable="false"
      strokeWidth={strokeWidth}
      className={`inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Contact details with their icons attached, ready to render.
 *
 * Takes the whole `settings` object rather than an options bag so that every
 * theme's call site stays `contactRows(profile, settings)` — a new display
 * setting then reaches all of them without ten more edits.
 *
 * @param {Object} profile
 * @param {Object} [settings] The résumé `settings` object.
 * @returns {Array<{key: string, label: string, href: string, icon: Function}>}
 */
export function contactRows(profile, settings) {
  return contactItems(profile, { linkStyle: settings?.linkStyle }).map((c) => ({
    ...c,
    icon: CONTACT_ICONS[c.key],
  }));
}

/**
 * Initials for a monogram block. Two letters at most — three looks like a
 * corporate logo, one looks like a mistake.
 *
 * @param {string} name
 * @returns {string}
 */
export function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ============================================================
   Link rows
   ============================================================ */

/**
 * A row of links, each preceded by its icon.
 *
 * This is what satisfies "show the icon only if there is a link": the entry
 * view model has already dropped every slot whose URL did not resolve, so an
 * empty `links` array renders nothing at all — no separator, no stray glyph.
 *
 * @param {Object} props
 * @param {Array<{key: string, label: string, href: string, icon: Function}>} props.links
 * @param {boolean} [props.showIcons=true]
 * @param {string} [props.className]     Wrapper classes.
 * @param {string} [props.linkClass]     Per-link classes.
 * @param {string} [props.separator]     Rendered between links when set.
 * @param {string} [props.iconSize]
 * @returns {JSX.Element|null}
 */
export function LinkRow({
  links,
  showIcons = true,
  className = '',
  linkClass = '',
  separator = '',
  iconSize = '0.95em',
}) {
  if (!links?.length) return null;
  return (
    <span className={className}>
      {links.map((l, i) => (
        <span key={l.key}>
          {i > 0 && separator && <span className="mx-1 opacity-40">{separator}</span>}
          <a href={l.href} className={`inline-flex items-center gap-1 align-baseline ${linkClass}`}>
            {showIcons && <Glyph icon={l.icon} size={iconSize} />}
            <span>{l.label}</span>
          </a>
        </span>
      ))}
    </span>
  );
}

/* ============================================================
   Citations
   ============================================================ */

/**
 * One formatted citation, as inline content (no wrapper element, so a theme
 * can drop it into an `<li>`, a `<p>` or a grid cell as it prefers).
 *
 * @param {{p: Object, linkClass?: string}} props
 * @returns {JSX.Element}
 */
export function Citation({ p, linkClass = 'underline decoration-current/30 underline-offset-2' }) {
  const url = publicationUrl(p);
  return (
    <>
      {formatAuthors(p.authors, { style: 'initials' })}
      {p.year && ` (${p.year}).`} <span className="font-medium">{p.title}.</span>{' '}
      {p.venue && <em>{p.venue}</em>}
      {p.volume && <em>, {p.volume}</em>}
      {p.number && <em>({p.number})</em>}
      {p.pages && <span>, {p.pages}</span>}
      {(p.venue || p.pages) && '.'}
      {url && (
        <>
          {' '}
          <a href={url} className={linkClass}>
            {p.doi ? `doi:${p.doi}` : url.replace(/^https?:\/\//, '')}
          </a>
        </>
      )}
    </>
  );
}

/* ============================================================
   The driver
   ============================================================ */

/**
 * Render a list of section view models through a theme's `ui`.
 *
 * @param {import('./sectionModel.js').SectionVM[]} sections
 * @param {Object} ui
 * @returns {Array<JSX.Element|null>}
 */
export function renderSections(sections, ui) {
  return sections.map((section) => renderSection(section, ui));
}

/**
 * Render one section view model.
 *
 * @param {import('./sectionModel.js').SectionVM} section
 * @param {Object} ui
 * @returns {JSX.Element|null}
 */
export function renderSection(section, ui) {
  const { Heading, SubHeading, Entry, Prose, Skills, Inline, Publications, Section } = ui;
  const Wrapper = Section || DefaultSection;

  /** @type {import('react').ReactNode} */
  let body = null;

  switch (section.layout) {
    case 'prose':
      if (!Prose) return null;
      body = <Prose section={section} />;
      break;

    case 'skills':
      if (!Skills) return null;
      body = <Skills section={section} />;
      break;

    case 'inline':
      if (!Inline) return null;
      body = <Inline section={section} />;
      break;

    case 'publications':
      if (!Publications) return null;
      body = <Publications section={section} />;
      break;

    default: {
      if (!Entry) return null;
      const multi = section.groups.length > 1;
      let n = 0;
      body = section.groups.map((g) => (
        <div key={g.key} className={multi ? 'mt-2 first:mt-0' : ''}>
          {multi && g.label && SubHeading && <SubHeading>{g.label}</SubHeading>}
          {g.items.map((e) => {
            const index = n;
            n += 1;
            return <Entry key={e.id} e={e} section={section} index={index} />;
          })}
        </div>
      ));
    }
  }

  return (
    <Wrapper key={section.key} section={section}>
      {Heading && <Heading section={section} />}
      {body}
    </Wrapper>
  );
}

/**
 * @param {{section: Object, children: import('react').ReactNode}} props
 * @returns {JSX.Element}
 */
function DefaultSection({ section, children }) {
  return <section data-section={section.key}>{children}</section>;
}

export { safeHref };
