/**
 * @file ActionRail.jsx
 *
 * The document actions, as a narrow vertical rail down the left edge.
 *
 * Why a rail and not a toolbar row
 * --------------------------------
 * The thing being edited is a portrait page. Height is the scarce axis — every
 * horizontal bar stacked above the preview is a slice off the visible sheet —
 * while the space either side of a Letter page on a 13" screen is dead anyway.
 * So the icon-only actions live here, in about 48px of width nobody was using,
 * instead of in a row that costs 56px of height everybody needs.
 *
 * The rail is deliberately NOT a [data-chrome-region]. It is the only route to
 * Download PDF, undo, and — on narrow screens — the editor/preview switch, so
 * hiding the chrome must never take it away. It also carries the visible
 * hide/show toggle itself, which for the same reason cannot live inside
 * anything it collapses.
 *
 * Width and button height come from --bar-height / --control-height, so the
 * rail narrows with the rest of the chrome under compact density and under the
 * max-height:900px rule that a laptop trips automatically.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Download,
  Eye,
  FileDown,
  FileUp,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelTopClose,
  PanelTopOpen,
  Pencil,
  RefreshCw,
  Redo2,
  ScrollText,
  Undo2,
} from 'lucide-react';

import { useResume } from '../../context/ResumeContext.jsx';
import { downloadFile, readFileAsText, suggestFilename } from '../../utils/storage';
import { exportToPdf } from '../../utils/pdfExporter';

/**
 * One icon-only rail button.
 *
 * Icon-only means the accessible name has to come from somewhere: `aria-label`
 * for assistive tech, `title` for the native tooltip, and the flyout below for
 * everyone who is looking at the screen and does not want to wait a second and
 * a half for the browser to explain a glyph.
 *
 * @param {Object} props
 * @param {Function} props.icon        Lucide component.
 * @param {string} props.label         Accessible name and tooltip text.
 * @param {Function} props.onClick
 * @param {boolean} [props.active]     Draws the inner-edge accent bar.
 * @param {boolean} [props.primary]    Filled with the accent (Download PDF).
 * @param {boolean} [props.disabled]
 * @param {string} [props.id]
 * @param {string} [props.className]   Responsive visibility, mostly.
 * @param {string} [props.iconClassName]
 * @param {boolean} [props.pressed]    Sets aria-pressed when this is a toggle.
 * @returns {JSX.Element}
 */
