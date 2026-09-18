/**
 * @file RawJsonEditor.jsx
 *
 * Direct access to the underlying document.
 *
 * The draft is kept in local state and only applied on an explicit "Apply".
 * Live-parsing as you type would blow the whole résumé away on the first
 * half-typed brace.
 */

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Download, RotateCcw } from 'lucide-react';
import { useResume } from '../../context/ResumeContext.jsx';
import { downloadFile, suggestFilename } from '../../utils/storage';

/**
 * @returns {JSX.Element}
 */
export default function RawJsonEditor() {
  const { resume, exportJson, importJson, notify } = useResume();

  const canonical = useMemo(() => JSON.stringify(resume, null, 2), [resume]);
  const [draft, setDraft] = useState(canonical);
  const [copied, setCopied] = useState(false);

  // Follow the document while the draft is untouched; stop once it diverges,
  // so edits made here are not clobbered by a keystroke in another panel.
  const dirty = draft !== canonical;
  useEffect(() => {
    if (!dirty) setDraft(canonical);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonical]);

  /** @type {{ok: boolean, error?: string}} */
  const validity = useMemo(() => {
    try {
      JSON.parse(draft);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }, [draft]);

  const apply = () => {
    const res = importJson(draft);
    notify(res.ok ? 'Document replaced from the editor.' : res.error, res.ok ? 'success' : 'error');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      notify('Your browser blocked clipboard access — select the text and copy manually.', 'error');
    }
  };

  const lines = draft.split('\n').length;
  const bytes = new Blob([draft]).size;

  return (
    <div className="space-y-4">
      <div className="panel p-4 text-sm text-ui-muted sm:p-5">
        <p>
          This is the exact document that gets saved and exported. Edit it if you want to bulk-rename
          something, paste in a chunk from another file, or fix a field the forms do not expose.
        </p>
        <p className="mt-2 text-xs text-ui-faint">
          Unknown keys are dropped and missing ones are filled with defaults when you apply — that is what
          keeps a half-finished hand edit from breaking the app.
        </p>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-ui-line bg-ui-hover px-3 py-2">
          <span className="font-mono text-xs text-ui-muted">
            {lines} lines · {(bytes / 1024).toFixed(1)} KB
          </span>
          {dirty && (
            <span className="rounded-full bg-ui-warning-soft px-2 py-0.5 text-[0.65rem] font-medium text-ui-warning">
              unapplied changes
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <button type="button" onClick={copy} className="btn btn-ghost btn-xs">
              {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={() =>
                downloadFile(
                  exportJson(),
                  `${suggestFilename(resume.profile.name, 'resume-data')}.json`,
                  'application/json'
                )
              }
              className="btn btn-ghost btn-xs"
            >
              <Download size={13} aria-hidden="true" />
              Download
            </button>
            <button
              type="button"
              onClick={() => setDraft(canonical)}
              disabled={!dirty}
              className="btn btn-ghost btn-xs"
            >
              <RotateCcw size={13} aria-hidden="true" />
              Revert
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!dirty || !validity.ok}
              className="btn btn-primary btn-xs"
            >
              Apply
            </button>
          </div>
        </div>

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          rows={26}
          className="scroll-slim block w-full resize-y border-0 bg-ui-surface p-4 font-mono text-xs leading-relaxed text-ui-text outline-none"
          aria-label="Résumé JSON"
        />

        {!validity.ok && (
          <p className="flex items-start gap-2 border-t border-ui-danger bg-ui-danger-soft px-3 py-2 text-xs text-ui-danger">
            <AlertTriangle size={14} className="mt-px flex-none" aria-hidden="true" />
            <span>Invalid JSON: {validity.error}</span>
          </p>
        )}
      </div>
    </div>
  );
}
