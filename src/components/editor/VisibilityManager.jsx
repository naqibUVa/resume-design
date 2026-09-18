/**
 * @file VisibilityManager.jsx
 *
 * The inclusion matrix. Two levels of control:
 *
 *   1. Section level — show or hide a whole section, rename its heading, and
 *      reorder it on the page.
 *   2. Item level — tick exactly which projects, publications, roles, degrees
 *      and skill groups appear.
 *
 * This is what makes one document serve several audiences: an academic CV with
 * every paper, and a two-page industry résumé from the same data, without
 * deleting anything.
 */

import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { useResume, SECTION_KEYS } from '../../context/ResumeContext.jsx';
import { SCHEMA_BY_KEY, SCHEMA_KEYS } from '../../data/sectionSchemas.js';
import { formatCitation } from '../../utils/bibtexParser.js';

/**
 * How to label each item in the matrix, per list.
 *
 * The five hand-written entries cover the sections that predate the schema
 * registry; the rest are derived from each schema's own `navLabel`/`navSub`, so
 * the matrix picks up a new section the moment it is registered.
 *
 * @type {Record<string, {list: string, label: (item: any) => string, sub: (item: any) => string}>}
 */
const ITEM_LABELS = {
  experience: {
    list: 'experience',
    label: (e) => e.role || e.company || 'Untitled role',
    sub: (e) => [e.company, e.current ? 'Present' : e.end].filter(Boolean).join(' · '),
  },
  education: {
    list: 'education',
    label: (e) => e.degree || e.institution || 'Untitled degree',
    sub: (e) => [e.institution, e.end].filter(Boolean).join(' · '),
  },
  projects: {
    list: 'projects',
    label: (p) => p.title || 'Untitled project',
    sub: (p) => p.tech.slice(0, 5).join(' · '),
  },
  publications: {
    list: 'publications',
    label: (p) => p.title || 'Untitled entry',
    sub: (p) => formatCitation(p, { style: 'compact' }),
  },
  skills: {
    list: 'skills',
    label: (s) => s.category || 'Untitled group',
    sub: (s) => s.items.join(' · '),
  },
  ...Object.fromEntries(
    SCHEMA_KEYS.map((key) => [
      key,
      { list: key, label: SCHEMA_BY_KEY[key].navLabel, sub: SCHEMA_BY_KEY[key].navSub },
    ])
  ),
};

/**
 * A single tickable item row.
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {string} props.sub
 * @param {boolean} props.checked
 * @param {() => void} props.onToggle
 * @returns {JSX.Element}
 */
