/**
 * @file ResumePreview.jsx
 *
 * The live preview, and the thing that actually gets printed.
 *
 * The active theme is rendered **twice**:
 *
 *   1. On screen, inside a scaled, scrollable container — so it can sit in a
 *      half-width pane without either overflowing or being unreadable.
 *   2. Through `createPortal` into `#print-portal`, a plain `<div>` that is a
 *      sibling of the React root.
 *
 * The second copy is the one the print stylesheet shows. Printing the on-screen
 * copy instead would inherit its `transform: scale()` and its `overflow`
 * ancestors, which is exactly how "my PDF is one clipped page" happens. A
 * portal costs one extra render of a small tree and removes the whole class of
 * problem.
 *
 * This file also owns the page geometry, because it is the only place that can
 * measure the rendered sheet. It writes the chosen size and margins to `:root`
 * (both copies inherit them) and regenerates the `@page` stylesheet the export
 * prints through — see src/data/pageSetup.js for why the margins live on the
 * page box rather than on the sheet's padding.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileWarning, Maximize2, Minus, Pencil, Plus } from 'lucide-react';

import { useResume } from '../../context/ResumeContext.jsx';
import {
  CSS_DPI,
  MARGIN_PRESET_BY_ID,
  PAGE_SIZE_BY_ID,
  isFullBleed,
  pageBreakOffsets,
  resolvePageGeometry,
} from '../../data/pageSetup.js';
import { PRINT_PORTAL_ID, applyPageSetup } from '../../utils/pdfExporter';
import AcademicTheme from '../themes/AcademicTheme.jsx';
import BannerTheme from '../themes/BannerTheme.jsx';
import CompactTheme from '../themes/CompactTheme.jsx';
import EditorialTheme from '../themes/EditorialTheme.jsx';
import MarkerTheme from '../themes/MarkerTheme.jsx';
import SidebarTheme from '../themes/SidebarTheme.jsx';
import SimplisticTheme from '../themes/SimplisticTheme.jsx';
import SwishTheme from '../themes/SwishTheme.jsx';
import TechTheme from '../themes/TechTheme.jsx';
import TimelineTheme from '../themes/TimelineTheme.jsx';
import ThemeSelector from './ThemeSelector.jsx';

/**
 * Keys must match the ids in `THEMES` (ResumeContext). Exported so the smoke
 * test can walk every theme without duplicating the list.
 * @type {Record<string, Function>}
 */
export const THEME_COMPONENTS = {
  academic: AcademicTheme,
  simplistic: SimplisticTheme,
  tech: TechTheme,
  sidebar: SidebarTheme,
  timeline: TimelineTheme,
  editorial: EditorialTheme,
  compact: CompactTheme,
  banner: BannerTheme,
  swish: SwishTheme,
  marker: MarkerTheme,
};

/**
 * @param {Object} props
 * @param {() => void} [props.onBackToEditor] Shown on narrow screens only.
 * @returns {JSX.Element}
 */
