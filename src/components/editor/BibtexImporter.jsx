/**
 * @file BibtexImporter.jsx
 *
 * Publications panel: import from BibTeX (paste or drop a `.bib` file), review
 * what was parsed, then merge the entries you want into the résumé.
 *
 * Two-stage on purpose. Parsing straight into the document makes a 200-entry
 * library impossible to undo; staging lets you untick the ones you do not want
 * before anything is committed.
 */

import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckSquare,
  ExternalLink,
  FileUp,
  Link2,
  Sparkles,
  Square,
  Upload,
} from 'lucide-react';

import { useResume } from '../../context/ResumeContext.jsx';
import { readFileAsText } from '../../utils/storage';
import {
  formatAuthors,
  formatCitation,
  mergePublications,
  parseBibtex,
  publicationUrl,
} from '../../utils/bibtexParser.js';
import sampleBibtex from '../../data/sampleBibtex.bib?raw';
import { AddButton, EmptyHint, ItemCard, TextField } from './EditorPrimitives.jsx';

/**
 * One row in the staged-import review list.
 *
 * @param {Object} props
 * @param {import('../../utils/bibtexParser.js').Publication} props.pub
 * @param {boolean} props.checked
 * @param {() => void} props.onToggle
 * @returns {JSX.Element}
 */
function StagedRow({ pub, checked, onToggle }) {
  const url = publicationUrl(pub);
  return (
    <li>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ui-line bg-ui-surface p-3 transition hover:border-ui-accent">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-0.5 h-4 w-4 flex-none rounded border-ui-line-strong text-ui-accent focus:ring-ui-accent"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium leading-snug text-ui-text">
            {pub.title || <em className="text-ui-faint">Untitled entry</em>}
          </span>
          <span className="mt-0.5 block text-xs text-ui-muted">
            {formatAuthors(pub.authors, { style: 'full', max: 4 }) || 'No authors listed'}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ui-muted">
            <span className="rounded bg-ui-hover px-1.5 py-0.5 font-medium text-ui-muted">{pub.typeLabel}</span>
            {pub.venue && <span className="italic">{pub.venue}</span>}
            {pub.year && <span className="tabular-nums">{pub.year}</span>}
            {pub.volume && <span>vol. {pub.volume}</span>}
            {pub.pages && <span>pp. {pub.pages}</span>}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-ui-accent hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={11} aria-hidden="true" />
                {pub.doi || 'link'}
              </a>
            )}
          </span>
        </span>
      </label>
    </li>
  );
}

/**
 * @returns {JSX.Element}
 */
