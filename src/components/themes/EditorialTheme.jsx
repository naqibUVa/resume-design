/**
 * @file EditorialTheme.jsx
 *
 * Magazine styling. Section headings live in a narrow left margin column
 * rather than above the text, the way a feature spread runs its standfirsts,
 * and the About block opens with a drop cap.
 *
 * The margin column collapses to nothing when a section is a full-width one
 * (publications), so long citations still get the whole measure.
 */

import { renderMarkdown } from '../../utils/markdown.js';
import { buildSections } from './sectionModel.js';
import { Citation, Glyph, contactRows, renderSections } from './SectionRenderer.jsx';
import { byDensity } from './themeHelpers.js';
import { fontAttrs, fontVars } from '../../data/fontStacks.js';

const LABEL_COL = '1.35in';
const LINK = 'underline decoration-ink-300 underline-offset-2';

/**
 * @param {{resume: Object, visible: Object}} props
 * @returns {JSX.Element}
 */
export default function EditorialTheme({ resume, visible }) {
  const { profile, settings } = resume;
  const accent = settings.accent || '#4f46e5';
  const showIcons = settings.showIcons !== false;
  const contacts = contactRows(profile, settings);
  const sections = buildSections(resume, visible);

  let citationNumber = 0;

  const ui = {
    // A two-column grid per section: label left, content right.
    Section: ({ section, children }) => (
      <section
        data-section={section.key}
        className="mt-5 grid gap-x-[0.3in] border-t border-ink-200 pt-3 first:mt-0"
        style={{ gridTemplateColumns: `${LABEL_COL} 1fr` }}
      >
        {children}
      </section>
    ),

    Heading: ({ section }) => (
      <h2 className="resume-heading text-[calc(9pt*var(--rf-fs,1))] font-semibold uppercase leading-snug tracking-[0.2em] text-ink-500">
        {showIcons && section.icon && (
          <span className="mr-1.5 align-[-0.1em] text-[color:var(--accent)]">
            <Glyph icon={section.icon} size="1em" />
          </span>
        )}
        {section.title}
      </h2>
    ),

    SubHeading: ({ children }) => (
      <h3 className="resume-heading mb-1 mt-3 text-[calc(9pt*var(--rf-fs,1))] font-semibold italic text-ink-600 first:mt-0">
        {children}
      </h3>
    ),

    Entry: ({ e }) => (
      <div className="avoid-break mt-3 first:mt-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-[calc(11.5pt*var(--rf-fs,1))] font-semibold leading-tight text-ink-900">{e.primary}</span>
          {e.meta && (
            <span className="whitespace-nowrap text-[calc(8.5pt*var(--rf-fs,1))] uppercase tracking-[0.1em] text-ink-500">
              {e.meta}
            </span>
          )}
        </div>

        {(e.secondary || e.badge) && (
          <p className="mt-0.5 text-[calc(9.5pt*var(--rf-fs,1))] italic text-ink-600">
            {e.secondary}
            {e.secondary && e.badge && ' · '}
            {e.badge && <span className="not-italic font-medium text-[color:var(--accent-ink)]">{e.badge}</span>}
          </p>
        )}
        {e.tertiary && <p className="text-[calc(8.8pt*var(--rf-fs,1))] text-ink-500">{e.tertiary}</p>}

        {e.detail && (
          <div className="md mt-1 leading-[1.5] text-ink-700">
            {renderMarkdown(e.detail, { className: 'mb-1 last:mb-0' })}
          </div>
        )}

        {e.bullets.length > 0 && (
          <ul className="mt-1 space-y-0.5 leading-[1.5] text-ink-700">
            {e.bullets.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span className="flex-none text-ink-300">—</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        {e.tags.length > 0 && (
          <p className="mt-1 text-[calc(8.8pt*var(--rf-fs,1))] uppercase tracking-[0.08em] text-ink-500">
            {e.tags.join(' / ')}
          </p>
        )}

        {e.links.length > 0 && (
          <p className="mt-1 text-[calc(9pt*var(--rf-fs,1))] text-ink-600">
            {e.links.map((l, i) => (
              <span key={l.key}>
                {i > 0 && <span className="mx-1.5 text-ink-300">·</span>}
                <a href={l.href} className={`inline-flex items-center gap-1 ${LINK}`}>
                  {showIcons && <Glyph icon={l.icon} size="0.95em" />}
                  <span>{l.label}</span>
                </a>
              </span>
            ))}
          </p>
        )}
      </div>
    ),

    // Drop cap on the first paragraph — the one flourish this theme allows.
    Prose: ({ section }) => (
      <div className="md editorial-lede text-[calc(10.5pt*var(--rf-fs,1))] leading-[1.55] text-ink-700">
        {renderMarkdown(section.text, { className: 'mb-2 last:mb-0' })}
      </div>
    ),

    Inline: ({ section }) => <p className="leading-[1.5] text-ink-700">{section.inlineText}</p>,

    Skills: ({ section }) => (
      <dl className="space-y-1.5">
        {section.skills.map((s) => (
          <div key={s.id} className="avoid-break">
            <dt className="text-[calc(8.5pt*var(--rf-fs,1))] font-semibold uppercase tracking-[0.12em] text-ink-500">
              {s.category}
            </dt>
            <dd className="leading-[1.5] text-ink-700">{s.items.join(', ')}</dd>
          </div>
        ))}
      </dl>
    ),

    Publications: ({ section }) => (
      <div className="space-y-2.5">
        {section.pubGroups.map((g) => (
          <div key={g.kind}>
            <h3 className="resume-heading mb-1 text-[calc(9pt*var(--rf-fs,1))] font-semibold italic text-ink-600">{g.label}</h3>
            <ol className="space-y-1.5">
              {g.items.map((p) => {
                citationNumber += 1;
                return (
                  <li key={p.id} className="avoid-break flex gap-2 leading-[1.5]">
                    <span
                      className="flex-none text-[calc(8.5pt*var(--rf-fs,1))] font-semibold tabular-nums"
                      style={{ color: 'var(--accent)' }}
                    >
                      {String(citationNumber).padStart(2, '0')}
                    </span>
                    <span>
                      <Citation p={p} linkClass={LINK} />
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    ),
  };

  return (
    <article
      className={`resume-paper font-academic text-ink-800 ${byDensity(settings.density, {
        compact: 'text-[calc(9.6pt*var(--rf-fs,1))]',
        normal: 'text-[calc(10.2pt*var(--rf-fs,1))]',
        roomy: 'text-[calc(10.8pt*var(--rf-fs,1))]',
      })}`}
      style={{
        '--page-margin': byDensity(settings.density, {
          compact: '0.6in',
          normal: '0.75in',
          roomy: '0.9in',
        }),
        '--accent': accent,
        '--accent-ink': `color-mix(in srgb, ${accent} 82%, black)`,
        // Typography picker; a no-op unless the user chose a pairing.
        ...fontVars(settings),
      }}
      {...fontAttrs(settings)}
      lang="en"
    >
      <header className="avoid-break mb-6">
        <p
          className="text-[calc(8.5pt*var(--rf-fs,1))] font-semibold uppercase tracking-[0.32em]"
          style={{ color: 'var(--accent)' }}
        >
          Curriculum Vitae
        </p>
        <h1 className="mt-1.5 text-[calc(32pt*var(--rf-fs,1))] font-normal leading-[0.95] tracking-[-0.015em] text-ink-900">
          {profile.name}
        </h1>
        {profile.title && (
          <p className="mt-2 max-w-[5in] text-[calc(12pt*var(--rf-fs,1))] italic leading-snug text-ink-600">{profile.title}</p>
        )}

        {contacts.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink-900 pt-2 text-[calc(9pt*var(--rf-fs,1))] text-ink-600">
            {contacts.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1.5">
                {showIcons && (
                  <span className="text-[color:var(--accent)]">
                    <Glyph icon={c.icon} size="0.95em" />
                  </span>
                )}
                {c.href ? (
                  <a href={c.href} className={LINK}>
                    {c.label}
                  </a>
                ) : (
                  <span>{c.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
      </header>

      {renderSections(sections, ui)}
    </article>
  );
}
