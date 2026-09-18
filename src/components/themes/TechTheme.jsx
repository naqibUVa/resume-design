/**
 * @file TechTheme.jsx
 *
 * The modern engineering résumé: sans-serif, an accent colour the user picks,
 * a tinted header card, technology pills, and links styled as icon chips so
 * they still read as links once printed.
 *
 * The accent is applied through CSS custom properties rather than Tailwind
 * classes, because it is chosen at runtime — Tailwind can only emit classes it
 * saw at build time. `print-color-adjust: exact` in the print stylesheet is
 * what keeps the tints and rules from being dropped by the print pipeline.
 */

import { formatAuthors, publicationUrl, sortPublications } from '../../utils/bibtexParser.js';
import { renderMarkdown } from '../../utils/markdown.js';
import { buildSections } from './sectionModel.js';
import { Glyph, contactRows, initials, renderSections } from './SectionRenderer.jsx';
import { byDensity } from './themeHelpers.js';
import { fontAttrs, fontVars } from '../../data/fontStacks.js';

/**
 * A pill-shaped technology badge.
 *
 * @param {{children: import('react').ReactNode}} props
 * @returns {JSX.Element}
 */
function Pill({ children }) {
  return (
    <span
      className="inline-block rounded-full px-2 py-[1px] text-[calc(8pt*var(--rf-fs,1))] font-medium leading-[1.5]"
      style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}
    >
      {children}
    </span>
  );
}

/**
 * @param {{resume: Object, visible: Object}} props
 * @returns {JSX.Element}
 */
