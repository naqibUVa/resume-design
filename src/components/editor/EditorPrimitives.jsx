/**
 * @file EditorPrimitives.jsx
 *
 * Shared form building blocks used by every editor panel.
 *
 * Not in the original file plan, but the alternative was re-implementing the
 * same labelled input, tag entry and collapsible item card in six places.
 * Keeping them here is what stops the editors from drifting apart visually.
 */

import { useId, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, Plus, Trash2, X } from 'lucide-react';

/**
 * A labelled single-line input.
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {string} props.value
 * @param {(v: string) => void} props.onChange
 * @param {string} [props.placeholder]
 * @param {string} [props.type='text']
 * @param {string} [props.hint]
 * @param {string} [props.className]
 * @returns {JSX.Element}
 */
export function TextField({ label, value, onChange, placeholder, type = 'text', hint, className = '' }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        className="field-input"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={type === 'text'}
      />
      {hint && <p className="mt-1 text-xs text-ui-faint">{hint}</p>}
    </div>
  );
}

/**
 * A labelled multi-line input that grows with a fixed row count.
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {string} props.value
 * @param {(v: string) => void} props.onChange
 * @param {string} [props.placeholder]
 * @param {number} [props.rows=4]
 * @param {string} [props.hint]
 * @param {string} [props.className]
 * @returns {JSX.Element}
 */
export function TextArea({ label, value, onChange, placeholder, rows = 4, hint, className = '' }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        className="field-textarea"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="mt-1 text-xs text-ui-faint">{hint}</p>}
    </div>
  );
}

/**
 * Free-form tag entry. Enter or comma commits; Backspace on an empty field
 * removes the last tag.
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {string[]} props.values
 * @param {(v: string[]) => void} props.onChange
 * @param {string} [props.placeholder]
 * @param {string} [props.hint]
 * @returns {JSX.Element}
 */
export function TagInput({ label, values, onChange, placeholder = 'Type and press Enter', hint }) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const list = Array.isArray(values) ? values : [];

  /** @param {string} raw */
  const commit = (raw) => {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !list.some((v) => v.toLowerCase() === s.toLowerCase()));
    if (parts.length) onChange([...list, ...parts]);
    setDraft('');
  };

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-ui-line bg-ui-surface p-2 focus-within:border-ui-accent focus-within:ring-2 focus-within:ring-ui-accent">
        {list.map((tag, i) => (
          <span key={`${tag}-${i}`} className="chip">
            {tag}
            <button
              type="button"
              onClick={() => onChange(list.filter((_, j) => j !== i))}
              className="-mr-0.5 rounded opacity-50 transition hover:opacity-100"
              aria-label={`Remove ${tag}`}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={id}
          className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-ui-faint"
          value={draft}
          placeholder={list.length ? '' : placeholder}
          onChange={(e) => {
            if (e.target.value.includes(',')) commit(e.target.value);
            else setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit(draft);
            } else if (e.key === 'Backspace' && !draft && list.length) {
              onChange(list.slice(0, -1));
            }
          }}
          onBlur={() => draft.trim() && commit(draft)}
        />
      </div>
      {hint && <p className="mt-1 text-xs text-ui-faint">{hint}</p>}
    </div>
  );
}

/**
 * A line-per-entry textarea, for bullet lists. Simpler to edit than n inputs
 * and it survives paste from a Word document.
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {string[]} props.values
 * @param {(v: string[]) => void} props.onChange
 * @param {string} [props.hint]
 * @returns {JSX.Element}
 */
export function BulletEditor({ label, values, onChange, hint }) {
  const id = useId();
  const text = (Array.isArray(values) ? values : []).join('\n');

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <textarea
        id={id}
        rows={Math.min(10, Math.max(3, text.split('\n').length + 1))}
        className="field-textarea"
        value={text}
        placeholder={'One bullet per line.\nLed the migration of…\nCut p95 latency by 40%…'}
        onChange={(e) => onChange(e.target.value.split('\n'))}
      />
      <p className="mt-1 text-xs text-ui-faint">
        {hint || 'One bullet per line. Blank lines are dropped when the résumé renders.'}
      </p>
    </div>
  );
}

/**
 * Collapsible card wrapping one list item, with include / reorder / delete.
 *
 * @param {Object} props
 * @param {string} props.title Shown on the card head.
 * @param {string} [props.subtitle]
 * @param {boolean} props.include
 * @param {() => void} props.onToggleInclude
 * @param {() => void} props.onMoveUp
 * @param {() => void} props.onMoveDown
 * @param {() => void} props.onRemove
 * @param {boolean} [props.defaultOpen=false]
 * @param {import('react').ReactNode} props.children
 * @returns {JSX.Element}
 */
export function ItemCard({
  title,
  subtitle,
  include,
  onToggleInclude,
  onMoveUp,
  onMoveDown,
  onRemove,
  defaultOpen = false,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <li
      className={`panel overflow-hidden transition ${include ? '' : 'border-dashed opacity-60'}`}
    >
      <div className="flex items-center gap-1 px-2 py-2">
        <GripVertical size={15} className="flex-none text-ui-faint" aria-hidden="true" />

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="min-w-0 flex-1 rounded px-1 py-1 text-left transition hover:bg-ui-hover"
          aria-expanded={open}
        >
          <span className="block truncate text-sm font-medium text-ui-text">
            {title || <em className="text-ui-faint">Untitled</em>}
          </span>
          {subtitle && <span className="block truncate text-xs text-ui-muted">{subtitle}</span>}
        </button>

        <div className="flex flex-none items-center gap-0.5">
          <button
            type="button"
            onClick={onToggleInclude}
            className={`rounded p-1.5 transition ${
              include ? 'text-ui-faint hover:bg-ui-hover hover:text-ui-text' : 'text-ui-warning hover:bg-ui-warning-soft'
            }`}
            title={include ? 'Shown on the résumé — click to hide' : 'Hidden — click to show'}
            aria-pressed={include}
          >
            {include ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={onMoveUp}
            className="rounded p-1.5 text-ui-faint transition hover:bg-ui-hover hover:text-ui-text"
            title="Move up"
          >
            <ChevronUp size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            className="rounded p-1.5 text-ui-faint transition hover:bg-ui-hover hover:text-ui-text"
            title="Move down"
          >
            <ChevronDown size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete “${title || 'this entry'}”? This cannot be undone from here — use Undo in the header.`)) {
                onRemove();
              }
            }}
            className="rounded p-1.5 text-ui-faint transition hover:bg-ui-danger-soft hover:text-ui-danger"
            title="Delete"
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {open && <div className="space-y-4 border-t border-ui-line bg-ui-hover px-4 py-4">{children}</div>}
    </li>
  );
}

/**
 * Full-width "add another" button.
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {() => void} props.onClick
 * @returns {JSX.Element}
 */
export function AddButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ui-line-strong bg-ui-surface px-4 py-3 text-sm font-medium text-ui-muted transition hover:border-ui-accent hover:bg-ui-accent-soft hover:text-ui-accent"
    >
      <Plus size={15} aria-hidden="true" />
      {label}
    </button>
  );
}

/**
 * Shown in place of an empty list.
 *
 * @param {Object} props
 * @param {string} props.children
 * @returns {JSX.Element}
 */
export function EmptyHint({ children }) {
  return (
    <p className="rounded-xl border border-dashed border-ui-line bg-ui-surface px-4 py-6 text-center text-sm text-ui-muted">
      {children}
    </p>
  );
}
