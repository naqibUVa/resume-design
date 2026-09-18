/**
 * @file GeneralInfoEditor.jsx
 *
 * Identity, contact details, profile links and the "About Me" blurb.
 */

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { useResume } from '../../context/ResumeContext.jsx';
import { PROFILE_LINKS } from '../../data/sectionSchemas.js';
import { TextArea, TextField } from './EditorPrimitives.jsx';

/** The four slots most people fill in; the other twelve hide behind a toggle. */
const CORE_LINKS = PROFILE_LINKS.filter((l) => l.core);
const MORE_LINKS = PROFILE_LINKS.filter((l) => !l.core);

/**
 * One URL field with its icon in the label.
 *
 * @param {{spec: import('../../data/sectionSchemas.js').ProfileLinkSpec, value: string, onChange: (v: string) => void}} props
 * @returns {JSX.Element}
 */
function LinkField({ spec, value, onChange }) {
  const Icon = spec.icon;
  return (
    <div>
      <label className="field-label flex items-center gap-1.5">
        <Icon size={13} className="text-ui-faint" aria-hidden="true" />
        {spec.label}
      </label>
      <input
        type="url"
        className="field-input"
        value={value ?? ''}
        placeholder={spec.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/**
 * @returns {JSX.Element}
 */
export default function GeneralInfoEditor() {
  const { resume, setProfileField, setContactField, setLinkField, setSectionTitle } = useResume();
  const { profile, settings } = resume;

  // Open the extra slots automatically if any of them already has a value —
  // otherwise importing a JSON file would appear to have lost them.
  const [showMore, setShowMore] = useState(() => MORE_LINKS.some((l) => profile.links[l.key]?.trim()));
  const filledExtras = MORE_LINKS.filter((l) => profile.links[l.key]?.trim()).length;

  return (
    <div className="space-y-6">
      {/* ---- identity ---- */}
      <section className="panel space-y-4 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-ui-text">Identity</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Full name"
            value={profile.name}
            onChange={(v) => setProfileField('name', v)}
            placeholder="Jane Doe"
          />
          <TextField
            label="Headline / title"
            value={profile.title}
            onChange={(v) => setProfileField('title', v)}
            placeholder="PhD Candidate, Machine Learning"
            hint="One line, under the name."
          />
        </div>
      </section>

      {/* ---- contact ---- */}
      <section className="panel space-y-4 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-ui-text">Contact</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Email"
            type="email"
            value={profile.contact.email}
            onChange={(v) => setContactField('email', v)}
            placeholder="jane@university.edu"
          />
          <TextField
            label="Phone"
            type="tel"
            value={profile.contact.phone}
            onChange={(v) => setContactField('phone', v)}
            placeholder="+1 555 019 2837"
          />
          <TextField
            label="Location"
            value={profile.contact.location}
            onChange={(v) => setContactField('location', v)}
            placeholder="Boston, MA"
          />
        </div>
        <p className="text-xs text-ui-faint">
          Leave any field blank to keep it off the page. The email becomes a live <code>mailto:</code> link in
          the PDF.
        </p>
      </section>

      {/* ---- links ---- */}
      <section className="panel space-y-4 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-ui-text">Links</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {CORE_LINKS.map((spec) => (
            <LinkField
              key={spec.key}
              spec={spec}
              value={profile.links[spec.key]}
              onChange={(v) => setLinkField(spec.key, v)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="btn btn-ghost btn-xs"
          aria-expanded={showMore}
        >
          <ChevronDown
            size={13}
            aria-hidden="true"
            className={`transition-transform ${showMore ? 'rotate-180' : ''}`}
          />
          {showMore ? 'Fewer' : 'More'} profiles
          {!showMore && filledExtras > 0 && (
            <span className="rounded-full bg-ui-hover px-1.5 font-mono text-[0.65rem] text-ui-muted">
              {filledExtras}
            </span>
          )}
        </button>

        {showMore && (
          <div className="grid gap-4 border-t border-ui-line pt-4 sm:grid-cols-2">
            {MORE_LINKS.map((spec) => (
              <LinkField
                key={spec.key}
                spec={spec}
                value={profile.links[spec.key]}
                onChange={(v) => setLinkField(spec.key, v)}
              />
            ))}
          </div>
        )}

        <p className="text-xs text-ui-faint">
          Each link only appears on the résumé — icon and all — once it holds a real address. Only{' '}
          <code>https://</code> and <code>mailto:</code> are rendered as links; anything else prints as plain
          text.
        </p>
      </section>

      {/* ---- about ---- */}
      <section className="panel space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-sm font-semibold text-ui-text">Summary</h3>
          <div className="w-full max-w-[16rem]">
            <TextField
              label="Section heading"
              value={settings.sectionTitles.about}
              onChange={(v) => setSectionTitle('about', v)}
              placeholder="About Me"
            />
          </div>
        </div>
        <TextArea
          label="About me"
          rows={6}
          value={profile.about}
          onChange={(v) => setProfileField('about', v)}
          placeholder="Two or three sentences: what you work on, what you are looking for."
          hint="Markdown: **bold**, *italic*, `code`, [links](https://…), and - bullet lists."
        />
      </section>
    </div>
  );
}
