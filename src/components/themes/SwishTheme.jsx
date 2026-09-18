/**
 * @file SwishTheme.jsx
 *
 * A port of the `cv-llt` LaTeX CV style supplied as `sty1.sty` / `sty2.sty`
 * (LianTze Lim, 2022/2024). The two uploaded files are byte-identical, so this
 * is the faithful reading of them; `MarkerTheme` is the second, looser one.
 *
 * What was carried across, and where it comes from in the .sty
 * ------------------------------------------------------------
 *   \definecolor{SwishLineColour}{HTML}{88AC0B}   the olive rule
 *   \definecolor{MarkerColour}{HTML}{B6073F}      the crimson, always used at
 *                                                 !80!black — hence #920532
 *   \def\@@rubrichead                             section head sitting on a bar
 *                                                 that shades olive→white
 *   \rubricfont{\Large\bfseries\sffamily}         sans, large, bold
 *   \subrubricfont{\large\bfseries\sffamily}      group labels, ditto
 *   \keyalignment{r} \rubricalignment{l}          dates right-aligned in a left
 *                                                 key column
 *   \prefix{... \faBookmark ...}                  a bookmark glyph before each
 *                                                 entry, in marker colour
 *   \newcommand{\makefield}[2]                    contact row: a 1.5em icon box
 *                                                 in marker colour, then value,
 *                                                 then a 2em gap
 *   \circled + \setlength{\bibhang}{2.5em}        publications numbered in
 *                                                 filled circles, hanging 2.5em
 *   \xpretofieldformat{doi}{\faLink}              a link glyph before every DOI
 *   \raggedright                                  no justification anywhere
 *   geometry{a4paper,hmargin=2.25cm,vmargin=2cm}  the page margins
 *
 * Two deliberate departures:
 *
 *   - The sheet stays US Letter. Everything else in the app (the print
 *     stylesheet's `@page`, the preview's 8.5in paper, the exporter's page
 *     estimate) is Letter, and A4 is only 6mm narrower — not worth forking the
 *     page box over. The .sty's *margins* are used as given.
 *   - The palette is fixed rather than following the accent picker. The olive/
 *     crimson pairing is the identity of this style; letting it be recoloured
 *     to indigo would leave a theme that no longer resembles its source. Use
 *     `MarkerTheme` for the accent-driven version.
 */

import { Bookmark, Link as LinkIcon } from 'lucide-react';

import { renderMarkdown } from '../../utils/markdown.js';
import { formatAuthors, publicationUrl, sortPublications } from '../../utils/bibtexParser.js';
import { buildSections } from './sectionModel.js';
import { Glyph, contactRows, renderSections } from './SectionRenderer.jsx';
import { byDensity } from './themeHelpers.js';
import { fontAttrs, fontVars } from '../../data/fontStacks.js';

/** `SwishLineColour!60!white` — the left end of the rubric bar. */
const SWISH = '#b7cd6d';
/** `MarkerColour!80!black`, which is the only form the .sty ever uses. */
const MARKER = '#920532';
/** `\keyalignment{r}` — the right-aligned date column. */
const KEY_COL = '1.15in';

/**
 * @param {{resume: Object, visible: Object}} props
 * @returns {JSX.Element}
 */