export default function ResumePreview({ onBackToEditor }) {
  const { resume, visible } = useResume();
  const { theme: themeId, pageSize, pageMargin } = resume.settings;

  const Theme = THEME_COMPONENTS[themeId] || AcademicTheme;
  const document_ = typeof document !== 'undefined' ? document : null;

  const shellRef = useRef(null);
  const paperRef = useRef(null);

  /** null = fit to the pane; a number = explicit zoom. */
  const [zoom, setZoom] = useState(/** @type {number|null} */ (null));
  const [fitScale, setFitScale] = useState(0.6);
  const [paperHeight, setPaperHeight] = useState(1056); // one Letter page at 96dpi
  /** The theme's own margin, in px, read back off the rendered sheet. */
  const [themeMarginPx, setThemeMarginPx] = useState(/** @type {number|null} */ (null));
  const [portalHost, setPortalHost] = useState(/** @type {HTMLElement|null} */ (null));

  const size = PAGE_SIZE_BY_ID[pageSize] || PAGE_SIZE_BY_ID.letter;
  const paperWidthPx = Math.round(size.widthIn * CSS_DPI);

  // The portal host lives in index.html, outside the React tree.
  useEffect(() => {
    setPortalHost(document_?.getElementById(PRINT_PORTAL_ID) || null);
  }, [document_]);

  // ---- page geometry, part 1: the sheet's own CSS variables ----
  //
  // Written to :root so the on-screen copy and the print portal — which are
  // siblings, not ancestor and descendant — pick up the same numbers.
  //
  // The padding override is only set for a fixed margin preset. On "Theme
  // default" the variables are removed, which both lets each theme's own
  // --page-margin through and leaves the measurement below something honest to
  // read. Declared before the measuring effect on purpose: within one commit
  // React runs layout effects in order, so the variables are already correct
  // when getComputedStyle runs.
  useLayoutEffect(() => {
    if (!document_) return;
    const root = document_.documentElement;

    root.style.setProperty('--page-w', `${size.widthIn}in`);
    root.style.setProperty('--page-h', `${size.heightIn}in`);

    const preset = MARGIN_PRESET_BY_ID[pageMargin];
    // Full-bleed themes keep their zero margin: a gutter around the banner or
    // beside the rail is not a margin, it is a broken layout.
    const override = !isFullBleed(themeId) && preset?.inches != null ? `${preset.inches}in` : null;

    if (override) {
      root.style.setProperty('--rf-pad-v', override);
      root.style.setProperty('--rf-pad-h', override);
    } else {
      root.style.removeProperty('--rf-pad-v');
      root.style.removeProperty('--rf-pad-h');
    }
  }, [document_, size, pageMargin, themeId]);

  // ---- page geometry, part 2: measure ----
  //
  // The unscaled height drives the page estimate, the break rulers and the
  // placeholder the scroll area sizes itself from; the sheet's padding is how
  // the "Theme default" margin becomes a number. An observer rather than a
  // render-time ref read, so it also catches reflows that are not triggered by
  // a state change (webfonts arriving, for one).
  useLayoutEffect(() => {
    const el = paperRef.current;
    if (!el) return undefined;

    const measure = () => {
      setPaperHeight(el.offsetHeight || 1056);
      const sheet = el.querySelector('.resume-paper');
      if (sheet && typeof getComputedStyle === 'function') {
        const pad = parseFloat(getComputedStyle(sheet).paddingTop);
        if (Number.isFinite(pad)) setThemeMarginPx(pad);
      }
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [resume]);

  // ---- page geometry, part 3: publish it to the print pipeline ----
  const geom = useMemo(
    () => resolvePageGeometry({ theme: themeId, pageSize, pageMargin, themeMarginPx }),
    [themeId, pageSize, pageMargin, themeMarginPx]
  );

  useEffect(() => {
    applyPageSetup(geom);
  }, [geom]);

  const breaks = useMemo(() => pageBreakOffsets(geom, paperHeight), [geom, paperHeight]);
  const pages = breaks.length + 1;

  // Track the pane width so the paper always fits, at any window size.
  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;

    const measure = () => {
      const available = el.clientWidth - 48; // padding either side
      setFitScale(Math.min(1, Math.max(0.25, available / paperWidthPx)));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [paperWidthPx]);

  const scale = zoom ?? fitScale;
  const pct = Math.round(scale * 100);

  const isEmpty =
    !resume.profile.name.trim() &&
    visible.order.every((k) =>
      k === 'about' ? !visible.about.trim() : !Array.isArray(visible[k]) || visible[k].length === 0
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ---- preview toolbar ----
           A [data-chrome-region], so Cmd/Ctrl+Shift+H and the rail's toolbar
           toggle take all of it — theme picker, page count and zoom — and hand
           the height to the paper. This is the tallest bar in the app, so it is
           also the one worth folding.

           max-h/overflow are raised off the shared default: every region is
           capped at 40vh with `overflow: hidden`, which is a sane guard for a
           one-line toolbar but silently cuts the bottom row off the layout
           browser when it is open, with no way to scroll to it. The collapse
           itself is unaffected — `.chrome-hidden` sets `max-height: 0` with
           !important. */}
      <div
        data-chrome-region
        className="no-print max-h-[70vh] flex-none space-y-3 overflow-y-auto border-b border-ui-line bg-ui-surface px-bar-x py-3"
      >
        <ThemeSelector />

        <div className="flex flex-wrap items-center gap-2 text-xs text-ui-muted">
          {onBackToEditor && (
            <button type="button" onClick={onBackToEditor} className="btn btn-ghost btn-xs lg:hidden">
              <Pencil size={13} aria-hidden="true" />
              Edit
            </button>
          )}

          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              pages > 2 ? 'bg-ui-warning-soft text-ui-warning' : 'bg-ui-hover text-ui-muted'
            }`}
            title={`${size.label}, ${
              geom.bleed ? `${geom.topIn}in top/bottom margin, full-bleed sides` : `${geom.topIn}in margins`
            }. Estimated from the rendered height — the real break points depend on where sections fall.`}
          >
            ≈ {pages} page{pages === 1 ? '' : 's'} · {size.label}
          </span>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom(Math.max(0.25, Math.round((scale - 0.1) * 100) / 100))}
              className="rounded p-1 text-ui-muted transition hover:bg-ui-hover hover:text-ui-text"
              aria-label="Zoom out"
            >
              <Minus size={14} aria-hidden="true" />
            </button>
            <span className="w-10 text-center font-mono tabular-nums">{pct}%</span>
            <button
              type="button"
              onClick={() => setZoom(Math.min(1.5, Math.round((scale + 0.1) * 100) / 100))}
              className="rounded p-1 text-ui-muted transition hover:bg-ui-hover hover:text-ui-text"
              aria-label="Zoom in"
            >
              <Plus size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(null)}
              className="rounded p-1 text-ui-muted transition hover:bg-ui-hover hover:text-ui-text"
              aria-label="Fit to width"
              title="Fit to width"
            >
              <Maximize2 size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* ---- the paper ---- */}
      <div ref={shellRef} className="scroll-slim min-h-0 flex-1 overflow-auto bg-ui-sunken p-6">
        {isEmpty && (
          <div className="mx-auto mb-4 flex max-w-sm items-start gap-2.5 rounded-lg border border-ui-warning bg-ui-warning-soft p-3 text-xs text-ui-warning">
            <FileWarning size={15} className="mt-px flex-none" aria-hidden="true" />
            <p>
              Everything is either empty or hidden. Add content in the editor, or turn sections back on in the
              Visibility panel.
            </p>
          </div>
        )}

        {/* The wrapper reserves the *scaled* footprint; without it the scroll
            area still thinks the paper is full size and the scrollbars lie. */}
        <div
          className="mx-auto"
          style={{
            width: paperWidthPx * scale,
            height: paperHeight * scale,
          }}
        >
          <div
            ref={paperRef}
            className="relative origin-top-left shadow-paper transition-transform duration-150"
            style={{ width: paperWidthPx, transform: `scale(${scale})` }}
          >
            <Theme resume={resume} visible={visible} />

            {/* Where the printed sheets will part. Drawn from the same
                arithmetic the print engine starts from, so a heading sitting
                just under a ruler is a heading you want to move. Sits inside
                the scaled box, so the offsets are unscaled page pixels.

                Rose stays literal rather than becoming --danger: these are
                annotations drawn on top of the white sheet, and they have to
                stay legible against paper, not against the editor's surface.
                They are also never printed — the portal copy has no rulers. */}
            {breaks.map((y, i) => (
              <div
                key={y}
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-rose-400/60"
                style={{ top: y }}
              >
                <span
                  className="absolute right-0 rounded-bl bg-rose-400/85 px-1.5 py-0.5 font-medium leading-none text-white"
                  style={{ fontSize: 13, top: 0 }}
                >
                  page {i + 2}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- print copy (hidden on screen) ---- */}
      {portalHost && createPortal(<Theme resume={resume} visible={visible} />, portalHost)}
    </div>
  );
}
