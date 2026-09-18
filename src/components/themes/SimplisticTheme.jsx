/**
 * @file SimplisticTheme.jsx
 *
 * The ATS-safe résumé.
 *
 * Applicant tracking systems read a PDF top-to-bottom as a single text stream.
 * Anything that fights that reading order — columns, sidebars, text in tables,
 * icons standing in for labels, headings drawn as images — is where parsers
 * drop content. So this theme is deliberately plain:
 *
 *   - One column, one flow, no floats, no grid.
 *   - Conventional section names in plain uppercase text.
 *   - Real bullet lists, real headings, no glyph fonts.
 *   - Black on white, a single hairline rule as the only decoration.
 *   - Contact details as text, never as icons.
 *
 * It deliberately ignores the "Show icons" setting. An icon carries no text for
 * a parser to read, so honouring that switch here would quietly undo the one
 * thing this theme exists to guarantee. Every other theme respects it.
 *
 * It should look unremarkable. That is the feature.
 */

import { formatCitation, publicationUrl, sortPublications } from '../../utils/bibtexParser.js';
import { stripMarkdown } from '../../utils/markdown.js';
import { buildSections } from './sectionModel.js';
import { renderSections } from './SectionRenderer.jsx';
import { byDensity, contactItems } from './themeHelpers.js';
import { fontAttrs, fontVars } from '../../data/fontStacks.js';

/**
 * @param {{resume: Object, visible: Object}} props
 * @returns {JSX.Element}
 */
export default function SimplisticTheme({ resume, visible }) {
  const { profile, settings } = resume;
  // Pinned to the address rather than the name, and deliberately not wired to
  // the link-style setting. A résumé parser reads the text node, not the href,
  // so a masthead reading "GitHub · LinkedIn" gives it nothing to extract. This
  // theme's whole purpose is to survive that machine, the way it already
  // ignores the icon setting.
  const contacts = contactItems(profile, { linkStyle: 'short' });
  const sections = buildSections(resume, visible);

  const ui = {
    Section: ({ section, children }) => (
      <section data-section={section.key} className="mt-4 first:mt-0">
        {children}
      </section>
    ),

    Heading: ({ section }) => (
      <h2 className="resume-heading mb-1.5 border-b border-ink-400 pb-0.5 text-[calc(10.5pt*var(--rf-fs,1))] font-bold uppercase tracking-wider text-black">
        {section.title}
      </h2>
    ),

    SubHeading: ({ children }) => (
      <h3 className="resume-heading mb-1 mt-2 text-[calc(10pt*var(--rf-fs,1))] font-bold text-black first:mt-0">{children}</h3>
    ),

    Entry: ({ e }) => (
      <div className="avoid-break mt-2.5 first:mt-0">
        <p className="font-bold">{e.primary}</p>
        {/* One pipe-separated line: the layout ATS parsers handle most reliably. */}
        {[e.secondary, e.badge, e.meta].filter(Boolean).length > 0 && (
          <p className="leading-snug">{[e.secondary, e.badge, e.meta].filter(Boolean).join(' | ')}</p>
        )}
        {e.tertiary && <p className="leading-snug">{e.tertiary}</p>}
        {e.detail && <p className="leading-[1.45]">{stripMarkdown(e.detail)}</p>}
        {e.tags.length > 0 && (
          <p className="leading-snug">
            <span className="font-semibold">Technologies:</span> {e.tags.join(', ')}
          </p>
        )}
        {e.bullets.length > 0 && (
          <ul className="mt-1 list-outside list-disc space-y-0.5 pl-[1.1rem] leading-[1.45]">
            {e.bullets.map((b, i) => (
              <li key={i}>{stripMarkdown(b)}</li>
            ))}
          </ul>
        )}
        {e.links.length > 0 && (
          <p className="leading-snug">
            {e.links.map((l, i) => (
              <span key={l.key}>
                {i > 0 && ' | '}
                {l.label}:{' '}
                <a href={l.href} className="underline underline-offset-2">
                  {l.href.replace(/^https?:\/\//, '').replace(/^mailto:/, '')}
                </a>
              </span>
            ))}
          </p>
        )}
      </div>
    ),

    Prose: ({ section }) => <p className="leading-[1.45]">{stripMarkdown(section.text)}</p>,

    Inline: ({ section }) => <p className="leading-[1.45]">{section.inlineText}</p>,

    Skills: ({ section }) => (
      <ul className="space-y-0.5">
        {section.skills.map((s) => (
          <li key={s.id} className="avoid-break leading-[1.45]">
            <span className="font-semibold">{s.category}:</span> {s.items.join(', ')}
          </li>
        ))}
      </ul>
    ),

    Publications: ({ section }) => {
      const pubs = sortPublications(section.pubGroups.flatMap((g) => g.items));
      return (
        <ul className="space-y-1.5">
          {pubs.map((p) => {
            const url = publicationUrl(p);
            return (
              <li key={p.id} className="avoid-break leading-[1.45]">
                {formatCitation(p, { style: 'apa', authorStyle: 'full', maxAuthors: 8 })}
                {url && (
                  <>
                    {' '}
                    <a href={url} className="underline underline-offset-2">
                      {url.replace(/^https?:\/\//, '')}
                    </a>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      );
    },
  };

  return (
    <article
      className={`resume-paper font-ats text-black ${byDensity(settings.density, {
        compact: 'text-[calc(9.8pt*var(--rf-fs,1))]',
        normal: 'text-[calc(10.5pt*var(--rf-fs,1))]',
        roomy: 'text-[calc(11.2pt*var(--rf-fs,1))]',
      })}`}
      style={{
        '--page-margin': byDensity(settings.density, {
          compact: '0.6in',
          normal: '0.7in',
          roomy: '0.85in',
        }),
        // Typography picker; a no-op unless the user chose a pairing.
        ...fontVars(settings),
      }}
      {...fontAttrs(settings)}
      lang="en"
    >
      <header className="avoid-break mb-3">
        <h1 className="text-[calc(19pt*var(--rf-fs,1))] font-bold uppercase leading-tight tracking-[0.06em]">{profile.name}</h1>
        {profile.title && <p className="mt-0.5 text-[calc(11pt*var(--rf-fs,1))] leading-snug">{profile.title}</p>}

        {contacts.length > 0 && (
          <p className="mt-1.5 leading-[1.5]">
            {contacts.map((c, i) => (
              <span key={c.key}>
                {i > 0 && <span className="mx-1.5">|</span>}
                {c.href ? (
                  <a href={c.href} className="underline underline-offset-2">
                    {c.label}
                  </a>
                ) : (
                  c.label
                )}
              </span>
            ))}
          </p>
        )}
      </header>

      {renderSections(sections, ui)}
    </article>
  );
}
