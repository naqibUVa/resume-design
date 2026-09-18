/**
 * @file TimelineTheme.jsx
 *
 * Chronology first. Every entry sits against a vertical rail with a marker
 * dot, and its dates occupy a fixed left column, so a reader scanning down the
 * page gets the shape of a career before reading a single word.
 *
 * The rail is drawn per section rather than down the whole page: an unbroken
 * line through a page break lands in the printer's margin and looks like a
 * printing fault. Per section it always terminates cleanly.
 */

import { renderMarkdown } from '../../utils/markdown.js';
import { formatAuthors, publicationUrl, sortPublications } from '../../utils/bibtexParser.js';
import { buildSections } from './sectionModel.js';
import { Glyph, contactRows, renderSections } from './SectionRenderer.jsx';
import { byDensity } from './themeHelpers.js';
import { fontAttrs, fontVars } from '../../data/fontStacks.js';

const DATE_COL = '1.05in';

/**
 * @param {{resume: Object, visible: Object}} props
 * @returns {JSX.Element}
 */
export default function TimelineTheme({ resume, visible }) {
  const { profile, settings } = resume;
  const accent = settings.accent || '#4f46e5';
  const showIcons = settings.showIcons !== false;
  const contacts = contactRows(profile, settings);
  const sections = buildSections(resume, visible);

  const ui = {
    Section: ({ section, children }) => (
      <section data-section={section.key} className="mt-5 first:mt-0">
        {children}
      </section>
    ),

    Heading: ({ section }) => (
      <h2 className="resume-heading mb-2.5 flex items-center gap-2 text-[calc(9.5pt*var(--rf-fs,1))] font-bold uppercase tracking-[0.18em] text-ink-900">
        <span
          className="inline-block"
          style={{ width: DATE_COL, height: '2px', background: 'var(--accent)' }}
          aria-hidden="true"
        />
        {showIcons && section.icon && (
          <Glyph icon={section.icon} size="1em" className="text-[color:var(--accent)]" />
        )}
        <span>{section.title}</span>
      </h2>
    ),

    SubHeading: ({ children }) => (
      <h3
        className="resume-heading mb-1.5 mt-2.5 text-[calc(8.5pt*var(--rf-fs,1))] font-bold uppercase tracking-[0.12em] first:mt-0"
        style={{ marginLeft: `calc(${DATE_COL} + 0.28in)`, color: 'var(--accent-ink)' }}
      >
        {children}
      </h3>
    ),

    Entry: ({ e }) => (
      <div className="avoid-break flex gap-0">
        {/* date gutter */}
        <div
          className="flex-none pt-[0.1em] text-right text-[calc(8.5pt*var(--rf-fs,1))] font-medium leading-snug text-ink-500"
          style={{ width: DATE_COL }}
        >
          {e.meta}
        </div>

        {/* rail with marker */}
        <div className="relative mx-[0.14in] w-[7px] flex-none" aria-hidden="true">
          <span
            className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2"
            style={{ background: 'var(--accent-line)' }}
          />
          <span
            className="absolute left-1/2 top-[0.32em] h-[7px] w-[7px] -translate-x-1/2 rounded-full ring-2 ring-white"
            style={{ background: 'var(--accent)' }}
          />
        </div>

        {/* content */}
        <div className="min-w-0 flex-1 pb-3">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold text-ink-900">{e.primary}</span>
            {e.badge && (
              <span
                className="rounded-full px-1.5 py-[1px] text-[calc(7.5pt*var(--rf-fs,1))] font-semibold uppercase tracking-wide"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}
              >
                {e.badge}
              </span>
            )}
          </div>

          {e.secondary && (
            <div className="text-[calc(9.5pt*var(--rf-fs,1))]" style={{ color: 'var(--accent-ink)' }}>
              {e.secondary}
            </div>
          )}
          {e.tertiary && <div className="text-[calc(8.8pt*var(--rf-fs,1))] text-ink-500">{e.tertiary}</div>}

          {e.detail && (
            <div className="md mt-0.5 leading-[1.45] text-ink-700">
              {renderMarkdown(e.detail, { className: 'mb-1 last:mb-0' })}
            </div>
          )}

          {e.bullets.length > 0 && (
            <ul className="mt-1 list-outside list-disc space-y-0.5 pl-[1.05rem] leading-[1.45] text-ink-700 marker:text-[color:var(--accent-line)]">
              {e.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}

          {e.tags.length > 0 && (
            <p className="mt-1 text-[calc(8.8pt*var(--rf-fs,1))] text-ink-500">{e.tags.join(' · ')}</p>
          )}

          {e.links.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[calc(8.8pt*var(--rf-fs,1))]">
              {e.links.map((l) => (
                <a
                  key={l.key}
                  href={l.href}
                  className="inline-flex items-center gap-1 font-medium underline decoration-dotted underline-offset-2"
                  style={{ color: 'var(--accent-ink)' }}
                >
                  {showIcons && <Glyph icon={l.icon} size="0.95em" />}
                  <span>{l.label}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    ),

    Prose: ({ section }) => (
      <div
        className="md leading-[1.5] text-ink-700"
        style={{ marginLeft: `calc(${DATE_COL} + 0.28in)` }}
      >
        {renderMarkdown(section.text, { className: 'mb-1.5 last:mb-0' })}
      </div>
    ),

    Inline: ({ section }) => (
      <p className="leading-[1.5] text-ink-700" style={{ marginLeft: `calc(${DATE_COL} + 0.28in)` }}>
        {section.inlineText}
      </p>
    ),

    Skills: ({ section }) => (
      <div className="space-y-1.5">
        {section.skills.map((s) => (
          <div key={s.id} className="avoid-break flex gap-0">
            <p
              className="flex-none pt-[0.1em] text-right text-[calc(8.5pt*var(--rf-fs,1))] font-semibold uppercase tracking-wide text-ink-500"
              style={{ width: DATE_COL }}
            >
              {s.category}
            </p>
            <div className="mx-[0.14in] w-[7px] flex-none" aria-hidden="true" />
            <p className="min-w-0 flex-1 leading-[1.45] text-ink-700">{s.items.join(' · ')}</p>
          </div>
        ))}
      </div>
    ),

    Publications: ({ section }) => {
      const pubs = sortPublications(section.pubGroups.flatMap((g) => g.items));
      return (
        <div className="space-y-1.5">
          {pubs.map((p) => {
            const url = publicationUrl(p);
            return (
              <div key={p.id} className="avoid-break flex gap-0">
                <p
                  className="flex-none pt-[0.1em] text-right text-[calc(8.5pt*var(--rf-fs,1))] font-medium text-ink-500"
                  style={{ width: DATE_COL }}
                >
                  {p.year}
                </p>
                <div className="relative mx-[0.14in] w-[7px] flex-none" aria-hidden="true">
                  <span
                    className="absolute left-1/2 top-[0.42em] h-[5px] w-[5px] -translate-x-1/2 rotate-45"
                    style={{ background: 'var(--accent)' }}
                  />
                </div>
                <p className="min-w-0 flex-1 leading-[1.45]">
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
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      );
    },
  };

  return (
    <article
      className={`resume-paper font-tech text-ink-800 ${byDensity(settings.density, {
        compact: 'text-[calc(9.2pt*var(--rf-fs,1))]',
        normal: 'text-[calc(9.8pt*var(--rf-fs,1))]',
        roomy: 'text-[calc(10.4pt*var(--rf-fs,1))]',
      })}`}
      style={{
        '--page-margin': byDensity(settings.density, {
          compact: '0.55in',
          normal: '0.68in',
          roomy: '0.8in',
        }),
        '--accent': accent,
        '--accent-soft': `color-mix(in srgb, ${accent} 12%, white)`,
        '--accent-ink': `color-mix(in srgb, ${accent} 82%, black)`,
        '--accent-line': `color-mix(in srgb, ${accent} 30%, white)`,
        // Typography picker; a no-op unless the user chose a pairing.
        ...fontVars(settings),
      }}
      {...fontAttrs(settings)}
      lang="en"
    >
      <header className="avoid-break mb-5 flex items-end gap-0">
        <div className="flex-none text-right" style={{ width: DATE_COL }}>
          <span
            className="inline-block h-[0.5in] w-[3px] rounded-full align-bottom"
            style={{ background: 'var(--accent)' }}
            aria-hidden="true"
          />
        </div>
        <div className="mx-[0.14in] w-[7px] flex-none" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h1 className="text-[calc(21pt*var(--rf-fs,1))] font-bold leading-none tracking-tight text-ink-900">{profile.name}</h1>
          {profile.title && (
            <p className="mt-1 text-[calc(10.5pt*var(--rf-fs,1))] font-medium" style={{ color: 'var(--accent-ink)' }}>
              {profile.title}
            </p>
          )}
          {contacts.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[calc(9pt*var(--rf-fs,1))] text-ink-600">
              {contacts.map((c) => (
                <span key={c.key} className="inline-flex items-center gap-1">
                  {showIcons && (
                    <span className="text-[color:var(--accent)]">
                      <Glyph icon={c.icon} size="0.95em" />
                    </span>
                  )}
                  {c.href ? (
                    <a href={c.href} className="underline decoration-ink-300 underline-offset-2">
                      {c.label}
                    </a>
                  ) : (
                    <span>{c.label}</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {renderSections(sections, ui)}
    </article>
  );
}
