/**
 * @file Header.jsx
 *
 * Top bar: the document's name and where it is saved, the suite theme picker,
 * and the print-settings help.
 *
 * The document actions that used to live here — undo/redo, Export, Import,
 * Reset, Download PDF — moved to the left rail (see ActionRail.jsx), because a
 * portrait page preview needs height far more than it needs width. What is
 * left is text, which reads badly stacked in a 48px column and fine in a row.
 *
 * Both rows are [data-chrome-region]s, so Cmd/Ctrl+Shift+H and the rail's
 * toggle fold the whole header away. Nothing in here is the only route to
 * anything: the actions are in the rail, and so is the toggle that brings this
 * back.
 */

import { useState } from 'react';

import { useResume } from '../../context/ResumeContext.jsx';
import { PAGE_SIZES, PAGE_SIZE_BY_ID } from '../../data/pageSetup.js';
import { printTips } from '../../utils/pdfExporter';

/**
 * @returns {JSX.Element}
 */
export default function Header() {
  const { resume, saveState, storageLabel, folderState, folderPath } = useResume();

  const [showTips, setShowTips] = useState(false);

  // The dialog has its own paper-size selector, and a mismatch with the CSS
  // page size is the other way an export comes out rescaled, so name it.
  const paper = PAGE_SIZE_BY_ID[resume.settings.pageSize] || PAGE_SIZES[0];
  const tips = printTips(paper.label);

  // Where the document actually lives matters more than that it was saved:
  // "saved" in a browser that gets cleared is not the same promise as "saved"
  // in a file sitting next to the app. The line says which one you have.
  const whereSaved =
    folderState === 'active'
      ? `Saved · ${folderPath}`
      : folderState === 'error'
        ? 'Saved in this browser · folder write failed'
        : `Saved in this browser · ${storageLabel}`;

  const saveLabel =
    saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Not saved' : whereSaved;

  const saveTitle =
    folderState === 'active'
      ? `Every change is written to ${folderPath} in the project folder, and mirrored in this browser. Copy the folder and your résumé comes with it.`
      : folderState === 'unavailable'
        ? 'Kept in this browser only. Start the app with start.sh (or npm run dev) and it will also write data/resume.json inside the project folder.'
        : 'Kept in this browser. Checking for the project folder…';

  return (
    <header className="no-print z-30 flex-none">
      {/* Identity, save state, and the slot the suite theme picker docks into.

          The region and the sizing are on different elements on purpose: a
          min-height on the region itself would beat the shared CSS's
          `max-height: 0` and the bar would refuse to collapse. Outside sets the
          behaviour, inside sets the height — min-h-bar rather than a fixed
          py-*, so compact density takes real height out of the bar and not just
          out of the picker sitting in it. */}
      <div data-chrome-region className="border-b border-ui-line bg-ui-surface">
        <div className="flex min-h-bar flex-wrap items-center gap-x-3 gap-y-2 px-bar-x py-1.5">
          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-[0.95rem] font-semibold tracking-tight">Résumé &amp; CV Builder</h1>
            <p
              className={`truncate text-xs ${saveState === 'error' ? 'text-ui-danger' : 'text-ui-muted'}`}
              aria-live="polite"
              title={saveTitle}
            >
              {saveLabel}
            </p>
          </div>

          <div className="flex-1" />

          {/* shared/theme-switcher.js injects its cluster here rather than
              docking it bottom-right over the résumé. It is a horizontal strip
              of labelled pills, which is why it is in this row and not in the
              left rail: it would not fit in 48px, and stacking it there would
              push the layout toggles off a short screen. */}
          <div data-theme-controls className="flex-none" />
        </div>
      </div>

      {/* Print settings help — collapsed by default, one line high when open. */}
      <div
        data-chrome-region
        className="border-b border-ui-line bg-ui-hover px-bar-x py-1.5 text-xs text-ui-muted"
      >
        <button
          type="button"
          onClick={() => setShowTips((v) => !v)}
          className="font-medium text-ui-muted underline decoration-dotted underline-offset-2 hover:text-ui-accent"
          aria-expanded={showTips}
        >
          {showTips ? 'Hide' : 'Show'} print settings for {tips.browser}
        </button>
        {showTips && (
          <ul className="mt-1.5 space-y-0.5 pb-1">
            {tips.tips.map((t) => (
              <li key={t} className="flex gap-2">
                <span aria-hidden="true">·</span>
                <span>{t}</span>
              </li>
            ))}
            <li className="flex gap-2 pt-1 text-ui-faint">
              <span aria-hidden="true">·</span>
              <span>
                The PDF keeps real text and working links — it is not a screenshot, so recruiters and
                applicant-tracking systems can read and click it.
              </span>
            </li>
          </ul>
        )}
      </div>
    </header>
  );
}
