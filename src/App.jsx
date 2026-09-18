/**
 * @file App.jsx
 *
 * Composition root. Owns only two pieces of local UI state — which editor
 * panel is open, and whether the mobile view is showing the editor or the
 * preview. Everything else lives in ResumeContext.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Braces,
  CheckCircle2,
  Eye,
  FileText,
  FolderGit2,
  GraduationCap,
  Info,
  ListChecks,
  Pencil,
  User,
  Wrench,
  X,
} from 'lucide-react';

import { ResumeProvider, useResume } from './context/ResumeContext.jsx';
import ActionRail from './components/layout/ActionRail.jsx';
import Header from './components/layout/Header.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import SplitView from './components/layout/SplitView.jsx';

import GeneralInfoEditor from './components/editor/GeneralInfoEditor.jsx';
import SkillsEditor from './components/editor/SkillsEditor.jsx';
import ExperienceEditor from './components/editor/ExperienceEditor.jsx';
import EducationEditor from './components/editor/EducationEditor.jsx';
import ProjectsEditor from './components/editor/ProjectsEditor.jsx';
import BibtexImporter from './components/editor/BibtexImporter.jsx';
import GenericListEditor from './components/editor/GenericListEditor.jsx';
import VisibilityManager from './components/editor/VisibilityManager.jsx';
import RawJsonEditor from './components/editor/RawJsonEditor.jsx';
import { SCHEMA_KEYS, SCHEMA_BY_KEY } from './data/sectionSchemas.js';
import { loadUi, saveUi } from './utils/storage';

import ResumePreview from './components/preview/ResumePreview.jsx';

/**
 * Editor panels, in sidebar order.
 *
 * The first block is hand-written because those sections have irregular shapes.
 * Everything after it is generated from the schema registry — each entry there
 * already knows its own icon, short nav label, sidebar group and one-line hint,
 * so a new section appears in the rail without this file being touched.
 *
 * `group` heads a divider in the desktop rail; panels sharing one stay together.
 *
 * @type {Array<{id: string, label: string, icon: Function, countKey?: string, hint: string, group: string}>}
 */
export const PANELS = [
  { id: 'general', label: 'General', icon: User, hint: 'Name, contact, links, about', group: 'Core' },
  {
    id: 'experience',
    label: 'Experience',
    icon: Pencil,
    countKey: 'experience',
    hint: 'Roles and bullets',
    group: 'Core',
  },
  {
    id: 'education',
    label: 'Education',
    icon: GraduationCap,
    countKey: 'education',
    hint: 'Degrees',
    group: 'Core',
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: FolderGit2,
    countKey: 'projects',
    hint: 'Work you can link to',
    group: 'Core',
  },
  {
    id: 'publications',
    label: 'Publications',
    icon: FileText,
    countKey: 'publications',
    hint: 'Import from BibTeX',
    group: 'Core',
  },
  {
    id: 'skills',
    label: 'Skills',
    icon: Wrench,
    countKey: 'skills',
    hint: 'Categorised skill groups',
    group: 'Core',
  },

  ...SCHEMA_KEYS.map((key) => {
    const s = SCHEMA_BY_KEY[key];
    return { id: key, label: s.nav, icon: s.icon, countKey: key, hint: s.hint, group: s.group };
  }),

  { id: 'visibility', label: 'Visibility', icon: ListChecks, hint: 'What appears on the page', group: 'Output' },
  { id: 'json', label: 'Raw JSON', icon: Braces, hint: 'Edit the document directly', group: 'Output' },
];

/**
 * Map a panel id to its editor component.
 *
 * @param {string} id
 * @returns {JSX.Element}
 */
