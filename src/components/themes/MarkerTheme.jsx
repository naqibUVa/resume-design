/**
 * @file MarkerTheme.jsx
 *
 * The second reading of the uploaded `.sty`. Both files you added were
 * byte-identical, so rather than ship the same theme twice this one keeps the
 * template's *mechanics* and changes its voice.
 *
 * Kept from the .sty
 *   \circled{...}          filled circles — here numbering **every** entry in
 *                          the document, not just the bibliography, which is
 *                          the natural generalisation of `\thebibitem`
 *   \keyalignment{r}       right-aligned key column
 *   \makefield             1.5em icon box, then value
 *   \smallcaps             \textsc{\lowercase{#1}} on section heads
 *   \faLink before URLs, \faBookmark as the entry prefix
 *   \raggedright, hanging indents
 *
 * Changed
 *   The olive `SwishLineColour` gradient is gone; a solid rule in the marker
 *   colour with a heavy left tab replaces it. And the marker colour follows the
 *   accent picker, so this is the one to reach for when the crimson does not
 *   suit. (`#b6073f` is in the accent presets if it does.)
 */

import { Bookmark, Link as LinkIcon } from 'lucide-react';

import { renderMarkdown } from '../../utils/markdown.js';
import { formatAuthors, publicationUrl, sortPublications } from '../../utils/bibtexParser.js';
import { buildSections } from './sectionModel.js';
import { Glyph, contactRows, renderSections } from './SectionRenderer.jsx';
import { byDensity } from './themeHelpers.js';
import { fontAttrs, fontVars } from '../../data/fontStacks.js';

/** `\keyalignment{r}` column. Slightly wider than Swish's, to carry sub-labels. */
const KEY_COL = '1.25in';
const GAP = '0.18in';
/** Where the content column starts — used to indent anything with no key. */
const INDENT = `calc(${KEY_COL} + ${GAP})`;

/**
 * `\circled{#1}` — white bold sans on a filled disc.
 *
 * @param {{n: number|string, size?: string}} props
 * @returns {JSX.Element}
 */
function Circled({ n, size = '1.55em' }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-latex-sans font-bold leading-none text-white"
      style={{ width: size, height: size, fontSize: '0.62em', background: 'var(--marker)' }}
      aria-hidden="true"
    >
      {n}
    </span>
  );
}

/**
 * @param {{resume: Object, visible: Object}} props
 * @returns {JSX.Element}
 */