export default function SwishTheme({ resume, visible }) {
  const { profile, settings } = resume;
  const showIcons = settings.showIcons !== false;
  const contacts = contactRows(profile, settings);
  const sections = buildSections(resume, visible);

  /** `\@@rubrichead`: heading text, then the olive→white shaded rule. */
  const Heading = ({ section }) => (
    <h2 className="resume-heading mb-[3pt]">
      <span className="block font-latex-sans text-[calc(13pt*var(--rf-fs,1))] font-bold leading-tight text-black">
        {section.title}
      </span>
      <span
        className="mt-[1pt] block h-[2.5pt] w-full"
        style={{ background: `linear-gradient(to right, ${SWISH} 0%, #ffffff 100%)` }}
        aria-hidden="true"
      />
    </h2>
  );

  /**
   * The two-column entry row the .sty's longtable produces: key on the left,
   * right-aligned; content on the right behind a bookmark marker.
   */
  const Entry = ({ e }) => (
    <div
      className="avoid-break mt-[6pt] grid gap-x-[0.16in] first:mt-[2pt]"
      style={{ gridTemplateColumns: `${KEY_COL} 1fr` }}
    >
      <div className="pt-[1px] text-right text-[calc(8.6pt*var(--rf-fs,1))] leading-[1.35] text-ink-700">{e.meta}</div>

      <div className="min-w-0">
        <div className="flex items-baseline gap-[0.5em]">
          {showIcons && (
            <span className="-ml-[1.1em] flex-none self-start pt-[0.18em]" style={{ color: MARKER }}>
              <Glyph icon={Bookmark} size="0.78em" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-black">{e.primary}</span>
            {e.badge && (
              <span
                className="ml-[0.5em] align-baseline font-latex-sans text-[calc(7.6pt*var(--rf-fs,1))] font-bold uppercase tracking-[0.06em]"
                style={{ color: MARKER }}
              >
                {e.badge}
              </span>
            )}
          </span>
        </div>

        {e.secondary && <div className="italic leading-[1.4] text-ink-800">{e.secondary}</div>}
        {e.tertiary && <div className="text-[calc(8.8pt*var(--rf-fs,1))] leading-[1.4] text-ink-600">{e.tertiary}</div>}

        {e.detail && (
          <div className="md leading-[1.42] text-ink-800">
            {renderMarkdown(e.detail, { className: 'mb-[2pt] last:mb-0' })}
          </div>
        )}

        {e.bullets.length > 0 && (
          <ul className="mt-[2pt] list-outside list-disc space-y-[1pt] pl-[1.05em] leading-[1.42] text-ink-800">
            {e.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}

        {e.tags.length > 0 && (
          <div className="mt-[2pt] font-latex-sans text-[calc(8.2pt*var(--rf-fs,1))] text-ink-600">{e.tags.join(' · ')}</div>
        )}

        {e.links.length > 0 && (
          <div className="mt-[2pt] flex flex-wrap gap-x-[1.4em] gap-y-[1pt] text-[calc(8.8pt*var(--rf-fs,1))]">
            {e.links.map((l) => (
              <a key={l.key} href={l.href} className="inline-flex items-baseline gap-[0.4em] text-black">
                {showIcons && (
                  <span className="self-center" style={{ color: MARKER }}>
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

  const ui = {
    Section: ({ section, children }) => (
      <section data-section={section.key} className="mt-[14pt] first:mt-0">
        {children}
      </section>
    ),

    Heading,

    /** `\subrubricfont{\large\bfseries\sffamily}`, `\subrubricalignment{l}`. */
    SubHeading: ({ children }) => (
      <h3
        className="resume-heading mb-[1pt] mt-[8pt] font-latex-sans text-[calc(10pt*var(--rf-fs,1))] font-bold first:mt-[4pt]"
        style={{ paddingLeft: `calc(${KEY_COL} + 0.16in)`, color: MARKER }}
      >
        {children}
      </h3>
    ),

    Entry,

    Prose: ({ section }) => (
      <div className="md leading-[1.45] text-ink-900" style={{ paddingLeft: `calc(${KEY_COL} + 0.16in)` }}>
        {renderMarkdown(section.text, { className: 'mb-[4pt] last:mb-0' })}
      </div>
    ),

    Inline: ({ section }) => (
      <p className="leading-[1.45] text-ink-900" style={{ paddingLeft: `calc(${KEY_COL} + 0.16in)` }}>
        {section.inlineText}
      </p>
    ),

    /** Skill categories reuse the key column, so they line up with everything else. */
    Skills: ({ section }) => (
      <div className="space-y-[3pt]">
        {section.skills.map((s) => (
          <div
            key={s.id}
            className="avoid-break grid gap-x-[0.16in]"
            style={{ gridTemplateColumns: `${KEY_COL} 1fr` }}
          >
            <p className="text-right font-latex-sans text-[calc(8.6pt*var(--rf-fs,1))] font-bold leading-[1.4] text-ink-700">
              {s.category}
            </p>
            <p className="leading-[1.42] text-ink-800">{s.items.join(', ')}</p>
          </div>
        ))}
      </div>
    ),

    /**
     * `\circled{\thebibitem}` in a `\makebox[2.5em][l]`, with `\bibhang{2.5em}`
     * and `\bibitemsep{1.5ex}`. The grid gives the hanging indent for free.
     */
    Publications: ({ section }) => {
      const pubs = sortPublications(section.pubGroups.flatMap((g) => g.items));
      return (
        <ol className="space-y-[5pt]">
          {pubs.map((p, i) => {
            const url = publicationUrl(p);
            return (
              <li
                key={p.id}
                className="avoid-break grid gap-x-[0.5em]"
                style={{ gridTemplateColumns: '2.5em 1fr' }}
              >
                <span
                  className="mt-[0.15em] flex h-[1.5em] w-[1.5em] items-center justify-center rounded-full font-latex-sans text-[calc(7pt*var(--rf-fs,1))] font-bold text-white"
                  style={{ background: MARKER }}
                  aria-hidden="true"
                >
                  {i + 1}
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
                          <span className="self-center" style={{ color: MARKER }}>
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
        // geometry{hmargin=2.25cm, vmargin=2cm}, as a single padding shorthand.
        '--page-margin': byDensity(settings.density, {
          compact: '1.7cm 2cm',
          normal: '2cm 2.25cm',
          roomy: '2.3cm 2.5cm',
        }),
        // The drop cap and any other --accent consumer should follow suit.
        '--accent': MARKER,
        // Typography picker; a no-op unless the user chose a pairing.
        ...fontVars(settings),
      }}
      {...fontAttrs(settings)}
      lang="en"
    >
      {/* ---- header: \headerscale{1}, name large sans, then \makefield row ---- */}
      <header className="avoid-break">
        <h1 className="font-latex-sans text-[calc(21pt*var(--rf-fs,1))] font-bold leading-none tracking-tight text-black">
          {profile.name}
        </h1>

        {profile.title && (
          <p className="mt-[3pt] font-latex-sans text-[calc(10.5pt*var(--rf-fs,1))] leading-snug text-ink-700">{profile.title}</p>
        )}

        {contacts.length > 0 && (
          <p className="mt-[6pt] text-[calc(8.9pt*var(--rf-fs,1))] leading-[1.7]">
            {contacts.map((c) => (
              // \makefield: \makebox[1.5em]{icon} value \hspace{2em}
              <span key={c.key} className="mr-[2em] inline-flex items-baseline whitespace-nowrap">
                {showIcons && (
                  <span
                    className="inline-flex w-[1.5em] flex-none items-center self-center"
                    style={{ color: MARKER }}
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

        {/* The masthead gets the same swish, at full strength. */}
        <span
          className="mt-[7pt] block h-[3pt] w-full"
          style={{ background: `linear-gradient(to right, #88ac0b 0%, ${SWISH} 45%, #ffffff 100%)` }}
          aria-hidden="true"
        />
      </header>

      {renderSections(sections, ui)}
    </article>
  );
}
