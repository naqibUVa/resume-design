/**
 * @file CompactTheme.jsx
 *
 * For the CV that has outgrown one page. Two columns, small type, tight
 * leading and every ornament removed except a rule under each heading.
 *
 * Sections are distributed by `balanceColumns()`, which weighs each one by how
 * much vertical space it is likely to need rather than by how many entries it
 * has — a three-entry Experience block with bullets is taller than a
 * twelve-entry Awards list, and splitting on count alone produces two very
 * lopsided columns.
 *
 * The columns are independent blocks, not CSS multi-columns, so a page break
 * cuts each one cleanly instead of reflowing the whole document.
 */

import { renderMarkdown } from '../../utils/markdown.js';
import { formatAuthors, publicationUrl, sortPublications } from '../../utils/bibtexParser.js';
import { balanceColumns, buildSections } from './sectionModel.js';
import { Glyph, contactRows, renderSections } from './SectionRenderer.jsx';
import { byDensity } from './themeHelpers.js';
import { fontAttrs, fontVars } from '../../data/fontStacks.js';

/**
 * @param {{resume: Object, visible: Object}} props
 * @returns {JSX.Element}
 */
export default function CompactTheme({ resume, visible }) {
  const { profile, settings } = resume;
  const accent = settings.accent || '#4f46e5';
  const showIcons = settings.showIcons !== false;
  const contacts = contactRows(profile, settings);
  const [left, right] = balanceColumns(buildSections(resume, visible));

  const ui = {
    Section: ({ section, children }) => (
      <section data-section={section.key} className="mt-3.5 first:mt-0">
        {children}
      </section>
    ),

    Heading: ({ section }) => (
      <h2
        className="resume-heading mb-1.5 border-b pb-[2px] text-[calc(8.5pt*var(--rf-fs,1))] font-bold uppercase tracking-[0.14em] text-ink-900"
        style={{ borderColor: 'var(--accent)' }}
      >
        {showIcons && section.icon && (
          <span className="mr-1 align-[-0.12em] text-[color:var(--accent)]">
            <Glyph icon={section.icon} size="0.95em" />
          </span>
        )}
        {section.title}
      </h2>
    ),

    SubHeading: ({ children }) => (
      <h3 className="resume-heading mb-0.5 mt-1.5 text-[calc(8pt*var(--rf-fs,1))] font-bold uppercase tracking-[0.1em] text-ink-500 first:mt-0">
        {children}
      </h3>
    ),

    Entry: ({ e }) => (
      <div className="avoid-break mt-1.5 first:mt-0 leading-[1.35]">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-ink-900">{e.primary}</span>
          {e.meta && <span className="flex-none whitespace-nowrap text-[calc(7.8pt*var(--rf-fs,1))] text-ink-500">{e.meta}</span>}
        </div>

        {(e.secondary || e.badge) && (
          <div className="text-[calc(8.4pt*var(--rf-fs,1))] text-ink-600">
            {e.secondary}
            {e.secondary && e.badge && ' · '}
            {e.badge && <span className="font-medium text-[color:var(--accent-ink)]">{e.badge}</span>}
          </div>
        )}
        {e.tertiary && <div className="text-[calc(7.8pt*var(--rf-fs,1))] text-ink-500">{e.tertiary}</div>}

        {e.detail && (
          <div className="md text-[calc(8.4pt*var(--rf-fs,1))] leading-[1.35] text-ink-700">
            {renderMarkdown(e.detail, { className: 'mb-0.5 last:mb-0' })}
          </div>
        )}

        {e.bullets.length > 0 && (
          <ul className="list-outside list-disc pl-[0.85rem] text-[calc(8.4pt*var(--rf-fs,1))] leading-[1.35] text-ink-700">
            {e.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}

        {e.tags.length > 0 && <div className="text-[calc(7.8pt*var(--rf-fs,1))] italic text-ink-500">{e.tags.join(', ')}</div>}

        {e.links.length > 0 && (
          <div className="flex flex-wrap gap-x-2 text-[calc(7.8pt*var(--rf-fs,1))]">
            {e.links.map((l) => (
              <a
                key={l.key}
                href={l.href}
                className="inline-flex items-center gap-0.5 underline underline-offset-2"
                style={{ color: 'var(--accent-ink)' }}
              >
                {showIcons && <Glyph icon={l.icon} size="0.9em" />}
                <span>{l.label}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    ),

    Prose: ({ section }) => (
      <div className="md text-[calc(8.6pt*var(--rf-fs,1))] leading-[1.4] text-ink-700">
        {renderMarkdown(section.text, { className: 'mb-1 last:mb-0' })}
      </div>
    ),

    Inline: ({ section }) => <p className="text-[calc(8.6pt*var(--rf-fs,1))] leading-[1.4] text-ink-700">{section.inlineText}</p>,

    Skills: ({ section }) => (
      <div className="space-y-0.5 text-[calc(8.4pt*var(--rf-fs,1))] leading-[1.35]">
        {section.skills.map((s) => (
          <p key={s.id} className="avoid-break">
            <span className="font-semibold text-ink-900">{s.category}: </span>
            <span className="text-ink-700">{s.items.join(', ')}</span>
          </p>
        ))}
      </div>
    ),

    Publications: ({ section }) => {
      const pubs = sortPublications(section.pubGroups.flatMap((g) => g.items));
      return (
        <ol className="space-y-1 text-[calc(8.4pt*var(--rf-fs,1))] leading-[1.35]">
          {pubs.map((p, i) => {
            const url = publicationUrl(p);
            return (
              <li key={p.id} className="avoid-break flex gap-1.5">
                <span className="flex-none tabular-nums text-ink-400">{i + 1}.</span>
                <span>
                  <span className="font-medium text-ink-900">
                    {url ? (
                      <a href={url} className="underline underline-offset-2">
                        {p.title}
                      </a>
                    ) : (
                      p.title
                    )}
                  </span>{' '}
                  <span className="text-ink-600">
                    {formatAuthors(p.authors, { style: 'initials', max: 4 })}
                    {p.venue && <em> · {p.venue}</em>}
                    {p.year && ` · ${p.year}`}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      );
    },
  };

  return (
    <article
      className={`resume-paper font-tech text-ink-800 ${byDensity(settings.density, {
        compact: 'text-[calc(8.4pt*var(--rf-fs,1))]',
        normal: 'text-[calc(8.9pt*var(--rf-fs,1))]',
        roomy: 'text-[calc(9.4pt*var(--rf-fs,1))]',
      })}`}
      style={{
        '--page-margin': byDensity(settings.density, {
          compact: '0.4in',
          normal: '0.5in',
          roomy: '0.6in',
        }),
        '--accent': accent,
        '--accent-soft': `color-mix(in srgb, ${accent} 12%, white)`,
        '--accent-ink': `color-mix(in srgb, ${accent} 82%, black)`,
        // Typography picker; a no-op unless the user chose a pairing.
        ...fontVars(settings),
      }}
      {...fontAttrs(settings)}
      lang="en"
    >
      <header className="avoid-break mb-3.5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1.5 border-b-2 pb-2" style={{ borderColor: 'var(--accent)' }}>
        <div className="min-w-0">
          <h1 className="text-[calc(17pt*var(--rf-fs,1))] font-bold leading-none tracking-tight text-ink-900">{profile.name}</h1>
          {profile.title && <p className="mt-0.5 text-[calc(9pt*var(--rf-fs,1))] text-ink-600">{profile.title}</p>}
        </div>

        {contacts.length > 0 && (
          <div className="grid max-w-[3.6in] grid-cols-2 gap-x-3 gap-y-[1px] text-[calc(7.8pt*var(--rf-fs,1))] text-ink-600">
            {contacts.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1 truncate">
                {showIcons && (
                  <span className="text-[color:var(--accent)]">
                    <Glyph icon={c.icon} size="0.95em" />
                  </span>
                )}
                {c.href ? (
                  <a href={c.href} className="truncate underline underline-offset-2">
                    {c.label}
                  </a>
                ) : (
                  <span className="truncate">{c.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="grid grid-cols-2 gap-x-[0.34in] items-start">
        <div>{renderSections(left, ui)}</div>
        <div>{renderSections(right, ui)}</div>
      </div>
    </article>
  );
}