function RailButton({
  icon: Icon,
  label,
  onClick,
  active = false,
  primary = false,
  disabled = false,
  id,
  className = '',
  iconClassName = '',
  pressed,
}) {
  return (
    <div className={`group relative w-full ${className}`}>
      {active && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1 left-0 w-[3px] rounded-r-full bg-ui-accent"
        />
      )}
      <button
        id={id}
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={pressed}
        title={label}
        className={`flex h-control w-full items-center justify-center rounded-lg transition
          disabled:cursor-not-allowed disabled:opacity-50 ${
            primary
              ? 'bg-ui-accent text-ui-on-accent hover:bg-ui-accent-hover'
              : active
                ? 'text-ui-accent'
                : 'text-ui-muted hover:bg-ui-hover hover:text-ui-text'
          }`}
      >
        <Icon size={16} aria-hidden="true" className={iconClassName} />
      </button>

      {/* Flyout, to the right so it never covers the rail itself. Hidden from
          the accessibility tree — aria-label already said this. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2
                   whitespace-nowrap rounded-md border border-ui-line bg-ui-surface px-2 py-1
                   text-xs text-ui-text opacity-0 shadow-panel transition-opacity
                   group-hover:opacity-100 lg:block"
      >
        {label}
      </span>
    </div>
  );
}

/** A hairline between groups of buttons. */
function RailDivider() {
  return <span aria-hidden="true" className="my-1 block h-px w-5 flex-none bg-ui-line" />;
}

/**
 * @param {Object} props
 * @param {'edit'|'preview'} props.mobileView
 * @param {(v: 'edit'|'preview') => void} props.onMobileViewChange
 * @param {boolean} props.railOpen              Is the section nav showing?
 * @param {() => void} props.onRailToggle
 * @returns {JSX.Element}
 */
export default function ActionRail({ mobileView, onMobileViewChange, railOpen, onRailToggle }) {
  const { resume, exportJson, importJson, notify, undo, redo, resetAll } = useResume();

  const fileRef = useRef(null);
  const [printing, setPrinting] = useState(false);
  /** Mirrors <html data-chrome>, which the shared switcher owns. */
  const [chromeHidden, setChromeHidden] = useState(false);

  // The switcher tags every [data-chrome-region] it can find when it boots, and
  // it boots before React has committed anything. If the user left the chrome
  // hidden last session, re-asserting the state once on mount is what makes the
  // regions this app renders catch up. setChrome() is idempotent.
  //
  // After that, follow the shared state rather than owning a copy of it: the
  // keyboard shortcut, Escape, and the dashboard's postMessage can all change
  // it without going through this button.
  useEffect(() => {
    const api = window.AppSuiteTheme;
    if (api) {
      api.setChrome(api.get().chrome);
      setChromeHidden(api.get().chrome === 'hidden');
    }

    const onChange = (e) => setChromeHidden(e.detail?.chrome === 'hidden');
    window.addEventListener('appsuite:themechange', onChange);
    return () => window.removeEventListener('appsuite:themechange', onChange);
  }, []);

  /** Download the résumé as JSON. */
  const handleExport = () => {
    const name = `${suggestFilename(resume.profile.name, 'resume-data')}.json`;
    downloadFile(exportJson(), name, 'application/json');
    notify(`Saved ${name} to your downloads.`, 'success');
  };

  /**
   * Read a picked JSON file back into the store.
   * @param {import('react').ChangeEvent<HTMLInputElement>} e
   */
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;

    try {
      const text = await readFileAsText(file);
      const res = importJson(text);
      notify(
        res.ok ? `Loaded ${file.name}. Your previous version is backed up.` : res.error,
        res.ok ? 'success' : 'error'
      );
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  /** Drive the browser's print pipeline (vector PDF, live links). */
  const handlePdf = async () => {
    setPrinting(true);
    const res = await exportToPdf({
      filename: suggestFilename(resume.profile.name, 'cv'),
    });
    setPrinting(false);
    if (!res.ok) notify(res.reason, 'error');
  };

  // `group`, not `toolbar`: the toolbar role comes with an expectation of
  // arrow-key navigation between its items, and this is a plain list of tab
  // stops.
  return (
    <div
      className="no-print z-40 flex w-bar flex-none flex-col items-center gap-0.5 border-r border-ui-line bg-ui-surface px-1 py-2"
      role="group"
      aria-label="Document actions"
    >
      {/* App mark. Not a button — the identity used to sit in the header and
          cost a whole row; here it costs nothing. */}
      <span
        className="mb-1 grid h-control w-full flex-none place-items-center rounded-lg bg-ui-accent text-ui-on-accent"
        title="Résumé &amp; CV Builder"
      >
        <ScrollText size={16} aria-hidden="true" />
      </span>

      {/* Editor/preview switch, narrow screens only — one pane fits at a time,
          and with the header collapsed this is the only way back. */}
      <RailButton
        icon={Pencil}
        label="Edit"
        className="lg:hidden"
        active={mobileView === 'edit'}
        pressed={mobileView === 'edit'}
        onClick={() => onMobileViewChange('edit')}
      />
      <RailButton
        icon={Eye}
        label="Preview"
        className="lg:hidden"
        active={mobileView === 'preview'}
        pressed={mobileView === 'preview'}
        onClick={() => onMobileViewChange('preview')}
      />
      <span aria-hidden="true" className="my-1 block h-px w-5 flex-none bg-ui-line lg:hidden" />

      <RailButton icon={Undo2} label="Undo (last 30 edits)" onClick={undo} />
      <RailButton icon={Redo2} label="Redo" onClick={redo} />

      <RailDivider />

      <RailButton icon={FileDown} label="Export JSON" onClick={handleExport} />
      <RailButton icon={FileUp} label="Import JSON" onClick={() => fileRef.current?.click()} />
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImport}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <RailButton
        icon={RefreshCw}
        label="Reset to the sample résumé"
        onClick={() => {
          if (
            window.confirm('Replace everything with the sample résumé? Your current version is backed up first.')
          ) {
            resetAll();
          }
        }}
      />

      <RailDivider />

      <RailButton
        id="download-pdf-button"
        icon={printing ? Loader2 : Download}
        iconClassName={printing ? 'animate-spin' : ''}
        label="Download PDF (Cmd/Ctrl+P)"
        onClick={handlePdf}
        disabled={printing}
        primary
      />

      <span className="flex-1" />

      {/* ---- layout toggles ----
           Both live below the fold of the rail because they are settings, not
           actions, and both stay reachable whatever else is hidden. */}
      <RailDivider />

      <RailButton
        icon={railOpen ? PanelLeftClose : PanelLeftOpen}
        label={railOpen ? 'Hide the section list' : 'Show the section list'}
        onClick={onRailToggle}
        pressed={!railOpen}
        active={!railOpen}
      />
      <RailButton
        icon={chromeHidden ? PanelTopOpen : PanelTopClose}
        label={chromeHidden ? 'Show the toolbars (Cmd/Ctrl+Shift+H)' : 'Hide the toolbars (Cmd/Ctrl+Shift+H)'}
        onClick={() => window.AppSuiteTheme?.toggleChrome()}
        pressed={chromeHidden}
        active={chromeHidden}
      />
    </div>
  );
}