function renderPanel(id) {
  switch (id) {
    case 'general':
      return <GeneralInfoEditor />;
    case 'experience':
      return <ExperienceEditor />;
    case 'education':
      return <EducationEditor />;
    case 'projects':
      return <ProjectsEditor />;
    case 'publications':
      return <BibtexImporter />;
    case 'skills':
      return <SkillsEditor />;
    case 'visibility':
      return <VisibilityManager />;
    case 'json':
      return <RawJsonEditor />;
    default:
      // Awards, talks, grants, teaching, service, memberships, certifications,
      // patents, languages, volunteering, references — all one component.
      return SCHEMA_BY_KEY[id] ? <GenericListEditor sectionKey={id} /> : <GeneralInfoEditor />;
  }
}

/** Transient status message, bottom-centre. */
function Toast() {
  const { toast, dismissToast } = useResume();
  if (!toast) return null;

  const tone = toast.tone || 'info';
  const Icon = tone === 'error' ? AlertTriangle : tone === 'success' ? CheckCircle2 : Info;
  const colour =
    tone === 'error'
      ? 'border-ui-danger bg-ui-danger-soft text-ui-danger'
      : tone === 'success'
        ? 'border-ui-success bg-ui-success-soft text-ui-success'
        : 'border-ui-line-strong bg-ui-surface text-ui-text';

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      <div
        className={`pointer-events-auto flex max-w-xl items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-panel animate-fade-in ${colour}`}
      >
        <Icon size={17} className="mt-0.5 flex-none" aria-hidden="true" />
        <p className="leading-snug">{toast.text}</p>
        <button
          type="button"
          onClick={dismissToast}
          className="-mr-1 ml-1 flex-none rounded p-0.5 opacity-60 transition hover:opacity-100"
          aria-label="Dismiss message"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** The actual workspace, rendered inside the provider. */
function Workspace() {
  const [panel, setPanel] = useState('general');
  /** @type {['edit'|'preview', Function]} On narrow screens only one half fits. */
  const [mobileView, setMobileView] = useState('edit');
  /**
   * Is the section nav showing?
   *
   * A per-machine layout preference, not part of the document, so it goes in
   * the UI key rather than resume.settings — see storage.js. Read lazily so
   * the first paint is already correct and the rail does not flash open.
   */
  const [railOpen, setRailOpen] = useState(() => loadUi('railOpen', true) !== false);

  const active = PANELS.find((p) => p.id === panel) || PANELS[0];

  const toggleRail = useCallback(() => {
    setRailOpen((v) => {
      saveUi('railOpen', !v);
      return !v;
    });
  }, []);

  // Ctrl/Cmd+P should reach the app's export path, not the browser's raw print
  // of the whole page — that path sets the filename and waits for fonts.
  const onKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
      const btn = document.getElementById('download-pdf-button');
      if (btn) {
        e.preventDefault();
        btn.click();
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  return (
    /* Rail first, then everything else in a column beside it. The rail is
       outside the column on purpose: it runs the full height of the window and
       stays put while the header above the workspace folds away. */
    <div className="flex h-full min-h-0 bg-ui-bg text-ui-text">
      <ActionRail
        mobileView={mobileView}
        onMobileViewChange={setMobileView}
        railOpen={railOpen}
        onRailToggle={toggleRail}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />

        <SplitView
          mobileView={mobileView}
          railOpen={railOpen}
          sidebar={<Sidebar panels={PANELS} active={panel} onSelect={setPanel} />}
          editor={
            <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
              <div className="mb-5 flex items-baseline justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-ui-text">{active.label}</h2>
                  <p className="text-sm text-ui-muted">{active.hint}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileView('preview')}
                  className="btn btn-ghost btn-xs lg:hidden"
                >
                  <Eye size={14} aria-hidden="true" />
                  Preview
                </button>
              </div>
              {renderPanel(panel)}
            </div>
          }
          preview={<ResumePreview onBackToEditor={() => setMobileView('edit')} />}
        />
      </div>

      <Toast />
    </div>
  );
}

/**
 * Root component.
 * @returns {JSX.Element}
 */
export default function App() {
  return (
    <ResumeProvider>
      <Workspace />
    </ResumeProvider>
  );
}
