/**
 * @file ResumeContext.jsx
 *
 * Single source of truth for the whole builder: résumé content, active theme,
 * section and item visibility, and local persistence.
 *
 * Design notes
 * ------------
 * - One `useReducer` rather than a scatter of `useState`s. Every mutation is a
 *   named, inspectable action, which keeps undo and persistence trivial.
 * - Persistence is debounced (600 ms) so typing does not hammer localStorage.
 * - `normalise()` runs on *every* load — defaults, imported files, quarantined
 *   payloads — so the rest of the app can assume the shape is complete. This is
 *   what lets a hand-edited JSON file with three fields still open cleanly.
 * - An undo stack (last 30 states) is kept in a ref, not in state: pushing to
 *   it must never itself trigger a render.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import initialResumeData from '../data/initialResumeData.json';
import {
  LINK_STYLE_VALUES,
  PROFILE_LINK_KEYS,
  SCHEMA_BY_KEY,
  SCHEMA_KEYS,
  blankItem,
  normaliseItem,
} from '../data/sectionSchemas.js';
import { FONT_PAIR_IDS, FONT_SCALE_VALUES, HEAD_FONT_IDS } from '../data/fontStacks.js';
import {
  DEFAULT_PAGE_MARGIN,
  DEFAULT_PAGE_SIZE,
  MARGIN_PRESET_IDS,
  PAGE_SIZE_IDS,
} from '../data/pageSetup.js';
import * as storage from '../utils/storage';
import { FOLDER_PATH, loadFromFolder, saveToFolder } from '../utils/folderStore.js';

/* ============================================================
   Shape helpers
   ============================================================ */

/**
 * The six sections that predate the schema registry. They keep bespoke
 * editors and bespoke normalisers because their shapes are irregular
 * (nested authors, tech tag arrays, and so on).
 * @type {string[]}
 */
export const CORE_SECTION_KEYS = [
  'about',
  'education',
  'experience',
  'projects',
  'publications',
  'skills',
];

/**
 * Every section the app knows about. The schema-driven ones are appended, so
 * adding an entry to SECTION_SCHEMAS is genuinely all it takes.
 * @type {string[]}
 */
export const SECTION_KEYS = [...CORE_SECTION_KEYS, ...SCHEMA_KEYS];

/**
 * @type {Array<{id: string, label: string, blurb: string, tone: string}>}
 * `tone` is a one-word hint used by the theme picker's swatch.
 */
export const THEMES = [
  {
    id: 'academic',
    label: 'Academic',
    blurb: 'Serif CV with a ruled masthead. Numbered citations, publication-first.',
    tone: 'Formal',
    family: 'Classic',
  },
  {
    id: 'simplistic',
    label: 'Simplistic',
    blurb: 'Single column, ATS-safe. Nothing a résumé parser can trip on.',
    tone: 'Neutral',
    family: 'Classic',
  },
  {
    id: 'editorial',
    label: 'Editorial',
    blurb: 'Magazine styling — display serif, a drop-capped lede and hairline rules.',
    tone: 'Elegant',
    family: 'Classic',
  },
  {
    id: 'tech',
    label: 'Tech / Modern',
    blurb: 'Sans-serif with a tinted header, skill chips and prominent links.',
    tone: 'Bold',
    family: 'Modern',
  },
  {
    id: 'sidebar',
    label: 'Sidebar',
    blurb: 'Coloured left rail holds contact, skills and short sections; main column runs the narrative.',
    tone: 'Two column',
    family: 'Modern',
  },
  {
    id: 'banner',
    label: 'Banner',
    blurb: 'Full-bleed colour header with monogram, then a clean single column.',
    tone: 'Striking',
    family: 'Modern',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    blurb: 'Dated vertical rail with markers. Chronology is the first thing a reader sees.',
    tone: 'Narrative',
    family: 'Structured',
  },
  {
    id: 'compact',
    label: 'Compact CV',
    blurb: 'Two dense columns built to fit a long academic record into few pages.',
    tone: 'Dense',
    family: 'Structured',
  },
  {
    id: 'swish',
    label: 'Swish',
    blurb:
      'Port of the cv-llt LaTeX style: olive shaded rules, crimson circled citations, right-aligned date column. Fixed palette.',
    tone: 'LaTeX',
    family: 'LaTeX (from your .sty)',
  },
  {
    id: 'marker',
    label: 'Marker',
    blurb:
      'Same LaTeX template, looser reading: every entry numbered in a filled disc, small-caps heads, follows the accent colour.',
    tone: 'LaTeX',
    family: 'LaTeX (from your .sty)',
  },
];

