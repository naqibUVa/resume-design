/**
 * @file ThemeSelector.jsx
 *
 * Theme picker plus the settings that change how a theme renders: body face,
 * heading face, type size, accent colour, density, how links print, and the
 * contact-icon and monogram switches.
 *
 * The three typography controls sit on their own row because they compose:
 * "Garamond body, monospace headings, one step smaller" is a legitimate answer
 * and no single dropdown could offer it. Size is separate from Density on
 * purpose — one scales the words, the other the space between them, and you
 * routinely want to move only one of the two to win back a line.
 *
 * Two ways to pick a theme, on purpose. The dropdown is grouped by family and
 * names every theme in one glance — it is the fast path once you know what you
 * want, and it does not grow taller as themes are added. The card grid below it
 * carries a hand-drawn miniature of each layout; those are crude by design,
 * because "two columns" or "coloured band on top" is something you recognise
 * instantly in a picture and never quite do in a word. The grid collapses, so
 * the dropdown alone is enough when the preview needs the room.
 */

import { useState } from 'react';
import { Check, ChevronDown, FileText, Heading, Link2, Palette, Ruler, Scaling, Type } from 'lucide-react';

import { THEMES, THEME_FAMILIES, useResume } from '../../context/ResumeContext.jsx';
import {
  FONT_PAIRS,
  FONT_PAIR_BY_ID,
  FONT_SCALES,
  HEAD_FONTS,
} from '../../data/fontStacks.js';
import {
  MARGIN_PRESETS,
  MARGIN_PRESET_BY_ID,
  PAGE_SIZES,
  PAGE_SIZE_BY_ID,
  isFullBleed,
} from '../../data/pageSetup.js';
import { LINK_STYLES } from '../../data/sectionSchemas.js';

/**
 * Accent presets. The first six stay legible in greyscale print; the last two
 * are the LaTeX template's own colours, so the Marker theme can be put back
 * into its source palette with one click.
 */
const ACCENTS = [
  '#4f46e5',
  '#0f766e',
  '#b45309',
  '#be123c',
  '#1d4ed8',
  '#334155',
  '#b6073f',
  '#5b7f0a',
];

/** Themes that ignore the accent colour entirely. */
const NO_ACCENT = ['academic', 'simplistic', 'swish'];

/**
 * A layout miniature.
 *
 * The greys in here are the literal `ink` scale, not suite theme tokens: a
 * miniature is a picture of the printed sheet, so it has to read as ink on
 * white paper inside the card whatever palette the editor is wearing. The card
 * around it is chrome and is themed normally.
 *
 * @param {{id: string, accent: string}} props
 * @returns {JSX.Element|null}
 */
