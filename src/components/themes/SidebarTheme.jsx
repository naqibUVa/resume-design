/**
 * @file SidebarTheme.jsx
 *
 * Two columns: a tinted rail on the left for contact details and the short,
 * list-shaped sections, and a wide main column for the narrative ones.
 *
 * Printing note — the rail's colour is painted as a `linear-gradient` on the
 * page element rather than as a background on the rail `<div>`. A tall element
 * that crosses a page break re-paints its background on every fragment, so the
 * rail continues onto page two and three. A background on the inner column
 * would stop at the first break and leave the rest of the CV looking amputated.
 */

import { renderMarkdown } from '../../utils/markdown.js';
import { formatAuthors, publicationUrl, sortPublications } from '../../utils/bibtexParser.js';
import { buildSections, splitForRail } from './sectionModel.js';
import { Glyph, contactRows, initials, renderSections } from './SectionRenderer.jsx';
import { byDensity } from './themeHelpers.js';
import { fontAttrs, fontVars } from '../../data/fontStacks.js';

/** Short, list-shaped sections. Prose in a 2.3in column reads like a ladder. */
const RAIL_KEYS = [
  'skills',
  'languages',
  'certifications',
  'memberships',
  'references',
  'volunteering',
];

const RAIL_WIDTH = '2.35in';

/**
 * @param {{resume: Object, visible: Object}} props
 * @returns {JSX.Element}
 */
