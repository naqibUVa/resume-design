/**
 * @file ExperienceEditor.jsx
 * Work / research history.
 */

import { useResume } from '../../context/ResumeContext.jsx';
import { AddButton, BulletEditor, EmptyHint, ItemCard, TextField } from './EditorPrimitives.jsx';

/**
 * Human-readable date range for the card subtitle.
 *
 * @param {{start: string, end: string, current: boolean}} e
 * @returns {string}
 */
function rangeLabel(e) {
  const end = e.current ? 'Present' : e.end;
  if (!e.start && !end) return '';
  return [e.start, end].filter(Boolean).join(' – ');
}

/**
 * @returns {JSX.Element}
 */
export default function ExperienceEditor() {
  const { resume, addItem, updateItem, removeItem, moveItem, toggleItem, setSectionTitle } = useResume();
  const list = resume.experience;

  return (
    <div className="space-y-4">
      <div className="panel p-4 sm:p-5">
        <TextField
          label="Section heading"
          value={resume.settings.sectionTitles.experience}
          onChange={(v) => setSectionTitle('experience', v)}
          placeholder="Experience"
          className="max-w-xs"
        />
      </div>

      {list.length === 0 ? (
        <EmptyHint>No roles yet. Add the most recent first — the list renders in this order.</EmptyHint>
      ) : (
        <ul className="space-y-2.5">
          {list.map((e) => (
            <ItemCard
              key={e.id}
              title={e.role || e.company}
              subtitle={[e.company, rangeLabel(e)].filter(Boolean).join(' · ')}
              include={e.include !== false}
              onToggleInclude={() => toggleItem('experience', e.id)}
              onMoveUp={() => moveItem('experience', e.id, -1)}
              onMoveDown={() => moveItem('experience', e.id, 1)}
              onRemove={() => removeItem('experience', e.id)}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Role"
                  value={e.role}
                  onChange={(v) => updateItem('experience', e.id, { role: v })}
                  placeholder="Graduate Research Assistant"
                />
                <TextField
                  label="Organisation"
                  value={e.company}
                  onChange={(v) => updateItem('experience', e.id, { company: v })}
                  placeholder="MIT CSAIL"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <TextField
                  label="Location"
                  value={e.location}
                  onChange={(v) => updateItem('experience', e.id, { location: v })}
                  placeholder="Cambridge, MA"
                />
                <TextField
                  label="Start"
                  value={e.start}
                  onChange={(v) => updateItem('experience', e.id, { start: v })}
                  placeholder="Sep 2022"
                />
                <div>
                  <TextField
                    label="End"
                    value={e.current ? '' : e.end}
                    onChange={(v) => updateItem('experience', e.id, { end: v })}
                    placeholder={e.current ? 'Present' : 'Jun 2024'}
                  />
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-ui-muted">
                    <input
                      type="checkbox"
                      checked={Boolean(e.current)}
                      onChange={(ev) => updateItem('experience', e.id, { current: ev.target.checked })}
                      className="h-3.5 w-3.5 rounded border-ui-line-strong text-ui-accent focus:ring-ui-accent"
                    />
                    Current role
                  </label>
                </div>
              </div>

              <BulletEditor
                label="Highlights"
                values={e.bullets}
                onChange={(v) => updateItem('experience', e.id, { bullets: v })}
                hint="One per line. Lead with the outcome, then the method — “Cut inference cost 40% by …”."
              />
            </ItemCard>
          ))}
        </ul>
      )}

      <AddButton label="Add a role" onClick={() => addItem('experience')} />
    </div>
  );
}