export default function MarkerTheme({ resume, visible }) {
  const { profile, settings } = resume;
  const accent = settings.accent || '#b6073f';
  const showIcons = settings.showIcons !== false;
  const contacts = contactRows(profile, settings);
  const sections = buildSections(resume, visible);

  // `\thebibitem` is a document-wide counter in the .sty; so is this. Entries
  // are numbered continuously across every section, which is what makes the
  // circles read as a running index rather than eleven restarted lists.
  let counter = 0;

  const ui = {
    Section: ({ section, children }) => (
      <section data-section={section.key} className="mt-[15pt] first:mt-0">
        {children}
      </section>
    ),

    /** Small-caps head with a solid rule and a heavy tab at its left end. */
    Heading: ({ section }) => (
      <h2 className="resume-heading mb-[5pt] flex items-center gap-[0.6em]">
        <span
          className="font-latex-sans text-[calc(10.5pt*var(--rf-fs,1))] font-bold uppercase tracking-[0.16em]"
          style={{ color: 'var(--marker)' }}
        >
          {section.title}
        </span>
        <span className="h-[1px] flex-1" style={{ background: 'var(--marker-line)' }} aria-hidden="true" />
        {showIcons && section.icon && (
          <span className="opacity-70" style={{ color: 'var(--marker)' }}>
            <Glyph icon={section.icon} size="1em" strokeWidth={1.9} />
          </span>
        )}
      </h2>
    ),

    SubHeading: ({ children }) => (
      <h3
        className="resume-heading mb-[2pt] mt-[9pt] font-latex-sans text-[calc(8.8pt*var(--rf-fs,1))] font-bold uppercase tracking-[0.1em] text-ink-600 first:mt-[3pt]"
        style={{ paddingLeft: INDENT }}
      >
        {children}
      </h3>
    ),

    Entry: ({ e }) => {
      counter += 1;
      const n = counter;

      return (
        <div
          className="avoid-break mt-[7pt] grid items-start first:mt-[3pt]"
          style={{ gridTemplateColumns: `${KEY_COL} 1fr`, columnGap: GAP }}
        >
          {/* key column: circled index above the right-aligned date */}
          <div className="flex flex-col items-end gap-[2pt] pt-[1px]">
            <Circled n={n} />
            {e.meta && (
              <span className="text-right font-latex-sans text-[calc(8.3pt*var(--rf-fs,1))] leading-[1.3] text-ink-600">
                {e.meta}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-baseline gap-[0.45em]">
              {showIcons && (
                <span className="flex-none self-start pt-[0.2em]" style={{ color: 'var(--marker)' }}>
                  <Glyph icon={Bookmark} size="0.75em" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="font-semibold text-black">{e.primary}</span>
                {e.badge && (
                  <span
                    className="ml-[0.5em] inline-block rounded-sm px-[0.4em] py-[0.05em] align-[0.08em] font-latex-sans text-[calc(7.2pt*var(--rf-fs,1))] font-bold uppercase tracking-[0.07em] text-white"
                    style={{ background: 'var(--marker)' }}
                  >
                    {e.badge}
                  </span>
                )}
              </span>
            </div>

            {e.secondary && <div className="italic leading-[1.4] text-ink-800">{e.secondary}</div>}
            {e.tertiary && <div className="text-[calc(8.7pt*var(--rf-fs,1))] leading-[1.4] text-ink-500">{e.tertiary}</div>}

            {e.detail && (
              <div className="md mt-[1pt] leading-[1.42] text-ink-800">
                {renderMarkdown(e.detail, { className: 'mb-[2pt] last:mb-0' })}
              </div>
            )}

            {e.bullets.length > 0 && (
              <ul className="mt-[2pt] space-y-[1.5pt] leading-[1.42] text-ink-800">
                {e.bullets.map((b, i) => (
                  <li key={i} className="flex gap-[0.55em]">
                    <span className="flex-none select-none" style={{ color: 'var(--marker)' }} aria-hidden="true">
                      ▪
                    </span>
                    <span className="min-w-0 flex-1">{b}</span>
                  </li>
                ))}
              </ul>
            )}

            {e.tags.length > 0 && (
              <div className="mt-[3pt] flex flex-wrap gap-[3pt]">
                {e.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-sm px-[0.45em] py-[0.08em] font-latex-sans text-[calc(7.6pt*var(--rf-fs,1))] font-medium"
                    style={{ background: 'var(--marker-soft)', color: 'var(--marker)' }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {e.links.length > 0 && (
              <div className="mt-[2.5pt] flex flex-wrap gap-x-[1.3em] gap-y-[1pt] text-[calc(8.7pt*var(--rf-fs,1))]">
                {e.links.map((l) => (
                  <a key={l.key} href={l.href} className="inline-flex items-baseline gap-[0.4em] text-black">
                    {showIcons && (
                      <span className="self-center" style={{ color: 'var(--marker)' }}>
                        <Glyph icon={l.icon} size="0.92em" />
                      </span>
                    )}
                    <span className="underline decoration-ink-300 underline-offset-2">{l.label}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    },

    Prose: ({ section }) => (
      <div className="md leading-[1.48] text-ink-900" style={{ paddingLeft: INDENT }}>
        {renderMarkdown(section.text, { className: 'mb-[4pt] last:mb-0' })}
      </div>
    ),

    Inline: ({ section }) => (
      <p className="leading-[1.45] text-ink-900" style={{ paddingLeft: INDENT }}>
        {section.inlineText}
      </p>
    ),

    Skills: ({ section }) => (
      <div className="space-y-[4pt]">
        {section.skills.map((s) => (
          <div
            key={s.id}
            className="avoid-break grid items-baseline"
            style={{ gridTemplateColumns: `${KEY_COL} 1fr`, columnGap: GAP }}
          >
            <p
              className="text-right font-latex-sans text-[calc(8.4pt*var(--rf-fs,1))] font-bold uppercase tracking-[0.06em] leading-[1.4]"
              style={{ color: 'var(--marker)' }}
            >
              {s.category}
            </p>
            <p className="leading-[1.42] text-ink-800">{s.items.join(' · ')}</p>
          </div>
        ))}
      </div>
    ),

    Publications: ({ section }) => {
      const pubs = sortPublications(section.pubGroups.flatMap((g) => g.items));
      return (
        <ol className="space-y-[5pt]">
          {pubs.map((p) => {
            counter += 1;
            const url = publicationUrl(p);
            return (
              <li
                key={p.id}
                className="avoid-break grid items-start"
                style={{ gridTemplateColumns: `${KEY_COL} 1fr`, columnGap: GAP }}
              >
                <span className="flex justify-end pt-[1px]">
                  <Circled n={counter} />
                </span>

                <span className="leading-[1.42] text-ink-900">
                  {formatAuthors(p.authors, { style: 'initials' })}
                  {p.year && ` (${p.year}).`} <span className="font-semibold">{p.title}.</span>{' '}
                  {p.venue && <em>{p.venue}</em>}
                  {p.volume && <em>, {p.volume}</em>}
                  {p.number && <em>({p.number})</em>}
                  {p.pages && <span>, {p.pages}</span>}
                  {(p.venue || p.pages) && '.'}
                  {url && (
                    <>
                      {' '}
                      <a href={url} className="inline-flex items-baseline gap-[0.3em] text-black">
                        {showIcons && (
                          <span className="self-center" style={{ color: 'var(--marker)' }}>
                            <Glyph icon={LinkIcon} size="0.85em" />
                          </span>
                        )}
                        <span className="underline decoration-ink-300 underline-offset-2">
                          {p.doi ? `doi:${p.doi}` : url.replace(/^https?:\/\//, '')}
                        </span>
                      </a>
                    </>
                  )}
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
      className={`resume-paper font-latex text-black ${byDensity(settings.density, {
        compact: 'text-[calc(9.3pt*var(--rf-fs,1))]',
        normal: 'text-[calc(9.9pt*var(--rf-fs,1))]',
        roomy: 'text-[calc(10.5pt*var(--rf-fs,1))]',
      })}`}
      style={{
        '--page-margin': byDensity(settings.density, {
          compact: '1.7cm 2cm',
          normal: '2cm 2.25cm',
          roomy: '2.3cm 2.5cm',
        }),
        '--marker': accent,
        '--marker-soft': `color-mix(in srgb, ${accent} 11%, white)`,
        '--marker-line': `color-mix(in srgb, ${accent} 38%, white)`,
        '--accent': accent,
        // Typography picker; a no-op unless the user chose a pairing.
        ...fontVars(settings),
      }}
      {...fontAttrs(settings)}
      lang="en"
    >
      <header className="avoid-break" style={{ paddingLeft: 0 }}>
        <div className="grid items-end" style={{ gridTemplateColumns: `${KEY_COL} 1fr`, columnGap: GAP }}>
          {/* The key column is empty here, which is what lines the name up with
              every entry title further down the page. */}
          <span
            className="mb-[3pt] block h-[2.5pt] w-full justify-self-end"
            style={{ background: 'var(--marker)' }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h1 className="font-latex-sans text-[calc(20pt*var(--rf-fs,1))] font-bold uppercase leading-none tracking-[0.06em] text-black">
              {profile.name}
            </h1>
            {profile.title && (
              <p className="mt-[3pt] font-latex-sans text-[calc(10pt*var(--rf-fs,1))] leading-snug text-ink-600">{profile.title}</p>
            )}
          </div>
        </div>

        {contacts.length > 0 && (
          <p className="mt-[7pt] text-[calc(8.9pt*var(--rf-fs,1))] leading-[1.75]" style={{ paddingLeft: INDENT }}>
            {contacts.map((c) => (
              <span key={c.key} className="mr-[1.9em] inline-flex items-baseline whitespace-nowrap">
                {showIcons && (
                  <span
                    className="inline-flex w-[1.5em] flex-none items-center self-center"
                    style={{ color: 'var(--marker)' }}
                  >
                    <Glyph icon={c.icon} size="0.95em" />
                  </span>
                )}
                {c.href ? (
                  <a href={c.href} className="text-black underline decoration-ink-300 underline-offset-2">
                    {c.label}
                  </a>
                ) : (
                  <span className="text-black">{c.label}</span>
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