export default function TechTheme({ resume, visible }) {
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
      <h2 className="resume-heading mb-2 flex items-center gap-2.5 text-[calc(9.5pt*var(--rf-fs,1))] font-bold uppercase tracking-[0.16em] text-ink-900">
        {showIcons && section.icon && (
          <span
            className="flex h-[1.35em] w-[1.35em] items-center justify-center rounded-[4px]"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}
          >
            <Glyph icon={section.icon} size="0.85em" />
          </span>
        )}
        <span>{section.title}</span>
        <span className="h-px flex-1" style={{ background: 'var(--accent)', opacity: 0.35 }} />
      </h2>
    ),

    SubHeading: ({ children }) => (
      <h3
        className="resume-heading mb-1.5 mt-2.5 text-[calc(8.5pt*var(--rf-fs,1))] font-bold uppercase tracking-[0.12em] first:mt-0"
        style={{ color: 'var(--accent-ink)' }}
      >
        {children}
      </h3>
    ),

    Entry: ({ e }) => (
      <div className="avoid-break mt-3 first:mt-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h3 className="font-semibold text-ink-900">
            {e.primary}
            {e.secondary && (
              <>
                <span className="mx-1.5 text-ink-300">/</span>
                <span className="font-medium" style={{ color: 'var(--accent-ink)' }}>
                  {e.secondary}
                </span>
              </>
            )}
          </h3>
          {e.meta && (
            <span className="whitespace-nowrap font-mono text-[calc(8.5pt*var(--rf-fs,1))] text-ink-500">{e.meta}</span>
          )}
        </div>

        {(e.badge || e.tertiary) && (
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[calc(9pt*var(--rf-fs,1))] text-ink-500">
            {e.badge && <Pill>{e.badge}</Pill>}
            {e.tertiary && <span>{e.tertiary}</span>}
          </p>
        )}

        {e.detail && (
          <div className="md mt-0.5 leading-[1.45] text-ink-700">
            {renderMarkdown(e.detail, { className: 'mb-1 last:mb-0' })}
          </div>
        )}

        {e.bullets.length > 0 && (
          <ul className="mt-1 space-y-1 leading-[1.45] text-ink-700">
            {e.bullets.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span
                  className="mt-[0.42em] h-1 w-1 flex-none rounded-full"
                  style={{ background: 'var(--accent)' }}
                  aria-hidden="true"
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        {e.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {e.tags.map((t) => (
              <Pill key={t}>{t}</Pill>
            ))}
          </div>
        )}

        {/* Outlined chips, so Demo / Code / Paper read as buttons on paper. */}
        {e.links.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {e.links.map((l) => (
              <a
                key={l.key}
                href={l.href}
                className="inline-flex items-center gap-1 rounded-md border px-1.5 py-[1px] text-[calc(8.5pt*var(--rf-fs,1))] font-medium"
                style={{ borderColor: 'var(--accent-soft)', color: 'var(--accent-ink)' }}
              >
                {showIcons && <Glyph icon={l.icon} size="0.95em" />}
                <span>{l.label}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    ),

    Prose: ({ section }) => (
      <div className="md leading-[1.5] text-ink-700">
        {renderMarkdown(section.text, { className: 'mb-1.5 last:mb-0' })}
      </div>
    ),

    Inline: ({ section }) => <p className="leading-[1.5] text-ink-700">{section.inlineText}</p>,

    Skills: ({ section }) => (
      <div className="space-y-2">
        {section.skills.map((s) => (
          <div key={s.id} className="avoid-break flex gap-3">
            <p className="w-[7.5rem] flex-none pt-[2px] text-[calc(9pt*var(--rf-fs,1))] font-semibold text-ink-900">
              {s.category}
            </p>
            <div className="flex flex-wrap gap-1">
              {s.items.map((t) => (
                <Pill key={t}>{t}</Pill>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),

    Publications: ({ section }) => {
      const pubs = sortPublications(section.pubGroups.flatMap((g) => g.items));
      return (
        <ul className="space-y-2">
          {pubs.map((p) => {
            const url = publicationUrl(p);
            return (
              <li key={p.id} className="avoid-break leading-[1.45]">
                <p className="font-medium text-ink-900">
                  {url ? (
                    <a
                      href={url}
                      className="underline decoration-dotted underline-offset-2"
                      style={{ color: 'var(--accent-ink)' }}
                    >
                      {p.title}
                    </a>
                  ) : (
                    p.title
                  )}
                </p>
                <p className="text-[calc(9pt*var(--rf-fs,1))] text-ink-600">
                  {formatAuthors(p.authors, { style: 'initials', max: 6 })}
                  {p.venue && <span className="italic"> · {p.venue}</span>}
                  {p.year && <span> · {p.year}</span>}
                </p>
              </li>
            );
          })}
        </ul>
      );
    },
  };

  return (
    <article
      className={`resume-paper font-tech text-ink-800 ${byDensity(settings.density, {
        compact: 'text-[calc(9.4pt*var(--rf-fs,1))]',
        normal: 'text-[calc(10pt*var(--rf-fs,1))]',
        roomy: 'text-[calc(10.6pt*var(--rf-fs,1))]',
      })}`}
      style={{
        '--page-margin': byDensity(settings.density, {
          compact: '0.55in',
          normal: '0.65in',
          roomy: '0.8in',
        }),
        '--accent': accent,
        // Derived tints. `color-mix` keeps one source of truth for the accent.
        '--accent-soft': `color-mix(in srgb, ${accent} 12%, white)`,
        '--accent-ink': `color-mix(in srgb, ${accent} 82%, black)`,
        '--accent-line': `color-mix(in srgb, ${accent} 28%, white)`,
        // Typography picker; a no-op unless the user chose a pairing.
        ...fontVars(settings),
      }}
      {...fontAttrs(settings)}
      lang="en"
    >
      {/* ---- masthead: a tinted card rather than a bare heading ---- */}
      <header
        className="avoid-break mb-5 rounded-xl px-4 py-3.5"
        style={{ background: 'var(--accent-soft)' }}
      >
        <div className="flex items-start gap-3.5">
          {settings.showMonogram !== false && initials(profile.name) && (
            <div
              className="flex h-[0.82in] w-[0.82in] flex-none items-center justify-center rounded-lg text-[calc(15pt*var(--rf-fs,1))] font-bold tracking-tight text-white"
              style={{ background: 'var(--accent)' }}
              aria-hidden="true"
            >
              {initials(profile.name)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="text-[calc(21pt*var(--rf-fs,1))] font-bold leading-none tracking-tight text-ink-900">
              {profile.name}
            </h1>
            {profile.title && (
              <p className="mt-1 text-[calc(10.5pt*var(--rf-fs,1))] font-medium" style={{ color: 'var(--accent-ink)' }}>
                {profile.title}
              </p>
            )}

            {contacts.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[calc(9pt*var(--rf-fs,1))]">
                {contacts.map((c) => (
                  <span key={c.key} className="inline-flex items-center gap-1 text-ink-600">
                    {showIcons && (
                      <span style={{ color: accent }}>
                        <Glyph icon={c.icon} size="0.95em" />
                      </span>
                    )}
                    {c.href ? (
                      <a
                        href={c.href}
                        className="underline decoration-dotted underline-offset-2"
                        style={{ color: 'var(--accent-ink)' }}
                      >
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

          {settings.showPhotoPlaceholder && (
            <div
              className="h-[0.95in] w-[0.95in] flex-none rounded-lg border-2 border-white/70"
              style={{ background: 'var(--accent-line)' }}
              aria-hidden="true"
            />
          )}
        </div>
      </header>

      {renderSections(sections, ui)}
    </article>
  );
}