function Mini({ id, accent }) {
  const a = { background: accent };
  const soft = { background: accent, opacity: 0.35 };

  switch (id) {
    case 'academic':
      return (
        <>
          <span className="mx-auto block h-1 w-2/3 rounded-sm bg-ink-400" />
          <span className="mx-auto block h-[2px] w-1/2 rounded-sm bg-ink-300" />
          <span className="block h-px w-full bg-ink-400" />
          <span className="block h-[2px] w-full rounded-sm bg-ink-200" />
          <span className="block h-[2px] w-5/6 rounded-sm bg-ink-200" />
        </>
      );

    case 'simplistic':
      return (
        <>
          <span className="block h-1 w-1/2 rounded-sm bg-ink-500" />
          <span className="block h-px w-full bg-ink-300" />
          <span className="block h-[2px] w-full rounded-sm bg-ink-200" />
          <span className="block h-[2px] w-full rounded-sm bg-ink-200" />
          <span className="block h-[2px] w-3/4 rounded-sm bg-ink-200" />
        </>
      );

    case 'tech':
      return (
        <>
          <span className="flex items-center gap-[3px] rounded-sm p-[2px]" style={{ ...soft, opacity: 0.18 }}>
            <span className="block h-2.5 w-2.5 rounded-[2px]" style={a} />
            <span className="block h-1 w-1/2 rounded-sm bg-ink-400" />
          </span>
          <span className="flex gap-[3px]">
            <span className="block h-[3px] w-3 rounded-full" style={soft} />
            <span className="block h-[3px] w-4 rounded-full" style={soft} />
            <span className="block h-[3px] w-2 rounded-full" style={soft} />
          </span>
          <span className="block h-[2px] w-5/6 rounded-sm bg-ink-200" />
        </>
      );

    case 'sidebar':
      return (
        <span className="flex h-[26px] gap-[3px]">
          <span className="flex w-1/3 flex-col gap-[3px] rounded-sm p-[2px]" style={a}>
            <span className="block h-1.5 w-1.5 rounded-full bg-white/70" />
            <span className="block h-[2px] w-full rounded-sm bg-white/50" />
            <span className="block h-[2px] w-3/4 rounded-sm bg-white/50" />
          </span>
          <span className="flex flex-1 flex-col gap-[3px]">
            <span className="block h-1 w-2/3 rounded-sm bg-ink-400" />
            <span className="block h-[2px] w-full rounded-sm bg-ink-200" />
            <span className="block h-[2px] w-full rounded-sm bg-ink-200" />
            <span className="block h-[2px] w-4/5 rounded-sm bg-ink-200" />
          </span>
        </span>
      );

    case 'timeline':
      return (
        <>
          {[0, 1, 2].map((i) => (
            <span key={i} className="flex items-center gap-[3px]">
              <span className="block h-[2px] w-2.5 rounded-sm bg-ink-300" />
              <span className="block h-1 w-1 rounded-full" style={a} />
              <span className="block h-[2px] flex-1 rounded-sm bg-ink-200" />
            </span>
          ))}
          <span className="flex items-center gap-[3px]">
            <span className="block h-[2px] w-2.5 rounded-sm bg-ink-300" />
            <span className="block h-1 w-1 rounded-full" style={a} />
            <span className="block h-[2px] w-2/3 rounded-sm bg-ink-200" />
          </span>
        </>
      );

    case 'editorial':
      return (
        <>
          <span className="block h-1.5 w-3/4 rounded-sm bg-ink-500" />
          <span className="block h-px w-full bg-ink-400" />
          <span className="flex gap-[4px]">
            <span className="block h-[2px] w-1/3 rounded-sm" style={soft} />
            <span className="flex flex-1 flex-col gap-[3px]">
              <span className="block h-[2px] w-full rounded-sm bg-ink-200" />
              <span className="block h-[2px] w-5/6 rounded-sm bg-ink-200" />
            </span>
          </span>
        </>
      );

    case 'compact':
      return (
        <span className="flex gap-[4px]">
          {[0, 1].map((col) => (
            <span key={col} className="flex flex-1 flex-col gap-[2px]">
              <span className="block h-[2px] w-2/3 rounded-sm" style={a} />
              <span className="block h-[2px] w-full rounded-sm bg-ink-200" />
              <span className="block h-[2px] w-full rounded-sm bg-ink-200" />
              <span className="block h-[2px] w-3/4 rounded-sm bg-ink-200" />
              <span className="block h-[2px] w-full rounded-sm bg-ink-200" />
            </span>
          ))}
        </span>
      );

    case 'banner':
      return (
        <>
          <span className="flex items-center gap-[3px] rounded-sm px-[3px] py-[4px]" style={a}>
            <span className="block h-2.5 w-2.5 rounded-full border border-white/60" />
            <span className="block h-1 w-1/2 rounded-sm bg-white/80" />
          </span>
          <span className="block h-[2px] w-full rounded-sm bg-ink-200" />
          <span className="block h-[2px] w-full rounded-sm bg-ink-200" />
          <span className="block h-[2px] w-2/3 rounded-sm bg-ink-200" />
        </>
      );

    // Fixed palette — the miniature shows the real olive/crimson, not the accent.
    case 'swish':
      return (
        <>
          <span className="block h-1 w-3/5 rounded-sm bg-ink-500" />
          <span
            className="block h-[3px] w-full"
            style={{ background: 'linear-gradient(to right,#88ac0b,#b7cd6d 45%,#fff)' }}
          />
          <span className="flex items-center gap-[3px]">
            <span className="block h-[2px] w-2.5 rounded-sm bg-ink-300" />
            <span className="block h-[2px] flex-1 rounded-sm bg-ink-200" />
          </span>
          <span className="flex items-center gap-[3px]">
            <span className="block h-2 w-2 flex-none rounded-full" style={{ background: '#920532' }} />
            <span className="block h-[2px] flex-1 rounded-sm bg-ink-200" />
          </span>
        </>
      );

    case 'marker':
      return (
        <>
          <span className="flex items-center gap-[3px]">
            <span className="block h-[2px] w-2.5 flex-none rounded-sm" style={a} />
            <span className="block h-1 w-1/2 rounded-sm bg-ink-500" />
          </span>
          {[0, 1].map((i) => (
            <span key={i} className="flex items-center gap-[3px]">
              <span className="block h-2 w-2 flex-none rounded-full" style={a} />
              <span className="flex flex-1 flex-col gap-[2px]">
                <span className="block h-[2px] w-full rounded-sm bg-ink-300" />
                <span className="block h-[2px] w-3/4 rounded-sm bg-ink-200" />
              </span>
            </span>
          ))}
        </>
      );

    default:
      return null;
  }
}

