/**
 * @file AcademicTheme.jsx
 *
 * A traditional academic CV, dressed up a little.
 *
 * Conventions this follows deliberately:
 *   - Serif throughout (Latin Modern / Palatino / Georgia), because that is
 *     what the field reads.
 *   - Centred name block over a double rule; letterspaced small-caps section
 *     headings on a hairline.
 *   - Publications numbered continuously and grouped by kind, the way a
 *     citation list is numbered on a paper. This is the one section the theme
 *     renders itself rather than through the shared engine.
 *   - No colour blocks and no pills: a badge becomes bracketed italics, which
 *     is how a CV marks "[Poster]" or "[PI]" without looking like a brochure.
 */

import { renderMarkdown } from '../../utils/markdown.js';
import { buildSections } from './sectionModel.js';
import { Citation, Glyph, LinkRow, contactRows, renderSections } from './SectionRenderer.jsx';
import { byDensity } from './themeHelpers.js';
import { fontAttrs, fontVars } from '../../data/fontStacks.js';

const LINK = 'underline decoration-ink-300 underline-offset-2';

/**
 * @param {{resume: Object, visible: Object}} props
 * @returns {JSX.Element}
 */
export default function AcademicTheme({ resume, visible }) {
  const { profile, settings } = resume;
  const showIcons = settings.showIcons !== false;
  const contacts = contactRows(profile, settings);
  const sections = buildSections(resume, visible);

  /** Continuous numbering across every publication group. */
  let citationNumber = 0;

  const ui = {
    Section: ({ section, children }) => (
      <section data-section={section.key} className="mt-5 first:mt-0">
        {children}
      </section>
    ),

    Heading: ({ section }) => (
      <h2 className="resume-heading mb-2 flex items-baseline gap-2 border-b border-ink-800 pb-1 text-[calc(10.5pt*var(--rf-fs,1))] font-bold uppercase tracking-[0.16em] text-ink-900">
        <span>{section.title}</span>
        <span className="h-px flex-1 bg-ink-200" />
      </h2>
    ),

    SubHeading: ({ children }) => (
      <h3 className="resume-heading mb-1 mt-2 text-[calc(9.5pt*var(--rf-fs,1))] font-semibold italic text-ink-800 first:mt-0">
        {children}
      </h3>
    ),

    Entry: ({ e }) => (
      <div className="avoid-break mt-2.5 first:mt-0">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-semibold">
            {e.primary}
            {e.badge && <span className="font-normal italic text-ink-600"> [{e.badge}]</span>}
          </span>
          {e.meta && (
            <span className="flex-none whitespace-nowrap text-[calc(9.5pt*var(--rf-fs,1))] italic text-ink-700">{e.meta}</span>
          )}
        </div>

        {e.secondary && <div className="italic text-ink-800">{e.secondary}</div>}
        {e.tertiary && <div className="text-[calc(9.5pt*var(--rf-fs,1))] text-ink-700">{e.tertiary}</div>}

        {e.tags.length > 0 && (
          <div className="text-[calc(9.5pt*var(--rf-fs,1))] italic text-ink-700">{e.tags.join(', ')}</div>
        )}

        {e.detail && (
          <div className="md mt-0.5 leading-[1.4] text-ink-800">
            {renderMarkdown(e.detail, { className: 'mb-0.5 last:mb-0' })}
          </div>
        )}

        {e.bullets.length > 0 && (
          <ul className="mt-1 list-outside list-disc space-y-0.5 pl-5 leading-[1.4]">
            {e.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}

        <LinkRow
          links={e.links}
          showIcons={showIcons}
          separator="·"
          className="text-[calc(9.5pt*var(--rf-fs,1))] text-ink-700"
          linkClass={LINK}
        />
      </div>
    ),

    Prose: ({ section }) => (
      <div className="md text-justify leading-[1.45]">
        {renderMarkdown(section.text, { className: 'mb-1.5 last:mb-0' })}
      </div>
    ),

    Inline: ({ section }) => <p className="leading-[1.45] text-ink-800">{section.inlineText}</p>,

    Skills: ({ section }) => (
      <dl className="space-y-1">
        {section.skills.map((s) => (
          <div key={s.id} className="avoid-break flex gap-2 leading-[1.4]">
            <dt className="flex-none font-semibold">{s.category}:</dt>
            <dd className="text-ink-800">{s.items.join(', ')}</dd>
          </div>
        ))}
      </dl>
    ),

    Publications: ({ section }) => (
      <div className="space-y-3">
        {section.pubGroups.map((g) => (
          <div key={g.kind}>
            <h3 className="resume-heading mb-1 text-[calc(9.5pt*var(--rf-fs,1))] font-semibold italic text-ink-800">{g.label}</h3>
            <ol className="space-y-1.5">
              {g.items.map((p) => {
                citationNumber += 1;
                return (
                  <li key={p.id} className="avoid-break flex gap-2 leading-[1.4]">
                    <span className="flex-none tabular-nums text-ink-700">[{citationNumber}]</span>
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
      className={`resume-paper font-academic text-ink-900 ${byDensity(settings.density, {
        compact: 'text-[calc(9.8pt*var(--rf-fs,1))]',
        normal: 'text-[calc(10.5pt*var(--rf-fs,1))]',
        roomy: 'text-[calc(11.2pt*var(--rf-fs,1))]',
      })}`}
      style={{
        '--page-margin': byDensity(settings.density, {
          compact: '0.75in',
          normal: '0.9in',
          roomy: '1in',
        }),
        // Typography picker; a no-op unless the user chose a pairing.
        ...fontVars(settings),
      }}
      {...fontAttrs(settings)}
      lang="en"
    >
      <header className="avoid-break mb-5 text-center">
        <h1 className="text-[calc(22pt*var(--rf-fs,1))] font-normal leading-tight tracking-[0.06em]">{profile.name}</h1>
        {profile.title && <p className="mt-1 text-[calc(11pt*var(--rf-fs,1))] italic text-ink-700">{profile.title}</p>}

        {contacts.length > 0 && (
          <p className="mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[calc(9.5pt*var(--rf-fs,1))] text-ink-800">
            {contacts.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1">
                {showIcons && <Glyph icon={c.icon} size="0.95em" className="text-ink-500" />}
                {c.href ? (
                  <a href={c.href} className={LINK}>
                    {c.label}
                  </a>
                ) : (
                  <span>{c.label}</span>
                )}
              </span>
            ))}
          </p>
        )}

        {/* Double rule: the classic CV masthead separator. */}
        <div className="mt-3 h-[2px] w-full bg-ink-900" />
        <div className="mt-[2px] h-px w-full bg-ink-900" />
      </header>

      {renderSections(sections, ui)}
    </article>
  );
}
