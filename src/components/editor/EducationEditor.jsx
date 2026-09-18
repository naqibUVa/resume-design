/**
 * @file EducationEditor.jsx
 * Degrees and academic training.
 */

import { useResume } from '../../context/ResumeContext.jsx';
import { AddButton, EmptyHint, ItemCard, TextArea, TextField } from './EditorPrimitives.jsx';

/**
 * @returns {JSX.Element}
 */
export default function EducationEditor() {
  const { resume, addItem, updateItem, removeItem, moveItem, toggleItem, setSectionTitle } = useResume();
  const list = resume.education;

  return (
    <div className="space-y-4">
      <div className="panel p-4 sm:p-5">
        <TextField
          label="Section heading"
          value={resume.settings.sectionTitles.education}
          onChange={(v) => setSectionTitle('education', v)}
          placeholder="Education"
          className="max-w-xs"
        />
      </div>

      {list.length === 0 ? (
        <EmptyHint>No degrees listed. Academic CVs usually put this first; industry résumés put it last.</EmptyHint>
      ) : (
        <ul className="space-y-2.5">
          {list.map((e) => (
            <ItemCard
              key={e.id}
              title={e.degree}
              subtitle={[e.institution, [e.start, e.end].filter(Boolean).join(' – ')]
                .filter(Boolean)
                .join(' · ')}
              include={e.include !== false}
              onToggleInclude={() => toggleItem('education', e.id)}
              onMoveUp={() => moveItem('education', e.id, -1)}
              onMoveDown={() => moveItem('education', e.id, 1)}
              onRemove={() => removeItem('education', e.id)}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Degree"
                  value={e.degree}
                  onChange={(v) => updateItem('education', e.id, { degree: v })}
                  placeholder="PhD, Computer Science"
                />
                <TextField
                  label="Institution"
                  value={e.institution}
                  onChange={(v) => updateItem('education', e.id, { institution: v })}
                  placeholder="Massachusetts Institute of Technology"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <TextField
                  label="Location"
                  value={e.location}
                  onChange={(v) => updateItem('education', e.id, { location: v })}
                  placeholder="Cambridge, MA"
                />
                <TextField
                  label="Start"
                  value={e.start}
                  onChange={(v) => updateItem('education', e.id, { start: v })}
                  placeholder="2021"
                />
                <TextField
                  label="End"
                  value={e.end}
                  onChange={(v) => updateItem('education', e.id, { end: v })}
                  placeholder="2026 (expected)"
                />
              </div>

              <TextArea
                label="Detail"
                rows={3}
                value={e.detail}
                onChange={(v) => updateItem('education', e.id, { detail: v })}
                placeholder="Thesis title, advisor, GPA, honours."
                hint="Markdown supported. Keep it to one or two lines."
              />
            </ItemCard>
          ))}
        </ul>
      )}

      <AddButton label="Add a degree" onClick={() => addItem('education')} />
    </div>
  );
}
