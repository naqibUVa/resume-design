/**
 * @file Sidebar.jsx
 *
 * Editor navigation. A vertical rail on desktop; a horizontal scrolling strip
 * of chips on narrow screens, which keeps every panel one tap away without
 * eating vertical space.
 *
 * Whether this is showing at all is SplitView's `railOpen`, driven from the
 * left action rail and remembered per machine. It is not a [data-chrome-region]
 * on purpose: it is the widest thing on screen rather than the tallest, so it
 * wants its own toggle rather than going with the toolbars.
 */

import { useResume } from '../../context/ResumeContext.jsx';

/**
 * @param {Object} props
 * @param {Array<{id: string, label: string, icon: Function, countKey?: string, hint: string, group?: string}>} props.panels
 * @param {string} props.active
 * @param {(id: string) => void} props.onSelect
 * @returns {JSX.Element}
 */
export default function Sidebar({ panels, active, onSelect }) {
  const { counts } = useResume();

  return (
    <nav aria-label="Editor sections" className="no-print h-full">
      {/* ---- narrow screens: horizontal chips ---- */}
      <div className="scroll-slim flex gap-1.5 overflow-x-auto border-b border-ui-line bg-ui-surface px-3 py-2 lg:hidden">
        {panels.map((p) => {
          const Icon = p.icon;
          const isActive = p.id === active;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? 'border-ui-accent bg-ui-accent text-ui-on-accent'
                  : 'border-ui-line bg-ui-surface text-ui-muted hover:border-ui-line-strong hover:bg-ui-hover'
              }`}
            >
              <Icon size={13} aria-hidden="true" />
              {p.label}
            </button>
          );
        })}
      </div>

      {/* ---- desktop: vertical rail ---- */}
      <div className="hidden h-full flex-col border-r border-ui-line bg-ui-surface lg:flex">
        <ul className="scroll-slim flex-1 space-y-0.5 overflow-y-auto p-3">
          {panels.map((p, i) => {
            const Icon = p.icon;
            const isActive = p.id === active;
            const c = p.countKey ? counts[p.countKey] : null;
            // Nineteen flat rows is a wall. A label at each group boundary turns
            // it back into something you can scan.
            const startsGroup = p.group && p.group !== panels[i - 1]?.group;

            return (
              <li key={p.id}>
                {startsGroup && (
                  <p
                    className={`px-3 pb-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-ui-faint ${
                      i === 0 ? 'pt-0.5' : 'mt-2.5 border-t border-ui-line pt-2.5'
                    }`}
                  >
                    {p.group}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                    isActive
                      ? 'bg-ui-accent-soft font-semibold text-ui-accent ring-1 ring-inset ring-ui-accent'
                      : 'text-ui-muted hover:bg-ui-hover hover:text-ui-text'
                  }`}
                >
                  <Icon
                    size={16}
                    aria-hidden="true"
                    className={isActive ? 'text-ui-accent' : 'text-ui-faint group-hover:text-ui-muted'}
                  />
                  <span className="flex-1 truncate">{p.label}</span>
                  {c && c.total > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 font-mono text-[0.65rem] tabular-nums ${
                        c.on === c.total ? 'bg-ui-hover text-ui-muted' : 'bg-ui-warning-soft text-ui-warning'
                      }`}
                      title={`${c.on} of ${c.total} shown on the résumé`}
                    >
                      {c.on}/{c.total}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="border-t border-ui-line px-4 py-3 text-[0.7rem] leading-relaxed text-ui-faint">
          Everything is stored in this browser only. Use <strong className="font-semibold">Export</strong> for a
          copy you can move between machines.
        </p>
      </div>
    </nav>
  );
}
