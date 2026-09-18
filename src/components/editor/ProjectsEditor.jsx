/**
 * @file ProjectsEditor.jsx
 *
 * Projects: title, Markdown description, tech-stack tags, and the three link
 * slots (live demo, source, related paper).
 */

import { ExternalLink, FileText, Github } from 'lucide-react';
import { useResume } from '../../context/ResumeContext.jsx';
import { renderMarkdown, safeHref } from '../../utils/markdown.js';
import { AddButton, EmptyHint, ItemCard, TagInput, TextArea, TextField } from './EditorPrimitives.jsx';

/**
 * The three link fields a project can carry.
 * @type {Array<{key: string, label: string, icon: Function, placeholder: string}>}
 */
const LINK_FIELDS = [
  { key: 'demo', label: 'Live demo', icon: ExternalLink, placeholder: 'https://demo.example.com' },
  { key: 'source', label: 'Source code', icon: Github, placeholder: 'https://github.com/you/project' },
  { key: 'paper', label: 'Relevant paper', icon: FileText, placeholder: 'https://doi.org/10.1000/xyz' },
];

/**
 * @returns {JSX.Element}
 */
export default function ProjectsEditor() {
  const { resume, addItem, updateItem, removeItem, moveItem, toggleItem, setSectionTitle } = useResume();
  const list = resume.projects;

  return (
    <div className="space-y-4">
      <div className="panel p-4 sm:p-5">
        <TextField
          label="Section heading"
          value={resume.settings.sectionTitles.projects}
          onChange={(v) => setSectionTitle('projects', v)}
          placeholder="Projects"
          className="max-w-xs"
        />
      </div>

      {list.length === 0 ? (
        <EmptyHint>
          No projects yet. Two or three you can actually link to beat a long list of names nobody can check.
        </EmptyHint>
      ) : (
        <ul className="space-y-2.5">
          {list.map((p) => {
            const linkCount = LINK_FIELDS.filter((f) => safeHref(p[f.key])).length;
            return (
              <ItemCard
                key={p.id}
                title={p.title}
                subtitle={[
                  p.tech.length ? p.tech.slice(0, 4).join(' · ') : null,
                  linkCount ? `${linkCount} link${linkCount > 1 ? 's' : ''}` : null,
                ]
                  .filter(Boolean)
                  .join('  —  ')}
                include={p.include !== false}
                onToggleInclude={() => toggleItem('projects', p.id)}
                onMoveUp={() => moveItem('projects', p.id, -1)}
                onMoveDown={() => moveItem('projects', p.id, 1)}
                onRemove={() => removeItem('projects', p.id)}
              >
                <TextField
                  label="Title"
                  value={p.title}
                  onChange={(v) => updateItem('projects', p.id, { title: v })}
                  placeholder="Sparse Attention Profiler"
                />

                <TextArea
                  label="Description"
                  rows={4}
                  value={p.description}
                  onChange={(v) => updateItem('projects', p.id, { description: v })}
                  placeholder="What it does, what was hard, what the result was."
                  hint="Markdown: **bold**, *italic*, `code`, [links](https://…), and - bullet lists."
                />

                {p.description.trim() && (
                  <details className="rounded-lg border border-ui-line bg-ui-surface px-3 py-2">
                    <summary className="cursor-pointer text-xs font-medium text-ui-muted">
                      Markdown preview
                    </summary>
                    <div className="md mt-2 text-sm text-ui-text">
                      {renderMarkdown(p.description, { className: 'mb-2 last:mb-0' })}
                    </div>
                  </details>
                )}

                <TagInput
                  label="Tech stack"
                  values={p.tech}
                  onChange={(v) => updateItem('projects', p.id, { tech: v })}
                  placeholder="PyTorch, Triton, CUDA…"
                  hint="Rendered as badges in the Tech theme, as a plain list in the others."
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  {LINK_FIELDS.map(({ key, label, icon: Icon, placeholder }) => {
                    const raw = p[key] ?? '';
                    const bad = raw.trim() !== '' && !safeHref(raw);
                    return (
                      <div key={key}>
                        <label className="field-label flex items-center gap-1.5">
                          <Icon size={13} className="text-ui-faint" aria-hidden="true" />
                          {label}
                        </label>
                        <input
                          type="url"
                          className={`field-input ${bad ? 'border-ui-warning bg-ui-warning-soft' : ''}`}
                          value={raw}
                          placeholder={placeholder}
                          onChange={(e) => updateItem('projects', p.id, { [key]: e.target.value })}
                        />
                        {bad && (
                          <p className="mt-1 text-xs text-ui-warning">
                            Not a linkable address — it will be left off the résumé.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ItemCard>
            );
          })}
        </ul>
      )}

      <AddButton label="Add a project" onClick={() => addItem('projects')} />
    </div>
  );
}
