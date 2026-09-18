/**
 * @file BannerTheme.jsx
 *
 * A full-bleed colour band across the top — monogram, name, title and the
 * contact row reversed out in white — then a calm single column beneath it.
 *
 * The band runs edge to edge, so this theme sets `--page-margin: 0` and owns
 * its own padding. Everything below the band is indented by `--gutter`.
 *
 * Print caveat worth knowing: Chrome will not print background colours unless
 * "Background graphics" is ticked. The app's export dialog says so, and the
 * name and contact row are the only things sitting on colour, so a mis-set
 * print dialog costs you a white header rather than an unreadable one — the
 * text is dark-on-white in that case, not white-on-white.
 */

import { renderMarkdown } from '../../utils/markdown.js';
import { formatAuthors, publicationUrl, sortPublications } from '../../utils/bibtexParser.js';
import { buildSections } from './sectionModel.js';
import { Glyph, contactRows, initials, renderSections } from './SectionRenderer.jsx';
import { byDensity } from './themeHelpers.js';
import { fontAttrs, fontVars } from '../../data/fontStacks.js';

/**
 * @param {{resume: Object, visible: Object}} props
 * @returns {JSX.Element}
 */
export default function BannerTheme({ resume, visible }) {
  const { profile, settings } = resume;
  const accent = settings.accent || '#4f46e5';
  const showIcons = settings.showIcons !== false;
  const contacts = contactRows(profile, settings);
  const sections = buildSections(resume, visible);

  const ui = {
    Section: ({ section, children }) => (
      <section data-section={section.key} className="mt-4 first:mt-0">
        {children}
      </section>
    ),

    Heading: ({ section }) => (
      <h2 className="resume-heading mb-2 flex items-center gap-2">
        <span
          className="flex h-[1.5em] w-[1.5em] flex-none items-center justify-center rounded-full text-white"
          style={{ background: 'var(--accent)' }}
        >
          {showIcons && section.icon ? (
            <Glyph icon={section.icon} size="0.85em" />
          ) : (
            <span className="text-[calc(7pt*var(--rf-fs,1))] font-bold">{section.title.slice(0, 1)}</span>
          )}
        </span>
        <span className="text-[calc(10pt*var(--rf-fs,1))] font-bold uppercase tracking-[0.14em] text-ink-900">
          {section.title}
        </span>
        <span className="h-px flex-1" style={{ background: 'var(--accent-line)' }} />
      </h2>
    ),

    SubHeading: ({ children }) => (
      <h3
        className="resume-heading mb-1 mt-2.5 ml-[calc(1.5em+0.5rem)] text-[calc(8.5pt*var(--rf-fs,1))] font-bold uppercase tracking-[0.12em] first:mt-0"
        style={{ color: 'var(--accent-ink)' }}
      >
        {children}
      </h3>
    ),

    // Entries sit in a soft card so the page reads as a stack of blocks.
    Entry: ({ e }) => (
      <div
        className="avoid-break mt-1.5 rounded-lg px-2.5 py-1.5 first:mt-0"
        style={{ background: 'var(--card)' }}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-semibold text-ink-900">{e.primary}</span>
          {e.meta && <span className="whitespace-nowrap text-[calc(8.5pt*var(--rf-fs,1))] text-ink-500">{e.meta}</span>}
        </div>

        {(e.secondary || e.badge) && (
          <div className="flex flex-wrap items-baseline gap-x-2 text-[calc(9.2pt*var(--rf-fs,1))] text-ink-600">
            {e.secondary && <span>{e.secondary}</span>}
            {e.badge && (
              <span
                className="rounded-full px-1.5 py-[1px] text-[calc(7.5pt*var(--rf-fs,1))] font-semibold uppercase tracking-wide text-white"
                style={{ background: 'var(--accent)' }}
              >
                {e.badge}
              </span>
            )}
          </div>
        )}
        {e.tertiary && <div className="text-[calc(8.6pt*var(--rf-fs,1))] text-ink-500">{e.tertiary}</div>}

        {e.detail && (
          <div className="md mt-0.5 leading-[1.45] text-ink-700">
            {renderMarkdown(e.detail, { className: 'mb-1 last:mb-0' })}
          </div>
        )}

        {e.bullets.length > 0 && (
          <ul className="mt-1 list-outside list-disc space-y-0.5 pl-[1.05rem] leading-[1.45] text-ink-700">
            {e.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}

        {e.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {e.tags.map((t) => (
              <span
                key={t}
                className="rounded px-1.5 py-[1px] text-[calc(7.8pt*var(--rf-fs,1))] font-medium"
                style={{ background: 'white', color: 'var(--accent-ink)' }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {e.links.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[calc(8.6pt*var(--rf-fs,1))]">
            {e.links.map((l) => (
              <a
                key={l.key}
                href={l.href}
                className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
                style={{ color: 'var(--accent-ink)' }}
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
      <div className="space-y-1.5">
        {section.skills.map((s) => (
          <div key={s.id} className="avoid-break flex flex-wrap items-baseline gap-x-2">
            <p className="w-[6.8rem] flex-none text-[calc(8.6pt*var(--rf-fs,1))] font-semibold uppercase tracking-wide text-ink-500">
              {s.category}
            </p>
            <p className="min-w-0 flex-1 leading-[1.45] text-ink-700">{s.items.join(' · ')}</p>
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
  };

  const gutter = byDensity(settings.density, { compact: '0.55in', normal: '0.68in', roomy: '0.82in' });

  return (
    <article
      className={`resume-paper font-tech text-ink-800 ${byDensity(settings.density, {
        compact: 'text-[calc(9.2pt*var(--rf-fs,1))]',
        normal: 'text-[calc(9.8pt*var(--rf-fs,1))]',
        roomy: 'text-[calc(10.4pt*var(--rf-fs,1))]',
      })}`}
      style={{
        '--page-margin': '0',
        '--gutter': gutter,
        '--accent': accent,
        '--accent-soft': `color-mix(in srgb, ${accent} 12%, white)`,
        '--accent-ink': `color-mix(in srgb, ${accent} 82%, black)`,
        '--accent-line': `color-mix(in srgb, ${accent} 30%, white)`,
        '--card': `color-mix(in srgb, ${accent} 5%, white)`,
        // Typography picker; a no-op unless the user chose a pairing.
        ...fontVars(settings),
      }}
      {...fontAttrs(settings)}
      lang="en"
    >
      {/* ---- full-bleed band ---- */}
      <header
        className="avoid-break text-white"
        style={{
          background: `linear-gradient(115deg, ${accent} 0%, color-mix(in srgb, ${accent} 72%, black) 100%)`,
          padding: `0.5in ${gutter} 0.42in`,
        }}
      >
        <div className="flex items-center gap-4">
          {settings.showMonogram !== false && initials(profile.name) && (
            <div
              className="flex h-[0.9in] w-[0.9in] flex-none items-center justify-center rounded-full border-[2.5px] border-white/45 text-[calc(17pt*var(--rf-fs,1))] font-bold"
              aria-hidden="true"
            >
              {initials(profile.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-[calc(24pt*var(--rf-fs,1))] font-bold leading-none tracking-tight">{profile.name}</h1>
            {profile.title && (
              <p className="mt-1.5 text-[calc(11pt*var(--rf-fs,1))] font-medium leading-snug text-white/85">{profile.title}</p>
            )}
          </div>
        </div>

        {contacts.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/25 pt-2.5 text-[calc(8.8pt*var(--rf-fs,1))]">
            {contacts.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1.5">
                {showIcons && (
                  <span className="text-white/70">
                    <Glyph icon={c.icon} size="1em" />
                  </span>
                )}
                {c.href ? (
                  <a href={c.href} className="text-white/95 underline decoration-white/35 underline-offset-2">
                    {c.label}
                  </a>
                ) : (
                  <span className="text-white/95">{c.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
      </header>

      <div style={{ padding: `0.34in ${gutter} ${gutter}` }}>{renderSections(sections, ui)}</div>
    </article>
  );
}
