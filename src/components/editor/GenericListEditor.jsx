/**
 * @file GenericListEditor.jsx
 *
 * One editor panel that can edit any section in the schema registry.
 *
 * The alternative was eleven near-identical files differing only in which
 * `<TextField>`s they contain. This reads the section's `fields` array and
 * lays them out on a six-column grid, so a new section is a data change rather
 * than a new component.
 *
 * The bespoke editors (Experience, Projects, Publications, Skills) stay as they
 * are: their shapes are irregular enough that driving them from a field list
 * would cost more in special cases than it saved.
 */

import { useState } from 'react';
import { Eye, EyeOff, PencilLine, Search } from 'lucide-react';

import { useResume } from '../../context/ResumeContext.jsx';
import { SCHEMA_BY_KEY } from '../../data/sectionSchemas.js';
import { AddButton, BulletEditor, EmptyHint, ItemCard, TagInput, TextArea, TextField } from './EditorPrimitives.jsx';

/** Tailwind column spans, spelled out so the JIT compiler can see them. */
const SPAN = {
  1: 'sm:col-span-1',
  2: 'sm:col-span-2',
  3: 'sm:col-span-3',
  4: 'sm:col-span-4',
  5: 'sm:col-span-5',
  6: 'sm:col-span-6',
};

/**
 * Render one field descriptor.
 *
 * @param {Object} props
 * @param {import('../../data/sectionSchemas.js').FieldSpec} props.field
 * @param {any} props.value
 * @param {(v: any) => void} props.onChange
 * @returns {JSX.Element}
 */
function Field({ field, value, onChange }) {
  const wrap = SPAN[field.span || 3] || SPAN[3];

  switch (field.type) {
    case 'textarea':
      return (
        <div className={wrap}>
          <TextArea
            label={field.label}
            value={value}
            onChange={onChange}
            placeholder={field.placeholder}
            hint={field.hint}
            rows={3}
          />
        </div>
      );

    case 'bullets':
      return (
        <div className={wrap}>
          <BulletEditor label={field.label} values={value} onChange={onChange} hint={field.hint} />
        </div>
      );

    case 'tags':
      return (
        <div className={wrap}>
          <TagInput label={field.label} values={value} onChange={onChange} hint={field.hint} />
        </div>
      );

    case 'select':
      return (
        <div className={wrap}>
          <span className="field-label">{field.label}</span>
          <select
            className="field-input"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            aria-label={field.label}
          >
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {field.hint && <p className="mt-1 text-xs text-ui-faint">{field.hint}</p>}
        </div>
      );

    case 'check':
      return (
        <label className={`${wrap} flex items-center gap-2 pt-6 text-sm text-ui-text`}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-ui-line-strong text-ui-accent focus:ring-ui-accent"
          />
          {field.label}
        </label>
      );

    case 'url':
    default:
      return (
        <div className={wrap}>
          <TextField
            label={field.label}
            value={value}
            onChange={onChange}
            placeholder={field.placeholder}
            hint={field.hint}
            type={field.type === 'url' ? 'url' : 'text'}
          />
        </div>
      );
  }
}

/**
 * @param {{sectionKey: string}} props
 * @returns {JSX.Element}
 */
export default function GenericListEditor({ sectionKey }) {
  const { resume, addItem, updateItem, removeItem, moveItem, toggleItem, setSectionTitle, toggleSection } =
    useResume();

  const schema = SCHEMA_BY_KEY[sectionKey];
  const [filter, setFilter] = useState('');

  if (!schema) {
    return <EmptyHint>Unknown section “{sectionKey}”.</EmptyHint>;
  }

  const items = Array.isArray(resume[sectionKey]) ? resume[sectionKey] : [];
  const sectionOn = resume.settings.sections[sectionKey] !== false;
  const title = resume.settings.sectionTitles[sectionKey] ?? schema.title;

  const needle = filter.trim().toLowerCase();
  const shown = needle
    ? items.filter((it) =>
        `${schema.navLabel(it)} ${schema.navSub(it)}`.toLowerCase().includes(needle)
      )
    : items;

  return (
    <div className="space-y-4">
      {/* ---- section header controls ---- */}
      <div className="panel space-y-3 p-4">
        <p className="text-sm text-ui-muted">{schema.blurb}</p>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <TextField
              label="Heading on the résumé"
              value={title}
              onChange={(v) => setSectionTitle(sectionKey, v)}
              placeholder={schema.title}
              hint="Rename it to whatever your field calls it."
            />
          </div>

          <button
            type="button"
            onClick={() => toggleSection(sectionKey)}
            className={`btn ${sectionOn ? '' : 'border-ui-warning bg-ui-warning-soft text-ui-warning'}`}
            aria-pressed={sectionOn}
          >
            {sectionOn ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
            {sectionOn ? 'Shown' : 'Hidden'}
          </button>
        </div>

        {!sectionOn && (
          <p className="rounded-lg bg-ui-warning-soft px-3 py-2 text-xs text-ui-warning">
            This section is switched off, so nothing below appears on the résumé. Everything you type is still
            saved.
          </p>
        )}
      </div>

      {/* ---- filter, once the list is long enough to need one ---- */}
      {items.length > 6 && (
        <label className="relative block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-faint" aria-hidden="true" />
          <input
            className="field-input pl-9"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={`Filter ${items.length} entries`}
            aria-label={`Filter ${schema.title}`}
          />
        </label>
      )}

      {/* ---- the list ---- */}
      {items.length === 0 ? (
        <EmptyHint>{schema.empty}</EmptyHint>
      ) : (
        <ul className="space-y-2">
          {shown.map((item) => (
            <ItemCard
              key={item.id}
              title={schema.navLabel(item)}
              subtitle={schema.navSub(item)}
              include={item.include !== false}
              onToggleInclude={() => toggleItem(sectionKey, item.id)}
              onMoveUp={() => moveItem(sectionKey, item.id, -1)}
              onMoveDown={() => moveItem(sectionKey, item.id, 1)}
              onRemove={() => removeItem(sectionKey, item.id)}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                {schema.fields.map((field) => (
                  <Field
                    key={field.name}
                    field={field}
                    value={item[field.name]}
                    onChange={(v) => updateItem(sectionKey, item.id, { [field.name]: v })}
                  />
                ))}
              </div>
            </ItemCard>
          ))}
        </ul>
      )}

      {needle && shown.length === 0 && (
        <p className="text-center text-sm text-ui-muted">No entries match “{filter}”.</p>
      )}

      <AddButton label={schema.addLabel} onClick={() => addItem(sectionKey)} />

      <p className="flex items-start gap-2 text-xs text-ui-faint">
        <PencilLine size={13} className="mt-0.5 flex-none" aria-hidden="true" />
        {schema.hint}
      </p>
    </div>
  );
}