/** Shared by every `<select>` in the settings strip. */
const SELECT_CLASS =
  'rounded-md border border-ui-line bg-ui-surface px-1.5 py-0.5 text-xs text-ui-text focus:border-ui-accent focus:outline-none focus:ring-2 focus:ring-ui-accent';

/**
 * One labelled dropdown in the settings strip.
 *
 * @param {Object} props
 * @param {Function} props.icon      Lucide component drawn before the label.
 * @param {string} props.label       Visible on wide screens, screen-reader only below.
 * @param {string} [props.title]     Tooltip; usually the selected option's note.
 * @param {string|number} props.value
 * @param {Function} props.onChange  Receives the raw string from the event.
 * @param {string} [props.width]     Tailwind max-width for long option labels.
 * @param {JSX.Element[]} props.children
 * @returns {JSX.Element}
 */
function Picker({ icon: Icon, label, title, value, onChange, width = '', children }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-ui-muted" title={title}>
      <Icon size={13} className="text-ui-faint" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${SELECT_CLASS} ${width}`}
        aria-label={label}
      >
        {children}
      </select>
    </label>
  );
}

/**
 * @returns {JSX.Element}
 */
export default function ThemeSelector() {
  const { resume, setTheme, setSetting } = useResume();
  const {
    theme,
    accent,
    density,
    showIcons,
    showMonogram,
    fontPair,
    fontHead,
    fontScale,
    linkStyle,
    pageSize,
    pageMargin,
  } = resume.settings;

  const [showGrid, setShowGrid] = useState(false);

  const current = THEMES.find((t) => t.id === theme) || THEMES[0];
  const accentUsed = !NO_ACCENT.includes(theme);
  const font = FONT_PAIR_BY_ID[fontPair] || FONT_PAIRS[0];
  const size = FONT_SCALES.find((s) => s.value === fontScale) || FONT_SCALES[2];
  const links = LINK_STYLES.find((s) => s.value === linkStyle) || LINK_STYLES[0];
  const paper = PAGE_SIZE_BY_ID[pageSize] || PAGE_SIZES[0];
  const margin = MARGIN_PRESET_BY_ID[pageMargin] || MARGIN_PRESETS[0];
  const bleed = isFullBleed(theme);

  return (
    <div className="no-print space-y-2.5">
      {/* ---- the dropdown: every theme, grouped, one click away ---- */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-[13rem] flex-1 items-center gap-1.5">
          <span className="sr-only">Résumé theme</span>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="field-input py-1.5 text-sm font-medium"
            aria-label="Résumé theme"
          >
            {THEME_FAMILIES.map((g) => (
              <optgroup key={g.family} label={g.family}>
                {g.themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} — {t.tone}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => setShowGrid((v) => !v)}
          className="btn btn-ghost btn-xs flex-none"
          aria-expanded={showGrid}
        >
          <ChevronDown
            size={13}
            aria-hidden="true"
            className={`transition-transform ${showGrid ? 'rotate-180' : ''}`}
          />
          {showGrid ? 'Hide' : 'Browse'} layouts
        </button>
      </div>

      <p className="text-[0.7rem] leading-snug text-ui-muted">{current.blurb}</p>

      {/* ---- the visual grid, collapsed by default ---- */}
      {showGrid && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Résumé theme">
          {THEMES.map((t) => {
            const active = t.id === theme;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(t.id)}
                title={t.blurb}
                className={`group relative rounded-lg border p-2 text-left transition ${
                  active
                    ? 'border-ui-accent bg-ui-surface ring-2 ring-ui-accent'
                    : 'border-ui-line bg-ui-surface hover:border-ui-line-strong hover:bg-ui-hover'
                }`}
              >
                {active && (
                  <Check size={13} className="absolute right-1.5 top-1.5 text-ui-accent" aria-hidden="true" />
                )}
                {/* Stays ink-50: this is the miniature's paper, see Mini(). */}
                <span aria-hidden="true" className="mb-1.5 block space-y-[3px] rounded bg-ink-50 p-1.5">
                  <Mini id={t.id} accent={accent} />
                </span>
                <span className="block text-[0.7rem] font-semibold leading-tight text-ui-text">{t.label}</span>
                <span className="block text-[0.62rem] leading-tight text-ui-faint">{t.tone}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ---- typography: body face, heading face, size ---- */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Picker
          icon={Type}
          label="Font"
          title={font.note}
          value={fontPair}
          onChange={(v) => setSetting('fontPair', v)}
          width="max-w-[11rem]"
        >
          {FONT_PAIRS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </Picker>

        <Picker
          icon={Heading}
          label="Headings"
          title="Set the headings in a different face from the body. “Match font” follows the pairing on the left."
          value={fontHead}
          onChange={(v) => setSetting('fontHead', v)}
          width="max-w-[10rem]"
        >
          <option value="pair">Match font</option>
          {HEAD_FONTS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </Picker>

        <Picker
          icon={Scaling}
          label="Size"
          title={`${size.note} Spacing is unchanged — that is what Density controls.`}
          value={fontScale}
          onChange={(v) => setSetting('fontScale', Number(v))}
        >
          {FONT_SCALES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Picker>
      </div>

      {/* ---- page setup: sheet size and the margin that repeats on every page ---- */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Picker
          icon={FileText}
          label="Page"
          title={`${paper.note} The export prints at this size, and the preview measures its page breaks against it.`}
          value={pageSize}
          onChange={(v) => setSetting('pageSize', v)}
          width="max-w-[9rem]"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Picker>

        <Picker
          icon={Ruler}
          label="Margins"
          title={
            bleed
              ? `${margin.note} ${current.label} runs to the paper edge, so this sets the top and bottom margin only — the sides stay full-bleed.`
              : `${margin.note} Applied to every printed page, not just the first.`
          }
          value={pageMargin}
          onChange={(v) => setSetting('pageMargin', v)}
          width="max-w-[10rem]"
        >
          {MARGIN_PRESETS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
              {m.inches ? ` — ${m.inches} in` : ''}
            </option>
          ))}
        </Picker>

        {bleed && <span className="text-[0.7rem] text-ui-faint">sides stay full-bleed</span>}
      </div>

      {/* ---- accent, density, link style and the two display switches ---- */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-1.5">
          <Palette size={13} className="text-ui-faint" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only text-xs text-ui-muted">Accent</span>
          {ACCENTS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSetting('accent', c)}
              className={`h-4 w-4 rounded-full ring-offset-1 ring-offset-ui-surface transition ${
                accent === c ? 'ring-2 ring-ui-text' : 'ring-1 ring-ui-line hover:ring-ui-line-strong'
              } ${accentUsed ? '' : 'opacity-45'}`}
              style={{ background: c }}
              aria-label={`Accent ${c}`}
              aria-pressed={accent === c}
              title={accentUsed ? c : `${current.label} uses a fixed palette and ignores the accent`}
            />
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-xs text-ui-muted">
          Density
          <select
            value={density}
            onChange={(e) => setSetting('density', e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="compact">Compact</option>
            <option value="normal">Normal</option>
            <option value="roomy">Roomy</option>
          </select>
        </label>

        <Picker
          icon={Link2}
          label="Links"
          title={
            theme === 'simplistic'
              ? 'The Simplistic theme always prints the address — a parser reads the text, not the href.'
              : `Prints “${links.note}”. The link itself is the full address either way.`
          }
          value={linkStyle}
          onChange={(v) => setSetting('linkStyle', v)}
          width="max-w-[9rem]"
        >
          {LINK_STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Picker>

        <label
          className="flex items-center gap-1.5 text-xs text-ui-muted"
          title={
            theme === 'simplistic'
              ? 'The Simplistic theme never draws icons — an ATS reads text, not glyphs.'
              : 'Icons beside email, GitHub, LinkedIn and the project links.'
          }
        >
          <input
            type="checkbox"
            checked={showIcons !== false}
            onChange={(e) => setSetting('showIcons', e.target.checked)}
            className="h-3.5 w-3.5 rounded border-ui-line-strong text-ui-accent focus:ring-ui-accent"
          />
          Icons
          {theme === 'simplistic' && <span className="text-ui-faint">(n/a)</span>}
        </label>

        <label className="flex items-center gap-1.5 text-xs text-ui-muted" title="Initials block in the header.">
          <input
            type="checkbox"
            checked={showMonogram !== false}
            onChange={(e) => setSetting('showMonogram', e.target.checked)}
            className="h-3.5 w-3.5 rounded border-ui-line-strong text-ui-accent focus:ring-ui-accent"
          />
          Monogram
        </label>
      </div>
    </div>
  );
}