function ItemRow({ label, sub, checked, onToggle }) {
  return (
    <li>
      <label
        className={`flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 transition hover:bg-ui-hover ${
          checked ? '' : 'opacity-55'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-0.5 h-4 w-4 flex-none rounded border-ui-line-strong text-ui-accent focus:ring-ui-accent"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-ui-text">{label}</span>
          {sub && <span className="block truncate text-xs text-ui-muted">{sub}</span>}
        </span>
      </label>
    </li>
  );
}

/**
 * @returns {JSX.Element}
 */
export default function VisibilityManager() {
  const {
    resume,
    counts,
    toggleSection,
    setSectionTitle,
    moveSection,
    toggleItem,
    setAllItems,
    notify,
  } = useResume();

  const { settings } = resume;
  const order = settings.sectionOrder;

  /** Quick preset: everything on. */
  const showAll = () => {
    SECTION_KEYS.forEach((k) => {
      if (!settings.sections[k]) toggleSection(k);
    });
    Object.keys(ITEM_LABELS).forEach((k) => setAllItems(k, true));
    notify('Everything is now shown.', 'success');
  };

  /** Quick preset: a lean one-pager — no publications, top items only. */
  const leanPreset = () => {
    if (settings.sections.publications) toggleSection('publications');
    ['projects', 'experience'].forEach((list) => {
      resume[list].forEach((item, i) => {
        const want = i < 3;
        if ((item.include !== false) !== want) toggleItem(list, item.id);
      });
    });
    notify('Trimmed to a lean résumé: publications hidden, top three roles and projects kept.', 'success');
  };

  return (
    <div className="space-y-5">
      <div className="panel flex flex-wrap items-center gap-2 p-4 sm:p-5">
        <p className="mr-auto text-sm text-ui-muted">
          Hidden items stay in your data — they just do not print. Nothing is deleted.
        </p>
        <button type="button" onClick={showAll} className="btn btn-ghost btn-xs">
          Show everything
        </button>
        <button type="button" onClick={leanPreset} className="btn btn-ghost btn-xs">
          Lean résumé preset
        </button>
      </div>

      <ul className="space-y-3">
        {order.map((key, idx) => {
          const on = settings.sections[key];
          const meta = ITEM_LABELS[key];
          const items = meta ? resume[meta.list] : [];
          const c = counts[key];

          return (
            <li key={key} className={`panel overflow-hidden ${on ? '' : 'border-dashed'}`}>
              {/* section head */}
              <div className={`flex items-center gap-2 px-3 py-2.5 ${on ? 'bg-ui-surface' : 'bg-ui-hover'}`}>
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  className={`flex flex-none items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition ${
                    on
                      ? 'bg-ui-accent-soft text-ui-accent ring-1 ring-inset ring-ui-accent hover:bg-ui-accent-soft'
                      : 'bg-ui-hover text-ui-muted hover:bg-ui-active'
                  }`}
                  aria-pressed={on}
                >
                  {on ? <Eye size={13} aria-hidden="true" /> : <EyeOff size={13} aria-hidden="true" />}
                  {on ? 'Shown' : 'Hidden'}
                </button>

                <input
                  value={settings.sectionTitles[key]}
                  onChange={(e) => setSectionTitle(key, e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-ui-text transition hover:border-ui-line focus:border-ui-accent focus:bg-ui-surface focus:outline-none focus:ring-2 focus:ring-ui-accent"
                  aria-label={`Heading for the ${key} section`}
                />

                {c && (
                  <span className="flex-none rounded-full bg-ui-hover px-2 py-0.5 font-mono text-[0.65rem] tabular-nums text-ui-muted">
                    {c.on}/{c.total}
                  </span>
                )}

                <div className="flex flex-none items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveSection(key, -1)}
                    disabled={idx === 0}
                    className="rounded p-1.5 text-ui-faint transition hover:bg-ui-hover hover:text-ui-text disabled:opacity-30"
                    title="Move section up"
                  >
                    <ChevronUp size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(key, 1)}
                    disabled={idx === order.length - 1}
                    className="rounded p-1.5 text-ui-faint transition hover:bg-ui-hover hover:text-ui-text disabled:opacity-30"
                    title="Move section down"
                  >
                    <ChevronDown size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* item matrix */}
              {on && meta && (
                <div className="border-t border-ui-line bg-ui-hover px-2 py-2">
                  {items.length === 0 ? (
                    <p className="px-2.5 py-2 text-xs text-ui-faint">
                      Nothing to include yet — add entries in the {settings.sectionTitles[key]} panel.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 px-2.5 pb-1.5">
                        <button
                          type="button"
                          onClick={() => setAllItems(meta.list, true)}
                          className="text-xs font-medium text-ui-accent hover:underline"
                        >
                          All
                        </button>
                        <span className="text-ui-faint" aria-hidden="true">
                          |
                        </span>
                        <button
                          type="button"
                          onClick={() => setAllItems(meta.list, false)}
                          className="text-xs font-medium text-ui-muted hover:underline"
                        >
                          None
                        </button>
                      </div>
                      <ul>
                        {items.map((item) => (
                          <ItemRow
                            key={item.id}
                            label={meta.label(item)}
                            sub={meta.sub(item)}
                            checked={item.include !== false}
                            onToggle={() => toggleItem(meta.list, item.id)}
                          />
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}

              {on && key === 'about' && (
                <p className="border-t border-ui-line bg-ui-hover px-4 py-2.5 text-xs text-ui-muted">
                  Edit the text in the General panel.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