/**
 * Theme ids grouped by family, in menu order.
 * @type {Array<{family: string, themes: typeof THEMES}>}
 */
export const THEME_FAMILIES = THEMES.reduce((acc, t) => {
  const bucket = acc.find((g) => g.family === t.family);
  if (bucket) bucket.themes.push(t);
  else acc.push({ family: t.family, themes: [t] });
  return acc;
}, /** @type {Array<{family: string, themes: typeof THEMES}>} */ ([]));

let idCounter = 0;
/**
 * Generate a locally-unique id.
 * @param {string} prefix
 * @returns {string}
 */
export function uid(prefix = 'id') {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

/**
 * Coerce anything into a complete, valid résumé object.
 *
 * Missing keys are filled from the defaults; wrong types are replaced; items
 * without ids get them. Never throws.
 *
 * @param {unknown} input
 * @returns {Object} A fully-populated résumé state.
 */
export function normalise(input) {
  const base = structuredClone(initialResumeData);
  const src = input && typeof input === 'object' ? input : {};

  /** @param {unknown} v @returns {any[]} */
  const arr = (v) => (Array.isArray(v) ? v : []);
  /** @param {unknown} v @param {string} f @returns {string} */
  const str = (v, f = '') => (typeof v === 'string' ? v : f);

  const profileSrc = src.profile && typeof src.profile === 'object' ? src.profile : {};
  const profile = {
    name: str(profileSrc.name, base.profile.name),
    title: str(profileSrc.title, ''),
    about: str(profileSrc.about, ''),
    contact: {
      email: str(profileSrc.contact?.email, ''),
      phone: str(profileSrc.contact?.phone, ''),
      location: str(profileSrc.contact?.location, ''),
    },
    // Every registered slot always exists, so the editor can render a field for
    // it and a hand-written JSON file missing half of them still opens.
    links: Object.fromEntries(PROFILE_LINK_KEYS.map((k) => [k, str(profileSrc.links?.[k], '')])),
  };

  const skills = arr(src.skills).map((s, i) => ({
    id: str(s?.id) || uid('sk'),
    category: str(s?.category, `Group ${i + 1}`),
    items: arr(s?.items).map((x) => String(x)),
    include: s?.include !== false,
  }));

  const experience = arr(src.experience).map((e) => ({
    id: str(e?.id) || uid('ex'),
    role: str(e?.role),
    company: str(e?.company),
    location: str(e?.location),
    start: str(e?.start),
    end: str(e?.end),
    current: Boolean(e?.current),
    bullets: arr(e?.bullets).map((b) => String(b)),
    include: e?.include !== false,
  }));

  const education = arr(src.education).map((e) => ({
    id: str(e?.id) || uid('ed'),
    degree: str(e?.degree),
    institution: str(e?.institution),
    location: str(e?.location),
    start: str(e?.start),
    end: str(e?.end),
    detail: str(e?.detail),
    include: e?.include !== false,
  }));

  const projects = arr(src.projects).map((p) => ({
    id: str(p?.id) || uid('pr'),
    title: str(p?.title),
    description: str(p?.description),
    tech: arr(p?.tech).map((t) => String(t)),
    demo: str(p?.demo),
    source: str(p?.source),
    paper: str(p?.paper),
    include: p?.include !== false,
  }));

  const publications = arr(src.publications).map((p) => ({
    id: str(p?.id) || uid('pub'),
    citationKey: str(p?.citationKey),
    entryType: str(p?.entryType, 'misc'),
    typeLabel: str(p?.typeLabel, 'Publication'),
    kind: str(p?.kind, 'other'),
    title: str(p?.title),
    authors: arr(p?.authors).map((a) =>
      typeof a === 'string'
        ? { first: '', last: a, full: a }
        : { first: str(a?.first), last: str(a?.last), full: str(a?.full, str(a?.last)) }
    ),
    editors: arr(p?.editors),
    venue: str(p?.venue),
    year: str(p?.year),
    volume: str(p?.volume),
    number: str(p?.number),
    pages: str(p?.pages),
    doi: str(p?.doi),
    url: str(p?.url),
    note: str(p?.note),
    address: str(p?.address),
    publisher: str(p?.publisher),
    include: p?.include !== false,
    fields: p?.fields && typeof p.fields === 'object' ? p.fields : {},
  }));

  // Schema-driven lists. One line each, whatever their shape, because the
  // registry already knows how to repair an item.
  /** @type {Record<string, any[]>} */
  const schemaLists = {};
  SCHEMA_KEYS.forEach((key) => {
    schemaLists[key] = arr(src[key]).map((item) => normaliseItem(key, item, uid));
  });

  const settingsSrc = src.settings && typeof src.settings === 'object' ? src.settings : {};
  const knownTheme = THEMES.some((t) => t.id === settingsSrc.theme);

  // A section the sample file says nothing about defaults to off: importing an
  // old document should not silently bolt eleven empty headings onto it.
  const sections = { ...base.settings.sections };
  SECTION_KEYS.forEach((k) => {
    if (typeof sections[k] !== 'boolean') sections[k] = false;
    if (typeof settingsSrc.sections?.[k] === 'boolean') sections[k] = settingsSrc.sections[k];
  });

  const sectionTitles = { ...base.settings.sectionTitles };
  SECTION_KEYS.forEach((k) => {
    if (!sectionTitles[k]) sectionTitles[k] = SCHEMA_BY_KEY[k]?.title || '';
    if (typeof settingsSrc.sectionTitles?.[k] === 'string' && settingsSrc.sectionTitles[k].trim()) {
      sectionTitles[k] = settingsSrc.sectionTitles[k];
    }
  });

  // Keep a valid order: known keys only, no duplicates, missing keys appended.
  const requested = arr(settingsSrc.sectionOrder).filter((k) => SECTION_KEYS.includes(k));
  const sectionOrder = [...new Set([...requested, ...SECTION_KEYS])];

  const settings = {
    theme: knownTheme ? settingsSrc.theme : base.settings.theme,
    accent: /^#[0-9a-f]{6}$/i.test(str(settingsSrc.accent)) ? settingsSrc.accent : base.settings.accent,
    density: ['compact', 'normal', 'roomy'].includes(settingsSrc.density)
      ? settingsSrc.density
      : 'normal',
    showPhotoPlaceholder: Boolean(settingsSrc.showPhotoPlaceholder),
    // Sheet size. Letter and A4 differ by a quarter-inch of width and most of
    // three quarters of an inch of height, which is enough to move a page break.
    pageSize: PAGE_SIZE_IDS.includes(settingsSrc.pageSize) ? settingsSrc.pageSize : DEFAULT_PAGE_SIZE,
    // Printed page margin. 'theme' defers to whatever the theme picks for the
    // current density; the fixed presets override it on every page.
    pageMargin: MARGIN_PRESET_IDS.includes(settingsSrc.pageMargin)
      ? settingsSrc.pageMargin
      : DEFAULT_PAGE_MARGIN,
    // Typography pairing. 'theme' means "leave each theme's own faces alone",
    // which is the default and what most people should stay on.
    fontPair: FONT_PAIR_IDS.includes(settingsSrc.fontPair) ? settingsSrc.fontPair : 'theme',
    // Heading face, chosen independently of the body. 'pair' means "whatever
    // the pairing above already says", so the two controls do not fight.
    fontHead: HEAD_FONT_IDS.includes(settingsSrc.fontHead) ? settingsSrc.fontHead : 'pair',
    // Type scale. 1 leaves every theme's own sizes untouched; anything else
    // multiplies all of them at once. Spacing is density's job, not this.
    fontScale: FONT_SCALE_VALUES.includes(Number(settingsSrc.fontScale))
      ? Number(settingsSrc.fontScale)
      : 1,
    // How a profile link prints: its name, its short address, or the full URL.
    // The href is always the full address whichever is chosen.
    linkStyle: LINK_STYLE_VALUES.includes(settingsSrc.linkStyle) ? settingsSrc.linkStyle : 'name',
    // Icons next to contact details and links. On by default; the Simplistic
    // theme ignores it entirely so the ATS-safe option stays ATS-safe.
    showIcons: settingsSrc.showIcons !== false,
    // Draw a monogram / initials block in themes that have somewhere to put one.
    showMonogram: settingsSrc.showMonogram !== false,
    sectionOrder,
    sections,
    sectionTitles,
  };

  return {
    schemaVersion: 2,
    profile,
    skills,
    experience,
    education,
    projects,
    publications,
    ...schemaLists,
    settings,
  };
}

/* ============================================================
   Derived views

   Pure, and exported, so the smoke test can render a theme without standing up
   a provider — and so the memos below stay one line each.
   ============================================================ */

/**
 * Exactly what the preview should draw: per-section lists filtered to the
 * included items, plus the order they appear in.
 *
 * @param {Object} resume
 * @returns {Object}
 */
export function computeVisible(resume) {
  const { sections, sectionOrder } = resume.settings;
  /** @param {any[]} list */
  const inc = (list) => (Array.isArray(list) ? list.filter((i) => i.include !== false) : []);
  /** @param {string} key */
  const on = (key) => (sections[key] ? inc(resume[key]) : []);

  const out = {
    // A section is only drawn if it is switched on *and* has something in it,
    // which is what stops an enabled-but-empty heading reaching the page.
    order: sectionOrder.filter((k) => sections[k]),
    sections,
    about: sections.about ? resume.profile.about : '',
    skills: sections.skills ? inc(resume.skills).filter((s) => s.items.length > 0) : [],
    experience: on('experience'),
    education: on('education'),
    projects: on('projects'),
    publications: on('publications'),
  };

  SCHEMA_KEYS.forEach((key) => {
    out[key] = on(key);
  });

  out.order = out.order.filter((k) => (k === 'about' ? Boolean(out.about.trim()) : (out[k]?.length ?? 0) > 0));

  return out;
}

/**
 * `{total, on}` per list, for the sidebar and visibility-matrix badges.
 *
 * @param {Object} resume
 * @returns {Record<string, {total: number, on: number}>}
 */
export function computeCounts(resume) {
  /** @type {Record<string, {total: number, on: number}>} */
  const out = {};
  LISTS.forEach((key) => {
    const list = Array.isArray(resume[key]) ? resume[key] : [];
    out[key] = { total: list.length, on: list.filter((i) => i.include !== false).length };
  });
  return out;
}

/* ============================================================
   Reducer
   ============================================================ */

/**
 * @typedef {Object} Action
 * @property {string} type
 * @property {*} [payload]
 */

/** Lists that support the generic add/update/remove/move/toggle actions. */
const LISTS = ['skills', 'experience', 'education', 'projects', 'publications', ...SCHEMA_KEYS];

/**
 * Blank templates for the "add" action. The six original lists are spelled out;
 * the schema-driven ones are generated from their field descriptors.
 */
const TEMPLATES = {
  skills: () => ({ id: uid('sk'), category: 'New group', items: [], include: true }),
  experience: () => ({
    id: uid('ex'),
    role: '',
    company: '',
    location: '',
    start: '',
    end: '',
    current: false,
    bullets: [''],
    include: true,
  }),
  education: () => ({
    id: uid('ed'),
    degree: '',
    institution: '',
    location: '',
    start: '',
    end: '',
    detail: '',
    include: true,
  }),
  projects: () => ({
    id: uid('pr'),
    title: '',
    description: '',
    tech: [],
    demo: '',
    source: '',
    paper: '',
    include: true,
  }),
  publications: () => ({
    id: uid('pub'),
    citationKey: '',
    entryType: 'article',
    typeLabel: 'Journal Article',
    kind: 'journal',
    title: '',
    authors: [],
    venue: '',
    year: '',
    volume: '',
    number: '',
    pages: '',
    doi: '',
    url: '',
    note: '',
    include: true,
    fields: {},
  }),
  ...Object.fromEntries(SCHEMA_KEYS.map((key) => [key, () => blankItem(key, uid)])),
};

/**
 * @param {Object} state
 * @param {Action} action
 * @returns {Object} Next state.
 */
export function resumeReducer(state, action) {
  const { type, payload } = action;

  switch (type) {
    /* ---- whole-document ---- */

    case 'REPLACE_ALL':
      return normalise(payload);

    case 'RESET':
      return normalise(structuredClone(initialResumeData));

    case 'CLEAR_CONTENT':
      // Keep settings and theme, empty the content. Useful starting point when
      // someone wants their own résumé rather than the sample.
      return {
        ...state,
        profile: {
          name: '',
          title: '',
          about: '',
          contact: { email: '', phone: '', location: '' },
          links: Object.fromEntries(PROFILE_LINK_KEYS.map((k) => [k, ''])),
        },
        skills: [],
        experience: [],
        education: [],
        projects: [],
        publications: [],
        ...Object.fromEntries(SCHEMA_KEYS.map((k) => [k, []])),
      };

    /* ---- profile ---- */

    case 'SET_PROFILE_FIELD':
      return { ...state, profile: { ...state.profile, [payload.field]: payload.value } };

    case 'SET_CONTACT_FIELD':
      return {
        ...state,
        profile: {
          ...state.profile,
          contact: { ...state.profile.contact, [payload.field]: payload.value },
        },
      };

    case 'SET_LINK_FIELD':
      return {
        ...state,
        profile: { ...state.profile, links: { ...state.profile.links, [payload.field]: payload.value } },
      };

    /* ---- generic list operations ---- */

    case 'ADD_ITEM': {
      const { list, item } = payload;
      if (!LISTS.includes(list)) return state;
      const next = item || TEMPLATES[list]();
      return { ...state, [list]: [...state[list], next] };
    }

    case 'ADD_ITEMS': {
      const { list, items } = payload;
      if (!LISTS.includes(list) || !Array.isArray(items)) return state;
      return { ...state, [list]: [...state[list], ...items] };
    }

    case 'UPDATE_ITEM': {
      const { list, id, patch } = payload;
      if (!LISTS.includes(list)) return state;
      return {
        ...state,
        [list]: state[list].map((it) => (it.id === id ? { ...it, ...patch } : it)),
      };
    }

    case 'REMOVE_ITEM': {
      const { list, id } = payload;
      if (!LISTS.includes(list)) return state;
      return { ...state, [list]: state[list].filter((it) => it.id !== id) };
    }

    case 'MOVE_ITEM': {
      const { list, id, direction } = payload;
      if (!LISTS.includes(list)) return state;
      const items = [...state[list]];
      const idx = items.findIndex((it) => it.id === id);
      const target = idx + direction;
      if (idx === -1 || target < 0 || target >= items.length) return state;
      [items[idx], items[target]] = [items[target], items[idx]];
      return { ...state, [list]: items };
    }

    case 'TOGGLE_ITEM': {
      const { list, id } = payload;
      if (!LISTS.includes(list)) return state;
      return {
        ...state,
        [list]: state[list].map((it) => (it.id === id ? { ...it, include: !it.include } : it)),
      };
    }

    case 'SET_ALL_ITEMS': {
      const { list, include } = payload;
      if (!LISTS.includes(list)) return state;
      return { ...state, [list]: state[list].map((it) => ({ ...it, include: Boolean(include) })) };
    }

    case 'REPLACE_LIST': {
      const { list, items } = payload;
      if (!LISTS.includes(list) || !Array.isArray(items)) return state;
      return { ...state, [list]: items };
    }

    /* ---- settings & visibility ---- */

    case 'SET_THEME':
      return { ...state, settings: { ...state.settings, theme: payload } };

    case 'SET_SETTING':
      return { ...state, settings: { ...state.settings, [payload.key]: payload.value } };

    case 'TOGGLE_SECTION':
      return {
        ...state,
        settings: {
          ...state.settings,
          sections: { ...state.settings.sections, [payload]: !state.settings.sections[payload] },
        },
      };

    case 'SET_SECTION_TITLE':
      return {
        ...state,
        settings: {
          ...state.settings,
          sectionTitles: { ...state.settings.sectionTitles, [payload.key]: payload.value },
        },
      };

    case 'MOVE_SECTION': {
      const order = [...state.settings.sectionOrder];
      const idx = order.indexOf(payload.key);
      const target = idx + payload.direction;
      if (idx === -1 || target < 0 || target >= order.length) return state;
      [order[idx], order[target]] = [order[target], order[idx]];
      return { ...state, settings: { ...state.settings, sectionOrder: order } };
    }

    default:
      return state;
  }
}

/* ============================================================
   Context
   ============================================================ */

/** @type {import('react').Context<any>} */
const ResumeContext = createContext(null);

/**
 * Load the starting state: saved work if there is any, otherwise the sample.
 *
 * @returns {{state: Object, recovered: boolean, restored: boolean}}
 */
function bootstrap() {
  const { data, recovered } = storage.load();
  if (data) return { state: normalise(data), recovered, restored: true };
  return { state: normalise(structuredClone(initialResumeData)), recovered, restored: false };
}

/**
 * Provider. Wrap the app in this once, in App.jsx.
 *
 * @param {{children: import('react').ReactNode}} props
 */
export function ResumeProvider({ children }) {
  const boot = useRef(bootstrap()).current;

  const [resume, dispatch] = useReducer(resumeReducer, boot.state);

  /** @type {[{text: string, tone: 'info'|'error'|'success'}|null, Function]} */
  const [toast, setToast] = useState(
    boot.recovered
      ? {
          text: 'Your saved résumé could not be read and has been quarantined. Started from the sample.',
          tone: 'error',
        }
      : null
  );

  const [saveState, setSaveState] = useState(/** @type {'idle'|'saving'|'saved'|'error'} */ ('idle'));
  const [storageLabel, setStorageLabel] = useState(() => storage.usage().label);

  /* ---- folder-backed store ----
     Unknown until the first request comes back: there is no way to tell from
     the page alone whether a server is behind it. Until then saves go to
     localStorage only, which is exactly what happened before this existed. */
  const [folderState, setFolderState] = useState(
    /** @type {'unknown'|'active'|'unavailable'|'error'} */ ('unknown')
  );
  const folderReady = useRef(false);

  /* ---- undo stack (kept out of state on purpose) ---- */
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const skipHistory = useRef(false);
  const prevResume = useRef(resume);

  useEffect(() => {
    if (prevResume.current !== resume) {
      if (skipHistory.current) {
        skipHistory.current = false;
      } else {
        undoStack.current.push(prevResume.current);
        if (undoStack.current.length > 30) undoStack.current.shift();
        redoStack.current = [];
      }
      prevResume.current = resume;
    }
  }, [resume]);

  /* ---- adopt the folder copy, once, on mount ----

     The folder wins when it has something. It is written on every save, so it
     is never behind the browser copy, and it is the only copy that survives a
     cleared cache or a move to another machine — which is the whole point of
     having it. The effect runs exactly once; `boot` is a ref, not state. */
  useEffect(() => {
    let cancelled = false;

    loadFromFolder().then((res) => {
      if (cancelled) return;

      if (!res.available) {
        setFolderState('unavailable');
      } else if (!res.ok) {
        setFolderState('error');
        setToast({ text: res.error, tone: 'error' });
      } else {
        setFolderState('active');
        if (res.data) {
          // Not an edit — it is where the document came from — so it does not
          // belong on the undo stack.
          skipHistory.current = true;
          dispatch({ type: 'REPLACE_ALL', payload: res.data });
        }
      }

      // Only now may the save effect touch the folder. Before this point a
      // debounced write could overwrite the saved file with the browser copy.
      folderReady.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- debounced persistence ---- */
  const saveTimer = useRef(null);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      // Write once on boot so a repaired/normalised payload is what's stored.
      // Browser copy only: the folder has not been read yet.
      storage.save(resume);
      setStorageLabel(storage.usage().label);
      return undefined;
    }

    setSaveState('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      // localStorage first, and always. It is synchronous, it cannot fail
      // halfway, and it is the fallback if the folder write does not land.
      const res = storage.save(resume);
      setSaveState(res.ok ? 'saved' : 'error');
      setStorageLabel(storage.usage().label);
      if (!res.ok) setToast({ text: res.error, tone: 'error' });

      if (!folderReady.current) return;
      saveToFolder(resume).then((folder) => {
        if (!folder.available) setFolderState('unavailable');
        else if (!folder.ok) {
          setFolderState('error');
          setToast({ text: folder.error, tone: 'error' });
        } else setFolderState('active');
      });
    }, 600);

    return () => clearTimeout(saveTimer.current);
  }, [resume]);

  /* ---- toast auto-dismiss ---- */
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---- action creators ---- */

  const notify = useCallback((text, tone = 'info') => setToast({ text, tone }), []);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) {
      notify('Nothing to undo.', 'info');
      return;
    }
    redoStack.current.push(prevResume.current);
    skipHistory.current = true;
    dispatch({ type: 'REPLACE_ALL', payload: prev });
  }, [notify]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) {
      notify('Nothing to redo.', 'info');
      return;
    }
    undoStack.current.push(prevResume.current);
    skipHistory.current = true;
    dispatch({ type: 'REPLACE_ALL', payload: next });
  }, [notify]);

  const importJson = useCallback(
    /**
     * @param {string} text Raw JSON.
     * @returns {{ok: boolean, error?: string}}
     */
    (text) => {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        return { ok: false, error: `That file is not valid JSON (${err.message}).` };
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, error: 'That JSON is not a résumé document.' };
      }
      if (!parsed.profile && !parsed.projects && !parsed.experience) {
        return {
          ok: false,
          error: 'That JSON has none of the expected keys (profile, experience, projects).',
        };
      }
      storage.backup();
      dispatch({ type: 'REPLACE_ALL', payload: parsed });
      return { ok: true };
    },
    []
  );

  const exportJson = useCallback(() => JSON.stringify(resume, null, 2), [resume]);

  const resetAll = useCallback(() => {
    storage.backup();
    dispatch({ type: 'RESET' });
    notify('Reset to the sample résumé. Your previous version is backed up.', 'info');
  }, [notify]);

  /* ---- derived: exactly what the preview should render ---- */

  const visible = useMemo(() => computeVisible(resume), [resume]);
  const counts = useMemo(() => computeCounts(resume), [resume]);

  const value = useMemo(
    () => ({
      resume,
      dispatch,
      visible,
      counts,
      // convenience wrappers, so components don't hand-roll action objects
      setProfileField: (field, val) => dispatch({ type: 'SET_PROFILE_FIELD', payload: { field, value: val } }),
      setContactField: (field, val) => dispatch({ type: 'SET_CONTACT_FIELD', payload: { field, value: val } }),
      setLinkField: (field, val) => dispatch({ type: 'SET_LINK_FIELD', payload: { field, value: val } }),
      addItem: (list, item) => dispatch({ type: 'ADD_ITEM', payload: { list, item } }),
      addItems: (list, items) => dispatch({ type: 'ADD_ITEMS', payload: { list, items } }),
      updateItem: (list, id, patch) => dispatch({ type: 'UPDATE_ITEM', payload: { list, id, patch } }),
      removeItem: (list, id) => dispatch({ type: 'REMOVE_ITEM', payload: { list, id } }),
      moveItem: (list, id, direction) => dispatch({ type: 'MOVE_ITEM', payload: { list, id, direction } }),
      toggleItem: (list, id) => dispatch({ type: 'TOGGLE_ITEM', payload: { list, id } }),
      setAllItems: (list, include) => dispatch({ type: 'SET_ALL_ITEMS', payload: { list, include } }),
      replaceList: (list, items) => dispatch({ type: 'REPLACE_LIST', payload: { list, items } }),
      setTheme: (id) => dispatch({ type: 'SET_THEME', payload: id }),
      setSetting: (key, val) => dispatch({ type: 'SET_SETTING', payload: { key, value: val } }),
      toggleSection: (key) => dispatch({ type: 'TOGGLE_SECTION', payload: key }),
      setSectionTitle: (key, value) => dispatch({ type: 'SET_SECTION_TITLE', payload: { key, value } }),
      moveSection: (key, direction) => dispatch({ type: 'MOVE_SECTION', payload: { key, direction } }),
      clearContent: () => dispatch({ type: 'CLEAR_CONTENT' }),
      // app-level
      undo,
      redo,
      importJson,
      exportJson,
      resetAll,
      notify,
      toast,
      dismissToast: () => setToast(null),
      saveState,
      storageLabel,
      restoredFromStorage: boot.restored,
      folderState,
      folderPath: FOLDER_PATH,
    }),
    [
      resume,
      visible,
      counts,
      undo,
      redo,
      importJson,
      exportJson,
      resetAll,
      notify,
      toast,
      saveState,
      storageLabel,
      boot.restored,
      folderState,
    ]
  );

  return <ResumeContext.Provider value={value}>{children}</ResumeContext.Provider>;
}

/**
 * Access the résumé store.
 *
 * @returns {any} The context value.
 * @throws {Error} When called outside `<ResumeProvider>`.
 */
export function useResume() {
  const ctx = useContext(ResumeContext);
  if (!ctx) throw new Error('useResume() must be used inside <ResumeProvider>.');
  return ctx;
}

export default ResumeContext;