export default function BibtexImporter() {
  const { resume, replaceList, addItem, updateItem, removeItem, moveItem, toggleItem, setSectionTitle, notify } =
    useResume();

  const [text, setText] = useState('');
  /** @type {[null | {entries: any[], errors: string[], skipped: number}, Function]} */
  const [staged, setStaged] = useState(null);
  const [picked, setPicked] = useState(/** @type {Set<string>} */ (new Set()));
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const library = resume.publications;

  /**
   * Run the parser over some BibTeX and stage the result for review.
   * @param {string} source
   * @param {string} [origin] Where it came from, for the toast.
   */
  const stage = (source, origin = 'the pasted text') => {
    const result = parseBibtex(source);
    if (!result.entries.length) {
      setStaged(result);
      notify(
        result.errors.length
          ? `No entries could be read from ${origin}. ${result.errors[0]}`
          : `No BibTeX entries found in ${origin}.`,
        'error'
      );
      return;
    }
    setStaged(result);
    setPicked(new Set(result.entries.map((e) => e.id)));
    notify(
      `Parsed ${result.entries.length} entr${result.entries.length === 1 ? 'y' : 'ies'} from ${origin}.` +
        (result.skipped ? ` ${result.skipped} block(s) skipped.` : ''),
      'success'
    );
  };

  /** @param {File} file */
  const loadFile = async (file) => {
    if (!/\.(bib|bibtex|txt)$/i.test(file.name)) {
      notify(`${file.name} is not a .bib file.`, 'error');
      return;
    }
    try {
      const raw = await readFileAsText(file);
      setText(raw);
      stage(raw, file.name);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  /** Commit the ticked entries into the résumé. */
  const commit = () => {
    if (!staged) return;
    const chosen = staged.entries.filter((e) => picked.has(e.id));
    if (!chosen.length) {
      notify('Nothing ticked — select at least one entry.', 'error');
      return;
    }
    const { merged, added, duplicates } = mergePublications(library, chosen);
    replaceList('publications', merged);
    setStaged(null);
    setPicked(new Set());
    setText('');
    notify(
      `Added ${added} publication${added === 1 ? '' : 's'}.` +
        (duplicates ? ` ${duplicates} already in your list.` : ''),
      'success'
    );
  };

  const allPicked = staged ? picked.size === staged.entries.length : false;

  const stats = useMemo(
    () => ({
      total: library.length,
      on: library.filter((p) => p.include !== false).length,
    }),
    [library]
  );

  return (
    <div className="space-y-5">
      {/* ---- section heading ---- */}
      <div className="panel p-4 sm:p-5">
        <TextField
          label="Section heading"
          value={resume.settings.sectionTitles.publications}
          onChange={(v) => setSectionTitle('publications', v)}
          placeholder="Publications"
          className="max-w-xs"
        />
      </div>

      {/* ---- import ---- */}
      <section className="panel space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ui-text">Import BibTeX</h3>
          <button
            type="button"
            onClick={() => {
              setText(sampleBibtex);
              stage(sampleBibtex, 'the bundled sample');
            }}
            className="btn btn-ghost btn-xs"
          >
            <Sparkles size={13} aria-hidden="true" />
            Load sample
          </button>
        </div>

        {/* drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) loadFile(file);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition ${
            dragging ? 'border-ui-accent bg-ui-accent-soft' : 'border-ui-line-strong bg-ui-hover'
          }`}
        >
          <Upload size={22} className={dragging ? 'text-ui-accent' : 'text-ui-faint'} aria-hidden="true" />
          <p className="text-sm text-ui-muted">
            Drop a <code className="rounded bg-ui-surface px-1 py-0.5 text-xs">.bib</code> file here
          </p>
          <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-ghost btn-xs">
            <FileUp size={13} aria-hidden="true" />
            Choose a file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".bib,.bibtex,text/plain"
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) loadFile(f);
            }}
          />
        </div>

        {/* paste area */}
        <div>
          <label htmlFor="bib-paste" className="field-label">
            …or paste BibTeX
          </label>
          <textarea
            id="bib-paste"
            rows={7}
            className="field-textarea font-mono text-xs"
            value={text}
            placeholder={'@article{key2025,\n  title   = {A Paper},\n  author  = {Doe, Jane and Müller, Karl},\n  journal = {Journal of Things},\n  year    = {2025},\n  doi     = {10.1000/xyz}\n}'}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => stage(text)}
              disabled={!text.trim()}
              className="btn btn-primary btn-xs"
            >
              Parse entries
            </button>
            {text && (
              <button
                type="button"
                onClick={() => {
                  setText('');
                  setStaged(null);
                }}
                className="btn btn-ghost btn-xs"
              >
                Clear
              </button>
            )}
            <span className="text-xs text-ui-faint">
              Handles <code>@string</code> abbreviations, LaTeX accents and braced titles.
            </span>
          </div>
        </div>
      </section>

      {/* ---- staged review ---- */}
      {staged && (
        <section className="panel space-y-3 border-ui-accent bg-ui-accent-soft p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ui-text">
              Review {staged.entries.length} parsed entr{staged.entries.length === 1 ? 'y' : 'ies'}
            </h3>
            {staged.entries.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setPicked(allPicked ? new Set() : new Set(staged.entries.map((e) => e.id)))
                }
                className="btn btn-ghost btn-xs"
              >
                {allPicked ? <Square size={13} aria-hidden="true" /> : <CheckSquare size={13} aria-hidden="true" />}
                {allPicked ? 'Untick all' : 'Tick all'}
              </button>
            )}
          </div>

          {staged.errors.length > 0 && (
            <div className="flex gap-2 rounded-lg border border-ui-warning bg-ui-warning-soft p-3 text-xs text-ui-warning">
              <AlertTriangle size={14} className="mt-0.5 flex-none" aria-hidden="true" />
              <div>
                <p className="font-medium">
                  {staged.skipped} block{staged.skipped === 1 ? '' : 's'} could not be read — the rest are fine.
                </p>
                <ul className="mt-1 space-y-0.5">
                  {staged.errors.slice(0, 4).map((e) => (
                    <li key={e}>· {e}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {staged.entries.length > 0 && (
            <>
              <ul className="space-y-2">
                {staged.entries.map((pub) => (
                  <StagedRow
                    key={pub.id}
                    pub={pub}
                    checked={picked.has(pub.id)}
                    onToggle={() =>
                      setPicked((prev) => {
                        const next = new Set(prev);
                        if (next.has(pub.id)) next.delete(pub.id);
                        else next.add(pub.id);
                        return next;
                      })
                    }
                  />
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={commit} className="btn btn-primary btn-xs">
                  Add {picked.size} to publications
                </button>
                <button type="button" onClick={() => setStaged(null)} className="btn btn-ghost btn-xs">
                  Discard
                </button>
                <span className="text-xs text-ui-muted">
                  Entries already in your list (same DOI or citation key) are skipped automatically.
                </span>
              </div>
            </>
          )}
        </section>
      )}

      {/* ---- the library ---- */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-ui-text">
            Your publications{' '}
            <span className="font-normal text-ui-muted">
              ({stats.on} of {stats.total} shown)
            </span>
          </h3>
        </div>

        {library.length === 0 ? (
          <EmptyHint>
            Nothing here yet. Import a <code>.bib</code> file above, or add an entry by hand.
          </EmptyHint>
        ) : (
          <ul className="space-y-2.5">
            {library.map((p) => (
              <ItemCard
                key={p.id}
                title={p.title}
                subtitle={formatCitation(p, { style: 'compact' })}
                include={p.include !== false}
                onToggleInclude={() => toggleItem('publications', p.id)}
                onMoveUp={() => moveItem('publications', p.id, -1)}
                onMoveDown={() => moveItem('publications', p.id, 1)}
                onRemove={() => removeItem('publications', p.id)}
              >
                <TextField
                  label="Title"
                  value={p.title}
                  onChange={(v) => updateItem('publications', p.id, { title: v })}
                />
                <TextField
                  label="Authors"
                  value={formatAuthors(p.authors, { style: 'full' })}
                  onChange={(v) =>
                    updateItem('publications', p.id, {
                      authors: v
                        .split(/,\s*(?:and\s+)?|\s+and\s+/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((full) => {
                          const parts = full.split(/\s+/);
                          return { first: parts.slice(0, -1).join(' '), last: parts.at(-1), full };
                        }),
                    })
                  }
                  hint="Comma or “and” separated. Re-import the .bib to restore exact BibTeX ordering."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Venue (journal / conference)"
                    value={p.venue}
                    onChange={(v) => updateItem('publications', p.id, { venue: v })}
                  />
                  <TextField
                    label="Year"
                    value={p.year}
                    onChange={(v) => updateItem('publications', p.id, { year: v })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <TextField
                    label="Volume"
                    value={p.volume}
                    onChange={(v) => updateItem('publications', p.id, { volume: v })}
                  />
                  <TextField
                    label="Number"
                    value={p.number}
                    onChange={(v) => updateItem('publications', p.id, { number: v })}
                  />
                  <TextField
                    label="Pages"
                    value={p.pages}
                    onChange={(v) => updateItem('publications', p.id, { pages: v })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="DOI"
                    value={p.doi}
                    onChange={(v) => updateItem('publications', p.id, { doi: v })}
                    placeholder="10.1000/xyz123"
                    hint="Rendered as https://doi.org/…"
                  />
                  <TextField
                    label="URL"
                    value={p.url}
                    onChange={(v) => updateItem('publications', p.id, { url: v })}
                    placeholder="https://arxiv.org/abs/…"
                    hint="Used only when there is no DOI."
                  />
                </div>
                {publicationUrl(p) && (
                  <a
                    href={publicationUrl(p)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-ui-accent hover:underline"
                  >
                    <Link2 size={12} aria-hidden="true" />
                    Open {publicationUrl(p)}
                  </a>
                )}
              </ItemCard>
            ))}
          </ul>
        )}

        <AddButton label="Add a publication by hand" onClick={() => addItem('publications')} />
      </section>
    </div>
  );
}