export default function SidebarTheme({ resume, visible }) {
  const { profile, settings } = resume;
  const accent = settings.accent || '#4f46e5';
  const showIcons = settings.showIcons !== false;
  const contacts = contactRows(profile, settings);
  const { rail, main } = splitForRail(buildSections(resume, visible), RAIL_KEYS);

  /** Shared entry body, restyled per column by the classes passed in. */
  const entryFor = (tone) =>
    function Entry({ e }) {
      const muted = tone === 'rail' ? 'text-white/70' : 'text-ink-500';
      const body = tone === 'rail' ? 'text-white/85' : 'text-ink-700';
      const strong = tone === 'rail' ? 'text-white' : 'text-ink-900';

      return (
        <div className="avoid-break mt-2.5 first:mt-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <span className={`font-semibold ${strong}`}>{e.primary}</span>
            {e.meta && <span className={`whitespace-nowrap text-[calc(8.5pt*var(--rf-fs,1))] ${muted}`}>{e.meta}</span>}
          </div>

          {e.secondary && <div className={`text-[calc(9.5pt*var(--rf-fs,1))] ${body}`}>{e.secondary}</div>}
          {e.tertiary && <div className={`text-[calc(8.8pt*var(--rf-fs,1))] ${muted}`}>{e.tertiary}</div>}

          {e.badge && (
            <span
              className={`mt-0.5 inline-block rounded px-1.5 py-[1px] text-[calc(8pt*var(--rf-fs,1))] font-medium ${
                tone === 'rail' ? 'bg-white/20 text-white' : ''
              }`}
              style={tone === 'rail' ? undefined : { background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}
            >
              {e.badge}
            </span>
          )}

          {e.detail && (
            <div className={`md mt-0.5 leading-[1.45] ${body}`}>
              {renderMarkdown(e.detail, { className: 'mb-1 last:mb-0' })}
            </div>
          )}

          {e.bullets.length > 0 && (
            <ul className={`mt-1 space-y-0.5 leading-[1.45] ${body}`}>
              {e.bullets.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span
                    className="mt-[0.45em] h-1 w-1 flex-none rounded-full"
                    style={{ background: tone === 'rail' ? 'rgba(255,255,255,0.7)' : 'var(--accent)' }}
                    aria-hidden="true"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {e.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {e.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full px-1.5 py-[1px] text-[calc(8pt*var(--rf-fs,1))] font-medium"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {e.links.length > 0 && (
            <div className={`mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[calc(8.5pt*var(--rf-fs,1))] ${muted}`}>
              {e.links.map((l) => (
                <a key={l.key} href={l.href} className="inline-flex items-center gap-1 underline underline-offset-2">
                  {showIcons && <Glyph icon={l.icon} size="0.95em" />}
                  <span>{l.label}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      );
    };

  /**
   * Build a `ui` for one of the two columns.
   * @param {'rail'|'main'} tone
   */
  const uiFor = (tone) => ({
    Section: ({ section, children }) => (
      <section data-section={section.key} className={tone === 'rail' ? 'mt-4 first:mt-0' : 'mt-[1.15rem] first:mt-0'}>
        {children}
      </section>
    ),

    Heading: ({ section }) =>
      tone === 'rail' ? (
        <h2 className="resume-heading mb-1.5 flex items-center gap-1.5 border-b border-white/25 pb-1 text-[calc(8.5pt*var(--rf-fs,1))] font-bold uppercase tracking-[0.18em] text-white">
          {showIcons && section.icon && <Glyph icon={section.icon} size="0.95em" />}
          {section.title}
        </h2>
      ) : (
        <h2 className="resume-heading mb-2 flex items-center gap-2 text-[calc(9.5pt*var(--rf-fs,1))] font-bold uppercase tracking-[0.16em] text-ink-900">
          {showIcons && section.icon && (
            <Glyph icon={section.icon} size="1em" className="text-[color:var(--accent)]" />
          )}
          <span>{section.title}</span>
          <span className="h-[2px] w-6 rounded-full" style={{ background: 'var(--accent)' }} />
        </h2>
      ),

    SubHeading: ({ children }) => (
      <h3
        className={`resume-heading mb-1 mt-2 text-[calc(8.5pt*var(--rf-fs,1))] font-bold uppercase tracking-[0.1em] first:mt-0 ${
          tone === 'rail' ? 'text-white/75' : ''
        }`}
        style={tone === 'rail' ? undefined : { color: 'var(--accent-ink)' }}
      >
        {children}
      </h3>
    ),

    Entry: entryFor(tone),

    Prose: ({ section }) => (
      <div className={`md leading-[1.5] ${tone === 'rail' ? 'text-white/85' : 'text-ink-700'}`}>
        {renderMarkdown(section.text, { className: 'mb-1.5 last:mb-0' })}
      </div>
    ),

    Inline: ({ section }) => (
      <p className={`leading-[1.5] ${tone === 'rail' ? 'text-white/85' : 'text-ink-700'}`}>
        {section.inlineText}
      </p>
    ),

    Skills: ({ section }) => (
      <div className="space-y-2">
        {section.skills.map((s) => (
          <div key={s.id} className="avoid-break">
            <p
              className={`text-[calc(8.5pt*var(--rf-fs,1))] font-semibold uppercase tracking-wide ${
                tone === 'rail' ? 'text-white/70' : 'text-ink-500'
              }`}
            >
              {s.category}
            </p>
            <p className={`leading-[1.45] ${tone === 'rail' ? 'text-white/90' : 'text-ink-700'}`}>
              {s.items.join(' · ')}
            </p>
          </div>
        ))}
      </div>
    ),

    Publications: ({ section }) => {
      const pubs = sortPublications(section.pubGroups.flatMap((g) => g.items));
      return (
        <ul className="space-y-1.5">
          {pubs.map((p) => {
            const url = publicationUrl(p);
            return (
              <li key={p.id} className="avoid-break leading-[1.45]">
                <span className="font-medium text-ink-900">
                  {url ? (
                    <a href={url} className="underline decoration-dotted underline-offset-2">
                      {p.title}
                    </a>
                  ) : (
                    p.title
                  )}
                </span>
                <span className="text-[calc(9pt*var(--rf-fs,1))] text-ink-600">
                  {' — '}
                  {formatAuthors(p.authors, { style: 'initials', max: 5 })}
                  {p.venue && <em> · {p.venue}</em>}
                  {p.year && ` · ${p.year}`}
                </span>
              </li>
            );
          })}
        </ul>
      );
    },
  });

  const pad = byDensity(settings.density, { compact: '0.42in', normal: '0.5in', roomy: '0.6in' });

  return (
    <article
      className={`resume-paper font-tech text-ink-800 ${byDensity(settings.density, {
        compact: 'text-[calc(9.2pt*var(--rf-fs,1))]',
        normal: 'text-[calc(9.8pt*var(--rf-fs,1))]',
        roomy: 'text-[calc(10.4pt*var(--rf-fs,1))]',
      })}`}
      style={{
        '--page-margin': '0',
        '--accent': accent,
        '--accent-soft': `color-mix(in srgb, ${accent} 12%, white)`,
        '--accent-ink': `color-mix(in srgb, ${accent} 82%, black)`,
        '--rail': `color-mix(in srgb, ${accent} 88%, black)`,
        // Painted on the sheet, not on the rail div, so it survives page breaks.
        background: `linear-gradient(to right, var(--rail) 0 ${RAIL_WIDTH}, #fff ${RAIL_WIDTH})`,
        // Typography picker; a no-op unless the user chose a pairing.
        ...fontVars(settings),
      }}
      {...fontAttrs(settings)}
      lang="en"
    >
      <div className="flex items-stretch">
        {/* ---- rail ---- */}
        <aside
          className="flex-none text-white"
          style={{ width: RAIL_WIDTH, padding: `${pad} 0.28in ${pad} 0.34in` }}
        >
          <div className="avoid-break">
            {settings.showMonogram !== false && initials(profile.name) && (
              <div
                className="mb-2.5 flex h-[0.78in] w-[0.78in] items-center justify-center rounded-full border-2 border-white/35 text-[calc(15pt*var(--rf-fs,1))] font-bold"
                aria-hidden="true"
              >
                {initials(profile.name)}
              </div>
            )}
            <h1 className="text-[calc(16pt*var(--rf-fs,1))] font-bold leading-[1.1]">{profile.name}</h1>
            {profile.title && <p className="mt-1 text-[calc(9.5pt*var(--rf-fs,1))] leading-snug text-white/80">{profile.title}</p>}
          </div>

          {contacts.length > 0 && (
            <ul className="mt-3.5 space-y-1.5 border-t border-white/25 pt-3 text-[calc(9pt*var(--rf-fs,1))]">
              {contacts.map((c) => (
                <li key={c.key} className="flex items-start gap-2 leading-snug">
                  {showIcons && (
                    <span className="mt-[0.15em] text-white/70">
                      <Glyph icon={c.icon} size="1em" />
                    </span>
                  )}
                  {c.href ? (
                    <a href={c.href} className="break-all text-white/90 underline decoration-white/30 underline-offset-2">
                      {c.label}
                    </a>
                  ) : (
                    <span className="text-white/90">{c.label}</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {renderSections(rail, uiFor('rail'))}
        </aside>

        {/* ---- main column ---- */}
        <div className="min-w-0 flex-1" style={{ padding: `${pad} 0.5in ${pad} 0.38in` }}>
          {renderSections(main, uiFor('main'))}
        </div>
      </div>
    </article>
  );
}
