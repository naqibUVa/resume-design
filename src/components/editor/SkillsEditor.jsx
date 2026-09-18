/**
 * @file SkillsEditor.jsx
 * Categorised skill groups — "Languages", "ML & Data", and so on.
 */

import { useResume } from '../../context/ResumeContext.jsx';
import { AddButton, EmptyHint, ItemCard, TagInput, TextField } from './EditorPrimitives.jsx';

/**
 * @returns {JSX.Element}
 */
export default function SkillsEditor() {
  const { resume, addItem, updateItem, removeItem, moveItem, toggleItem, setSectionTitle } = useResume();
  const list = resume.skills;

  return (
    <div className="space-y-4">
      <div className="panel p-4 sm:p-5">
        <TextField
          label="Section heading"
          value={resume.settings.sectionTitles.skills}
          onChange={(v) => setSectionTitle('skills', v)}
          placeholder="Skills"
          className="max-w-xs"
        />
      </div>

      {list.length === 0 ? (
        <EmptyHint>
          No skill groups yet. Group by kind — “Languages”, “Frameworks”, “Methods” — rather than listing
          thirty items in one row.
        </EmptyHint>
      ) : (
        <ul className="space-y-2.5">
          {list.map((s) => (
            <ItemCard
              key={s.id}
              title={s.category}
              subtitle={s.items.length ? s.items.join(' · ') : 'No entries yet'}
              include={s.include !== false}
              onToggleInclude={() => toggleItem('skills', s.id)}
              onMoveUp={() => moveItem('skills', s.id, -1)}
              onMoveDown={() => moveItem('skills', s.id, 1)}
              onRemove={() => removeItem('skills', s.id)}
            >
              <TextField
                label="Category"
                value={s.category}
                onChange={(v) => updateItem('skills', s.id, { category: v })}
                placeholder="Languages"
              />
              <TagInput
                label="Skills"
                values={s.items}
                onChange={(v) => updateItem('skills', s.id, { items: v })}
                placeholder="Python, PyTorch, SQL…"
                hint="Enter or a comma commits a tag. Backspace on an empty field removes the last one."
              />
            </ItemCard>
          ))}
        </ul>
      )}

      <AddButton label="Add a skill group" onClick={() => addItem('skills')} />
    </div>
  );
}
