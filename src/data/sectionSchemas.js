/**
 * @file sectionSchemas.js
 *
 * The registry of "record" sections — awards, talks, teaching, grants and the
 * rest. One entry here gives you, for free:
 *
 *   - a normaliser (so a hand-edited JSON file still opens),
 *   - a blank template for the Add button,
 *   - a full editor panel, rendered from `fields` by GenericListEditor,
 *   - a row in the visibility matrix,
 *   - and a rendered block in all eight themes, via `entry()`.
 *
 * Adding a fifteenth section is therefore a matter of adding an object below,
 * not of touching eleven files. That is the whole reason this file exists.
 *
 * `entry()` is the contract with the themes. It flattens whatever fields a
 * section happens to have into one shape every theme knows how to draw:
 *
 *   primary    the bold line — award name, talk title, course
 *   secondary  the quieter line under it — issuer, venue, institution
 *   meta       the right-hand column — a year or a date range
 *   badge      a short pill — "Poster", "Granted", "PI"
 *   detail     markdown prose
 *   bullets    string[]
 *   tags       string[] rendered as chips
 *   links      [{key, label, href, icon}] — only ever the ones that resolve
 *
 * Themes decide how each of those *looks*; they never learn what an "award" is.
 */

import {
  BadgeCheck,
  Banknote,
  BookMarked,
  BookOpen,
  Building2,
  CalendarCheck,
  Database,
  ExternalLink,
  FileText,
  Globe,
  GraduationCap,
  Heart,
  Languages as LanguagesIcon,
  Lightbulb,
  Link2,
  Mail,
  MapPin,
  Newspaper,
  PenTool,
  Phone,
  PlayCircle,
  Presentation,
  ScrollText,
  Stamp,
  Ticket,
  Trophy,
  UserCheck,
  Users,
  Youtube,
} from 'lucide-react';

import {
  Arxiv,
  Bluesky,
  Codepen,
  Dblp,
  Github,
  Gitlab,
  GoogleScholar,
  HuggingFace,
  Instagram,
  Kaggle,
  Linkedin,
  Mastodon,
  Medium,
  Orcid,
  Osf,
  ResearchGate,
  SemanticScholar,
  StackOverflow,
  XTwitter,
  Youtube as YoutubeBrand,
  Zenodo,
} from '../components/icons/BrandIcons.jsx';
import { safeHref } from '../utils/markdown.js';

/* ============================================================
   Small shared helpers
   ============================================================ */

/**
 * Join the non-empty parts of a line with a separator.
 *
 * @param {Array<string|undefined|null|false>} parts
 * @param {string} [sep=' · ']
 * @returns {string}
 */
export function joinParts(parts, sep = ' · ') {
  return parts.filter((p) => typeof p === 'string' && p.trim()).map((p) => p.trim()).join(sep);
}

/**
 * "2023 – 2025", "2023 – Present", "2023", or ''.
 *
 * @param {{start?: string, end?: string, current?: boolean}} item
 * @param {string} [dash='–']
 * @returns {string}
 */
export function span(item, dash = '–') {
  const a = (item?.start || '').trim();
  const b = item?.current ? 'Present' : (item?.end || '').trim();
  if (!a && !b) return '';
  if (!a) return b;
  if (!b) return a;
  if (a === b) return a;
  return `${a} ${dash} ${b}`;
}

/**
 * Build the link list for an entry, dropping anything that will not resolve to
 * a safe URL. This is what implements "only show the icon if there is a link".
 *
 * @param {Array<{key: string, label: string, raw: unknown, icon?: Function}>} candidates
 * @returns {Array<{key: string, label: string, href: string, icon: Function}>}
 */
export function buildLinks(candidates) {
  return candidates
    .map((c) => ({ ...c, href: safeHref(c.raw), icon: c.icon || Link2 }))
    .filter((c) => c.href);
}

/* ============================================================
   Contact and link icons, shared by every theme
   ============================================================ */

/**
 * @typedef {Object} ProfileLinkSpec
 * @property {string} key      Field name under `profile.links`.
 * @property {string} label    Editor label.
 * @property {Function} icon
 * @property {string} placeholder
 * @property {boolean} core    Shown in the editor's always-visible group.
 */

/**
 * Every link slot the masthead can carry, in the order it renders.
 *
 * One list drives normalisation, the General editor and the contact row in all
 * ten themes, so adding "Bluesky" tomorrow is a single entry here.
 *
 * `short` is what the résumé prints when the link style is "Name" — the point
 * of that mode is that "GitHub" is shorter, cleaner and more legible on paper
 * than `github.com/some-long-handle`, and the reader clicks the icon anyway.
 *
 * Icons are the real brand marks (see BrandIcons.jsx), not approximations.
 *
 * @type {ProfileLinkSpec[]}
 */
export const PROFILE_LINKS = [
  { key: 'website', label: 'Website', short: 'Website', icon: Globe, placeholder: 'https://example.com', core: true },
  { key: 'github', label: 'GitHub', short: 'GitHub', icon: Github, placeholder: 'https://github.com/you', core: true },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    short: 'LinkedIn',
    icon: Linkedin,
    placeholder: 'https://linkedin.com/in/you',
    core: true,
  },
  {
    key: 'scholar',
    label: 'Google Scholar',
    short: 'Scholar',
    icon: GoogleScholar,
    placeholder: 'https://scholar.google.com/citations?user=…',
    core: true,
  },
  { key: 'orcid', label: 'ORCID', short: 'ORCID', icon: Orcid, placeholder: 'https://orcid.org/0000-0000-0000-0000' },
  {
    key: 'researchgate',
    label: 'ResearchGate',
    short: 'ResearchGate',
    icon: ResearchGate,
    placeholder: 'https://researchgate.net/profile/…',
  },
  { key: 'semanticscholar', label: 'Semantic Scholar', short: 'Semantic Scholar', icon: SemanticScholar, placeholder: 'https://semanticscholar.org/author/…' },
  { key: 'dblp', label: 'DBLP', short: 'DBLP', icon: Dblp, placeholder: 'https://dblp.org/pid/…' },
  { key: 'arxiv', label: 'arXiv', short: 'arXiv', icon: Arxiv, placeholder: 'https://arxiv.org/a/…' },
  { key: 'osf', label: 'OSF', short: 'OSF', icon: Osf, placeholder: 'https://osf.io/…' },
  { key: 'zenodo', label: 'Zenodo', short: 'Zenodo', icon: Zenodo, placeholder: 'https://zenodo.org/…' },
  { key: 'gitlab', label: 'GitLab', short: 'GitLab', icon: Gitlab, placeholder: 'https://gitlab.com/you' },
  { key: 'huggingface', label: 'Hugging Face', short: 'Hugging Face', icon: HuggingFace, placeholder: 'https://huggingface.co/you' },
  { key: 'kaggle', label: 'Kaggle', short: 'Kaggle', icon: Kaggle, placeholder: 'https://kaggle.com/you' },
  { key: 'stackoverflow', label: 'Stack Overflow', short: 'Stack Overflow', icon: StackOverflow, placeholder: 'https://stackoverflow.com/users/…' },
  { key: 'codepen', label: 'CodePen', short: 'CodePen', icon: Codepen, placeholder: 'https://codepen.io/you' },
  { key: 'twitter', label: 'X / Twitter', short: 'X', icon: XTwitter, placeholder: 'https://x.com/you' },
  { key: 'bluesky', label: 'Bluesky', short: 'Bluesky', icon: Bluesky, placeholder: 'https://bsky.app/profile/you' },
  { key: 'mastodon', label: 'Mastodon', short: 'Mastodon', icon: Mastodon, placeholder: 'https://mastodon.social/@you' },
  { key: 'youtube', label: 'YouTube', short: 'YouTube', icon: YoutubeBrand, placeholder: 'https://youtube.com/@you' },
  { key: 'instagram', label: 'Instagram', short: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/you' },
  { key: 'medium', label: 'Medium', short: 'Medium', icon: Medium, placeholder: 'https://medium.com/@you' },
  { key: 'blog', label: 'Blog', short: 'Blog', icon: PenTool, placeholder: 'https://yourblog.com' },
];

/**
 * How a profile link prints in the masthead.
 *
 * Only the printed text changes; the `href` is always the full address, so a
 * PDF set to "Name" is still a page of working links. On paper the name is the
 * better default — "GitHub" is shorter, cleaner and more legible than
 * `github.com/some-long-handle`, and the reader clicks the icon anyway.
 *
 * @type {Array<{value: string, label: string, note: string}>}
 */
export const LINK_STYLES = [
  { value: 'name', label: 'Name only', note: 'GitHub' },
  { value: 'short', label: 'Short address', note: 'github.com/you' },
  { value: 'full', label: 'Full URL', note: 'https://github.com/you' },
];

/** @type {string[]} */
export const LINK_STYLE_VALUES = LINK_STYLES.map((s) => s.value);

/** Slot definitions by key, for label and icon lookups. @type {Record<string, any>} */
export const PROFILE_LINK_BY_KEY = Object.fromEntries(PROFILE_LINKS.map((l) => [l.key, l]));

/** Field names of every profile link slot. @type {string[]} */
export const PROFILE_LINK_KEYS = PROFILE_LINKS.map((l) => l.key);

/**
 * Icon for each masthead row — the three contact fields plus every link slot.
 * Keys match `contactItems()`.
 * @type {Record<string, Function>}
 */
export const CONTACT_ICONS = {
  email: Mail,
  phone: Phone,
  location: MapPin,
  ...Object.fromEntries(PROFILE_LINKS.map((l) => [l.key, l.icon])),
};

/** Icon for each project / entry link slot. @type {Record<string, Function>} */
export const LINK_ICONS = {
  demo: PlayCircle,
  source: Github,
  paper: FileText,
  url: Link2,
  doi: BookMarked,
  slides: Presentation,
  video: Youtube,
  data: Database,
  external: ExternalLink,
};

/* ============================================================
   Select options
   ============================================================ */

/** Presentation kinds, in the order a CV conventionally lists them. */
export const TALK_KINDS = [
  { value: 'keynote', label: 'Keynote' },
  { value: 'invited', label: 'Invited Talk' },
  { value: 'oral', label: 'Oral Presentation' },
  { value: 'poster', label: 'Poster' },
  { value: 'panel', label: 'Panel' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'demo', label: 'Demo' },
];

/** Plural group headings used when a section groups by kind. */
export const TALK_GROUP_LABELS = {
  keynote: 'Keynote Addresses',
  invited: 'Invited Talks',
  oral: 'Oral Presentations',
  poster: 'Poster Presentations',
  panel: 'Panels',
  seminar: 'Seminars',
  workshop: 'Workshops',
  demo: 'Demonstrations',
};

const TEACHING_ROLES = [
  { value: 'instructor', label: 'Instructor of Record' },
  { value: 'co-instructor', label: 'Co-Instructor' },
  { value: 'ta', label: 'Teaching Assistant' },
  { value: 'guest', label: 'Guest Lecturer' },
  { value: 'tutor', label: 'Tutor' },
  { value: 'mentor', label: 'Research Mentor' },
];

const GRANT_ROLES = [
  { value: 'pi', label: 'PI' },
  { value: 'copi', label: 'Co-PI' },
  { value: 'coi', label: 'Co-Investigator' },
  { value: 'fellow', label: 'Named Fellow' },
  { value: 'senior', label: 'Senior Personnel' },
  { value: 'collab', label: 'Collaborator' },
];

const SERVICE_KINDS = [
  { value: 'review', label: 'Peer Review' },
  { value: 'pc', label: 'Programme Committee' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'organiser', label: 'Organiser' },
  { value: 'chair', label: 'Chair' },
  { value: 'committee', label: 'Departmental' },
  { value: 'outreach', label: 'Outreach' },
];

const SUPERVISION_LEVELS = [
  { value: 'phd', label: 'PhD' },
  { value: 'mphil', label: 'MPhil' },
  { value: 'masters', label: "Master's" },
  { value: 'honours', label: 'Honours' },
  { value: 'undergrad', label: 'Undergraduate' },
  { value: 'intern', label: 'Intern' },
  { value: 'postdoc', label: 'Postdoc' },
];

const SUPERVISION_ROLES = [
  { value: 'primary', label: 'Primary supervisor' },
  { value: 'co', label: 'Co-supervisor' },
  { value: 'committee', label: 'Committee member' },
  { value: 'mentor', label: 'Day-to-day mentor' },
  { value: 'examiner', label: 'Examiner' },
];

const MEDIA_KINDS = [
  { value: 'press', label: 'Press article' },
  { value: 'interview', label: 'Interview' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'broadcast', label: 'Radio / TV' },
  { value: 'blog', label: 'Blog / feature' },
  { value: 'video', label: 'Video' },
];

const ORGANISED_KINDS = [
  { value: 'workshop', label: 'Workshop' },
  { value: 'conference', label: 'Conference' },
  { value: 'symposium', label: 'Symposium' },
  { value: 'seminar', label: 'Seminar series' },
  { value: 'session', label: 'Session / track' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'summerschool', label: 'Summer school' },
];

const ARTEFACT_KINDS = [
  { value: 'dataset', label: 'Dataset' },
  { value: 'software', label: 'Software' },
  { value: 'model', label: 'Model' },
  { value: 'package', label: 'Package' },
  { value: 'benchmark', label: 'Benchmark' },
  { value: 'protocol', label: 'Protocol' },
];

const CONFERENCE_MODES = [
  { value: 'inperson', label: 'In person' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'hybrid', label: 'Hybrid' },
];

const DEVELOPMENT_KINDS = [
  { value: 'summerschool', label: 'Summer school' },
  { value: 'course', label: 'Course' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'bootcamp', label: 'Bootcamp' },
  { value: 'residency', label: 'Residency' },
  { value: 'exchange', label: 'Research visit' },
];

const EDITORIAL_ROLES = [
  { value: 'editor', label: 'Editor' },
  { value: 'associate', label: 'Associate Editor' },
  { value: 'guest', label: 'Guest Editor' },
  { value: 'board', label: 'Editorial Board' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'chair', label: 'Review Chair' },
];

const PATENT_STATUS = [
  { value: 'granted', label: 'Granted' },
  { value: 'pending', label: 'Pending' },
  { value: 'filed', label: 'Filed' },
  { value: 'provisional', label: 'Provisional' },
];

const LANGUAGE_LEVELS = [
  { value: 'native', label: 'Native' },
  { value: 'fluent', label: 'Fluent' },
  { value: 'professional', label: 'Professional working' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'basic', label: 'Basic' },
];

/**
 * Look a select value up in its option list.
 *
 * @param {Array<{value: string, label: string}>} options
 * @param {string} value
 * @returns {string} The label, or the raw value if it is not a known option.
 */
export function optionLabel(options, value) {
  return options.find((o) => o.value === value)?.label || value || '';
}

/* ============================================================
   The schemas
   ============================================================ */

/**
 * @typedef {Object} FieldSpec
 * @property {string} name
 * @property {string} label
 * @property {'text'|'textarea'|'tags'|'bullets'|'select'|'url'|'check'} type
 * @property {string} [placeholder]
 * @property {string} [hint]
 * @property {number} [span=3] Columns out of 6 in the editor grid.
 * @property {Array<{value: string, label: string}>} [options]
 */

/**
 * @typedef {Object} SectionSchema
 * @property {string} key          Section id, also the list name on the document.
 * @property {string} title        Default heading.
 * @property {string} nav          Short label for the sidebar.
 * @property {Function} icon       Lucide component.
 * @property {string} hint         One line shown above the editor.
 * @property {string} blurb        Longer "what goes here" line.
 * @property {string} addLabel
 * @property {string} empty        Empty-state copy.
 * @property {FieldSpec[]} fields
 * @property {'entries'|'inline'} [layout='entries']
 * @property {string} [groupBy]    Field to group by when rendering.
 * @property {Record<string,string>} [groupLabels]
 * @property {(item: any) => Object} entry
 * @property {(item: any) => string} [inlineText] Required when layout is 'inline'.
 * @property {(item: any) => string} navLabel     Card title in the editor.
 * @property {(item: any) => string} navSub       Card subtitle in the editor.
 */

/** @type {SectionSchema[]} */
export const SECTION_SCHEMAS = [
  /* ---------------------------------------------------------- talks */
  {
    key: 'talks',
    title: 'Presentations & Talks',
    nav: 'Talks',
    icon: Presentation,
    group: 'Academic record',
    hint: 'Conference talks, posters, invited seminars and keynotes',
    blurb:
      'Grouped automatically by kind, so keynotes, invited talks, orals and posters each get their own subheading.',
    addLabel: 'Add a presentation',
    empty: 'No presentations yet. Posters count — search committees read this section closely.',
    groupBy: 'kind',
    groupLabels: TALK_GROUP_LABELS,
    fields: [
      { name: 'title', label: 'Title', type: 'text', span: 6, placeholder: 'Sparse Attention at Serving Time' },
      { name: 'kind', label: 'Kind', type: 'select', span: 2, options: TALK_KINDS },
      { name: 'event', label: 'Event / venue', type: 'text', span: 4, placeholder: 'NeurIPS 2025, Efficient ML Workshop' },
      { name: 'location', label: 'Location', type: 'text', span: 3, placeholder: 'Vancouver, Canada' },
      { name: 'date', label: 'Date', type: 'text', span: 3, placeholder: 'Dec 2025' },
      { name: 'coauthors', label: 'Co-presenters', type: 'text', span: 6, placeholder: 'with A. Colleague and B. Collaborator' },
      { name: 'url', label: 'Slides, recording or abstract', type: 'url', span: 6, placeholder: 'https://…' },
      { name: 'detail', label: 'Note', type: 'textarea', span: 6, hint: 'Optional. Markdown works.' },
    ],
    entry: (t) => ({
      primary: t.title,
      secondary: joinParts([t.event, t.location]),
      meta: t.date,
      badge: optionLabel(TALK_KINDS, t.kind),
      detail: t.detail,
      tertiary: t.coauthors,
      links: buildLinks([{ key: 'url', label: 'Slides', raw: t.url, icon: ExternalLink }]),
    }),
    navLabel: (t) => t.title || t.event || 'Untitled presentation',
    navSub: (t) => joinParts([optionLabel(TALK_KINDS, t.kind), t.event, t.date]),
  },

  /* ---------------------------------------------------------- awards */
  {
    key: 'awards',
    title: 'Awards & Honours',
    nav: 'Awards',
    icon: Trophy,
    group: 'Academic record',
    hint: 'Prizes, fellowships, scholarships, best-paper awards',
    blurb: 'Anything competitive that someone else decided you had won.',
    addLabel: 'Add an award',
    empty: 'No awards yet. Travel grants and best-paper honourable mentions belong here too.',
    fields: [
      { name: 'title', label: 'Award', type: 'text', span: 4, placeholder: 'Best Paper Award' },
      { name: 'year', label: 'Year', type: 'text', span: 2, placeholder: '2025' },
      { name: 'issuer', label: 'Awarded by', type: 'text', span: 4, placeholder: 'ACM SIGCOMM' },
      { name: 'amount', label: 'Value', type: 'text', span: 2, placeholder: '$5,000', hint: 'Optional' },
      { name: 'location', label: 'Location', type: 'text', span: 3, placeholder: 'Boston, MA' },
      { name: 'url', label: 'Link', type: 'url', span: 3, placeholder: 'https://…' },
      { name: 'detail', label: 'Detail', type: 'textarea', span: 6, hint: 'Selection rate, cohort size, what it was for.' },
    ],
    entry: (a) => ({
      primary: a.title,
      secondary: joinParts([a.issuer, a.location]),
      meta: a.year,
      badge: a.amount,
      detail: a.detail,
      links: buildLinks([{ key: 'url', label: 'Details', raw: a.url }]),
    }),
    navLabel: (a) => a.title || 'Untitled award',
    navSub: (a) => joinParts([a.issuer, a.year]),
  },

  /* ---------------------------------------------------------- grants */
  {
    key: 'grants',
    title: 'Grants & Funding',
    nav: 'Grants',
    icon: Banknote,
    group: 'Academic record',
    hint: 'Funded projects, with your role and the amount',
    blurb: 'Kept separate from awards because panels read them differently.',
    addLabel: 'Add funding',
    empty: 'No grants yet. Small internal seed funding still counts.',
    fields: [
      { name: 'title', label: 'Project title', type: 'text', span: 6, placeholder: 'Efficient Inference for Sparse Models' },
      { name: 'agency', label: 'Funder', type: 'text', span: 4, placeholder: 'National Science Foundation' },
      { name: 'role', label: 'Your role', type: 'select', span: 2, options: GRANT_ROLES },
      { name: 'amount', label: 'Amount', type: 'text', span: 2, placeholder: '$248,000' },
      { name: 'number', label: 'Award number', type: 'text', span: 2, placeholder: 'IIS-2412345' },
      { name: 'start', label: 'From', type: 'text', span: 1, placeholder: '2024' },
      { name: 'end', label: 'To', type: 'text', span: 1, placeholder: '2027' },
      { name: 'url', label: 'Link', type: 'url', span: 6, placeholder: 'https://…' },
      { name: 'detail', label: 'Detail', type: 'textarea', span: 6 },
    ],
    entry: (g) => ({
      primary: g.title,
      secondary: joinParts([g.agency, g.number && `Award ${g.number}`]),
      meta: span(g),
      badge: joinParts([optionLabel(GRANT_ROLES, g.role), g.amount], ' · '),
      detail: g.detail,
      links: buildLinks([{ key: 'url', label: 'Award page', raw: g.url }]),
    }),
    navLabel: (g) => g.title || g.agency || 'Untitled grant',
    navSub: (g) => joinParts([g.agency, optionLabel(GRANT_ROLES, g.role), g.amount]),
  },

  /* ---------------------------------------------------------- teaching */
  {
    key: 'teaching',
    title: 'Teaching',
    nav: 'Teaching',
    icon: BookOpen,
    group: 'Academic record',
    hint: 'Courses taught or assisted, and who you mentored',
    blurb: 'Teaching-track and liberal-arts applications weight this heavily.',
    addLabel: 'Add a course',
    empty: 'No teaching yet. Guest lectures and one-off workshops are worth listing.',
    fields: [
      { name: 'course', label: 'Course', type: 'text', span: 4, placeholder: 'CS 4820: Distributed Systems' },
      { name: 'role', label: 'Role', type: 'select', span: 2, options: TEACHING_ROLES },
      { name: 'institution', label: 'Institution', type: 'text', span: 4, placeholder: 'Your University' },
      { name: 'term', label: 'Term', type: 'text', span: 2, placeholder: 'Spring 2025' },
      { name: 'level', label: 'Level / size', type: 'text', span: 3, placeholder: 'Graduate · 60 students' },
      { name: 'rating', label: 'Evaluation', type: 'text', span: 3, placeholder: '4.8 / 5.0', hint: 'Optional' },
      { name: 'bullets', label: 'Highlights', type: 'bullets', span: 6, hint: 'Materials you built, curriculum you changed.' },
    ],
    entry: (t) => ({
      primary: t.course,
      secondary: joinParts([optionLabel(TEACHING_ROLES, t.role), t.institution]),
      meta: t.term,
      badge: t.rating && `Eval ${t.rating}`,
      tertiary: t.level,
      bullets: t.bullets,
    }),
    navLabel: (t) => t.course || 'Untitled course',
    navSub: (t) => joinParts([optionLabel(TEACHING_ROLES, t.role), t.institution, t.term]),
  },

  /* ---------------------------------------------------------- supervision */
  {
    key: 'supervision',
    title: 'Student Supervision',
    nav: 'Supervision',
    icon: GraduationCap,
    group: 'Academic record',
    hint: 'Students and juniors you supervised, and what they worked on',
    blurb:
      'Kept apart from Teaching because hiring panels read them differently: one shows you can run a course, this one shows you can run a researcher.',
    addLabel: 'Add a student',
    empty: 'No supervision yet. Summer interns and undergraduate projects count.',
    groupBy: 'level',
    groupLabels: {
      postdoc: 'Postdoctoral Researchers',
      phd: 'Doctoral Students',
      mphil: 'MPhil Students',
      masters: "Master's Students",
      honours: 'Honours Students',
      undergrad: 'Undergraduate Students',
      intern: 'Interns',
    },
    fields: [
      { name: 'student', label: 'Student', type: 'text', span: 3, placeholder: 'A. Student' },
      { name: 'level', label: 'Level', type: 'select', span: 3, options: SUPERVISION_LEVELS },
      { name: 'role', label: 'Your role', type: 'select', span: 3, options: SUPERVISION_ROLES },
      { name: 'institution', label: 'Institution', type: 'text', span: 3, placeholder: 'Your University' },
      { name: 'project', label: 'Thesis or project title', type: 'text', span: 6, placeholder: 'Sparse Routing for Long-Context Inference' },
      { name: 'start', label: 'From', type: 'text', span: 1, placeholder: '2024' },
      { name: 'end', label: 'To', type: 'text', span: 1, placeholder: '2025' },
      { name: 'outcome', label: 'Outcome', type: 'text', span: 4, placeholder: 'Now a PhD student at MIT', hint: 'Where they went next, or what came out of it.' },
      { name: 'url', label: 'Thesis link', type: 'url', span: 6 },
    ],
    entry: (s) => ({
      primary: joinParts([s.student, s.project], ' — '),
      secondary: joinParts([optionLabel(SUPERVISION_ROLES, s.role), s.institution]),
      meta: span(s),
      badge: optionLabel(SUPERVISION_LEVELS, s.level),
      tertiary: s.outcome,
      links: buildLinks([{ key: 'url', label: 'Thesis', raw: s.url, icon: FileText }]),
    }),
    navLabel: (s) => s.student || s.project || 'Untitled student',
    navSub: (s) => joinParts([optionLabel(SUPERVISION_LEVELS, s.level), s.project, span(s)]),
  },

  /* ---------------------------------------------------------- service */
  {
    key: 'service',
    title: 'Professional Service',
    nav: 'Service',
    icon: Users,
    group: 'Academic record',
    hint: 'Reviewing, programme committees, editorial and organising work',
    blurb: 'The unpaid work the field runs on. Hiring committees do look.',
    addLabel: 'Add service',
    empty: 'No service yet. Reviewing for a single venue is worth a line.',
    fields: [
      { name: 'role', label: 'Role', type: 'text', span: 4, placeholder: 'Reviewer' },
      { name: 'kind', label: 'Kind', type: 'select', span: 2, options: SERVICE_KINDS },
      { name: 'organisation', label: 'Venue or body', type: 'text', span: 4, placeholder: 'NeurIPS, ICML, ICLR' },
      { name: 'start', label: 'From', type: 'text', span: 1, placeholder: '2023' },
      { name: 'end', label: 'To', type: 'text', span: 1, placeholder: '2025' },
      { name: 'detail', label: 'Detail', type: 'textarea', span: 6, hint: 'Number of papers, sub-committee, anything notable.' },
    ],
    entry: (s) => ({
      primary: s.role,
      secondary: s.organisation,
      meta: span(s),
      badge: optionLabel(SERVICE_KINDS, s.kind),
      detail: s.detail,
    }),
    navLabel: (s) => s.role || s.organisation || 'Untitled service',
    navSub: (s) => joinParts([s.organisation, span(s)]),
  },

  /* ---------------------------------------------------------- editorial */
  {
    key: 'editorial',
    title: 'Editorial & Review Boards',
    nav: 'Editorial',
    icon: Stamp,
    group: 'Academic record',
    hint: 'Standing editorial appointments, as distinct from ad-hoc reviewing',
    blurb:
      'A named seat on a board is a different signal from reviewing on request, so it gets its own section rather than disappearing into Service.',
    addLabel: 'Add an appointment',
    empty: 'No editorial appointments yet. A journal review board seat belongs here.',
    groupBy: 'role',
    groupLabels: {
      editor: 'Editor-in-Chief',
      associate: 'Associate Editor',
      guest: 'Guest Editor',
      board: 'Editorial Board',
      reviewer: 'Review Board',
      chair: 'Chair',
    },
    fields: [
      { name: 'venue', label: 'Journal or venue', type: 'text', span: 4, placeholder: 'Transactions on Machine Learning Research' },
      { name: 'role', label: 'Role', type: 'select', span: 2, options: EDITORIAL_ROLES },
      { name: 'publisher', label: 'Publisher / society', type: 'text', span: 4, placeholder: 'ACM' },
      { name: 'issue', label: 'Special issue', type: 'text', span: 2, placeholder: 'Efficient Inference', hint: 'Guest editors only' },
      { name: 'start', label: 'From', type: 'text', span: 1, placeholder: '2024' },
      { name: 'end', label: 'To', type: 'text', span: 1, placeholder: '', hint: 'Blank if current' },
      { name: 'volume', label: 'Volume handled', type: 'text', span: 4, placeholder: '12 manuscripts / year', hint: 'Optional' },
      { name: 'url', label: 'Link', type: 'url', span: 6 },
    ],
    entry: (e) => ({
      primary: e.venue,
      secondary: joinParts([e.publisher, e.issue && `Special issue: ${e.issue}`]),
      meta: span(e),
      badge: optionLabel(EDITORIAL_ROLES, e.role),
      tertiary: e.volume,
      links: buildLinks([{ key: 'url', label: 'Board', raw: e.url }]),
    }),
    navLabel: (e) => e.venue || 'Untitled appointment',
    navSub: (e) => joinParts([optionLabel(EDITORIAL_ROLES, e.role), e.publisher, span(e)]),
  },

  /* ---------------------------------------------------------- organised */
  {
    key: 'organised',
    title: 'Workshops & Events Organised',
    nav: 'Organised',
    icon: CalendarCheck,
    group: 'Academic record',
    hint: 'Events you built rather than attended',
    blurb:
      'Organising is the clearest evidence of standing in a community — it means other people agreed to follow your call for papers.',
    addLabel: 'Add an event',
    empty: 'No events yet. A reading group you convened counts.',
    groupBy: 'kind',
    groupLabels: {
      conference: 'Conferences',
      workshop: 'Workshops',
      symposium: 'Symposia',
      session: 'Sessions & Panels',
      seminar: 'Seminar Series',
      hackathon: 'Hackathons',
      summerschool: 'Summer Schools',
    },
    fields: [
      { name: 'title', label: 'Event', type: 'text', span: 4, placeholder: 'Workshop on Efficient Inference' },
      { name: 'kind', label: 'Kind', type: 'select', span: 2, options: ORGANISED_KINDS },
      { name: 'role', label: 'Your role', type: 'text', span: 3, placeholder: 'Lead organiser' },
      { name: 'host', label: 'Co-located with / host', type: 'text', span: 3, placeholder: 'NeurIPS 2025' },
      { name: 'location', label: 'Location', type: 'text', span: 3, placeholder: 'Vancouver, Canada' },
      { name: 'date', label: 'Date', type: 'text', span: 3, placeholder: 'Dec 2025' },
      { name: 'scale', label: 'Scale', type: 'text', span: 3, placeholder: '120 attendees · 40 submissions', hint: 'Optional but persuasive.' },
      { name: 'url', label: 'Event site', type: 'url', span: 3 },
      { name: 'detail', label: 'Detail', type: 'textarea', span: 6, hint: 'Funding raised, speakers secured, proceedings published.' },
    ],
    entry: (o) => ({
      primary: o.title,
      secondary: joinParts([o.role, o.host, o.location]),
      meta: o.date,
      badge: optionLabel(ORGANISED_KINDS, o.kind),
      tertiary: o.scale,
      detail: o.detail,
      links: buildLinks([{ key: 'url', label: 'Site', raw: o.url, icon: ExternalLink }]),
    }),
    navLabel: (o) => o.title || 'Untitled event',
    navSub: (o) => joinParts([optionLabel(ORGANISED_KINDS, o.kind), o.host, o.date]),
  },

  /* ---------------------------------------------------------- datasets */
  {
    key: 'datasets',
    title: 'Datasets & Software',
    nav: 'Datasets & Software',
    icon: Database,
    group: 'Academic record',
    hint: 'Released artefacts: data, code, models, benchmarks',
    blurb:
      'Artefacts are cited and downloaded independently of the papers that introduced them, so they earn their own section with their own DOIs.',
    addLabel: 'Add an artefact',
    empty: 'No releases yet. A tagged, documented repository is enough to list.',
    groupBy: 'kind',
    groupLabels: {
      dataset: 'Datasets',
      software: 'Software',
      model: 'Models',
      package: 'Packages',
      benchmark: 'Benchmarks',
      protocol: 'Protocols',
    },
    fields: [
      { name: 'name', label: 'Name', type: 'text', span: 4, placeholder: 'sparse-serve' },
      { name: 'kind', label: 'Kind', type: 'select', span: 2, options: ARTEFACT_KINDS },
      { name: 'role', label: 'Your role', type: 'text', span: 3, placeholder: 'Lead author / maintainer' },
      { name: 'year', label: 'Year', type: 'text', span: 3, placeholder: '2025' },
      { name: 'venue', label: 'Host / archive', type: 'text', span: 3, placeholder: 'Zenodo, Hugging Face, PyPI' },
      { name: 'licence', label: 'Licence', type: 'text', span: 3, placeholder: 'Apache-2.0' },
      { name: 'doi', label: 'DOI', type: 'text', span: 3, placeholder: '10.5281/zenodo.1234567' },
      { name: 'impact', label: 'Uptake', type: 'text', span: 3, placeholder: '1.2k stars · 40k downloads', hint: 'Optional' },
      { name: 'url', label: 'Repository or landing page', type: 'url', span: 3 },
      { name: 'demo', label: 'Demo', type: 'url', span: 3 },
      { name: 'detail', label: 'Description', type: 'textarea', span: 6, hint: 'One or two sentences. Markdown works.' },
    ],
    entry: (d) => ({
      primary: d.name,
      secondary: joinParts([d.role, d.venue, d.licence]),
      meta: d.year,
      badge: optionLabel(ARTEFACT_KINDS, d.kind),
      tertiary: joinParts([d.impact, d.doi && `DOI ${d.doi}`]),
      detail: d.detail,
      links: buildLinks([
        { key: 'url', label: 'Code', raw: d.url, icon: Github },
        { key: 'demo', label: 'Demo', raw: d.demo, icon: PlayCircle },
        { key: 'doi', label: 'DOI', raw: d.doi && `https://doi.org/${String(d.doi).replace(/^doi:\s*/i, '')}`, icon: Link2 },
      ]),
    }),
    navLabel: (d) => d.name || 'Untitled artefact',
    navSub: (d) => joinParts([optionLabel(ARTEFACT_KINDS, d.kind), d.venue, d.year]),
  },

  /* ---------------------------------------------------------- media */
  {
    key: 'media',
    title: 'Media & Press',
    nav: 'Media',
    icon: Newspaper,
    group: 'Further detail',
    hint: 'Coverage of your work, and outreach you took part in',
    blurb:
      'Evidence of public engagement, which grant panels and industry recruiters both look for and academic CVs routinely forget to include.',
    addLabel: 'Add coverage',
    empty: 'No coverage yet. A departmental news post or a podcast episode counts.',
    fields: [
      { name: 'title', label: 'Headline or episode', type: 'text', span: 4, placeholder: 'The quiet race to make AI cheaper' },
      { name: 'kind', label: 'Kind', type: 'select', span: 2, options: MEDIA_KINDS },
      { name: 'outlet', label: 'Outlet', type: 'text', span: 4, placeholder: 'The Guardian' },
      { name: 'date', label: 'Date', type: 'text', span: 2, placeholder: 'Mar 2025' },
      { name: 'role', label: 'Your part', type: 'text', span: 3, placeholder: 'Interviewed', hint: 'Interviewed, quoted, authored, guest.' },
      { name: 'url', label: 'Link', type: 'url', span: 3 },
      { name: 'detail', label: 'Note', type: 'textarea', span: 6, hint: 'Syndication, audience size, anything notable.' },
    ],
    entry: (m) => ({
      primary: m.title,
      secondary: joinParts([m.outlet, m.role]),
      meta: m.date,
      badge: optionLabel(MEDIA_KINDS, m.kind),
      detail: m.detail,
      links: buildLinks([{ key: 'url', label: 'Read', raw: m.url, icon: ExternalLink }]),
    }),
    navLabel: (m) => m.title || m.outlet || 'Untitled coverage',
    navSub: (m) => joinParts([optionLabel(MEDIA_KINDS, m.kind), m.outlet, m.date]),
  },

  /* ---------------------------------------------------------- development */
  {
    key: 'development',
    title: 'Professional Development',
    nav: 'Development',
    icon: Lightbulb,
    group: 'Further detail',
    hint: 'Summer schools, residencies, intensive courses',
    blurb:
      'Training you sought out. Distinct from Certifications, which record a credential rather than the experience of earning it.',
    addLabel: 'Add training',
    empty: 'No training yet. A competitive summer school is worth a line.',
    fields: [
      { name: 'title', label: 'Programme', type: 'text', span: 4, placeholder: 'Oxford Machine Learning Summer School' },
      { name: 'kind', label: 'Kind', type: 'select', span: 2, options: DEVELOPMENT_KINDS },
      { name: 'organisation', label: 'Host', type: 'text', span: 4, placeholder: 'University of Oxford' },
      { name: 'date', label: 'Date', type: 'text', span: 2, placeholder: 'Jul 2024' },
      { name: 'location', label: 'Location', type: 'text', span: 3, placeholder: 'Oxford, UK' },
      { name: 'selectivity', label: 'Selection', type: 'text', span: 3, placeholder: 'Selected from 900 applicants', hint: 'Optional but worth saying.' },
      { name: 'url', label: 'Link', type: 'url', span: 6 },
      { name: 'detail', label: 'Detail', type: 'textarea', span: 6, hint: 'What you built or learned there.' },
    ],
    entry: (d) => ({
      primary: d.title,
      secondary: joinParts([d.organisation, d.location]),
      meta: d.date,
      badge: optionLabel(DEVELOPMENT_KINDS, d.kind),
      tertiary: d.selectivity,
      detail: d.detail,
      links: buildLinks([{ key: 'url', label: 'Programme', raw: d.url }]),
    }),
    navLabel: (d) => d.title || 'Untitled programme',
    navSub: (d) => joinParts([optionLabel(DEVELOPMENT_KINDS, d.kind), d.organisation, d.date]),
  },

  /* ---------------------------------------------------------- conferences */
  {
    key: 'conferences',
    title: 'Conferences Attended',
    nav: 'Conferences',
    icon: Ticket,
    group: 'Further detail',
    hint: 'Meetings you attended without presenting',
    blurb:
      'Rendered as one flowing line, because attendance is context rather than achievement — anything you presented belongs in Talks instead.',
    addLabel: 'Add a conference',
    empty: 'No conferences yet. Only list attendance without a presentation here.',
    layout: 'inline',
    fields: [
      { name: 'name', label: 'Conference', type: 'text', span: 4, placeholder: 'NeurIPS' },
      { name: 'year', label: 'Year', type: 'text', span: 2, placeholder: '2025' },
      { name: 'location', label: 'Location', type: 'text', span: 3, placeholder: 'Vancouver, Canada' },
      { name: 'mode', label: 'Mode', type: 'select', span: 3, options: CONFERENCE_MODES },
      { name: 'role', label: 'Capacity', type: 'text', span: 6, placeholder: 'Travel grant recipient', hint: 'Optional' },
    ],
    inlineText: (c) => joinParts([joinParts([c.name, c.year], ' '), c.location], ', '),
    entry: (c) => ({
      primary: joinParts([c.name, c.year], ' '),
      secondary: c.location,
      meta: c.role,
      badge: c.mode === 'inperson' ? '' : optionLabel(CONFERENCE_MODES, c.mode),
    }),
    navLabel: (c) => joinParts([c.name, c.year], ' ') || 'Untitled conference',
    navSub: (c) => joinParts([c.location, optionLabel(CONFERENCE_MODES, c.mode)]),
  },

  /* ---------------------------------------------------------- memberships */
  {
    key: 'memberships',
    title: 'Memberships & Affiliations',
    nav: 'Memberships',
    icon: Building2,
    group: 'Academic record',
    hint: 'Learned societies and professional bodies',
    blurb: 'Short by design — organisation, your standing, and since when.',
    addLabel: 'Add a membership',
    empty: 'No memberships yet.',
    fields: [
      { name: 'organisation', label: 'Organisation', type: 'text', span: 4, placeholder: 'Association for Computing Machinery' },
      { name: 'role', label: 'Grade / role', type: 'text', span: 2, placeholder: 'Member' },
      { name: 'start', label: 'Since', type: 'text', span: 2, placeholder: '2021' },
      { name: 'end', label: 'Until', type: 'text', span: 2, placeholder: '', hint: 'Blank if current' },
      { name: 'number', label: 'Member number', type: 'text', span: 2, placeholder: '', hint: 'Optional' },
      { name: 'url', label: 'Link', type: 'url', span: 6 },
    ],
    entry: (m) => ({
      primary: m.organisation,
      secondary: m.role,
      meta: span(m),
      links: buildLinks([{ key: 'url', label: 'Profile', raw: m.url }]),
    }),
    navLabel: (m) => m.organisation || 'Untitled membership',
    navSub: (m) => joinParts([m.role, span(m)]),
  },

  /* ---------------------------------------------------------- certifications */
  {
    key: 'certifications',
    title: 'Certifications & Training',
    nav: 'Certifications',
    icon: BadgeCheck,
    group: 'Further detail',
    hint: 'Credentials, licences and formal training',
    blurb: 'Industry résumés use this far more than academic CVs do.',
    addLabel: 'Add a certification',
    empty: 'No certifications yet.',
    fields: [
      { name: 'name', label: 'Certification', type: 'text', span: 4, placeholder: 'AWS Solutions Architect – Associate' },
      { name: 'year', label: 'Year', type: 'text', span: 2, placeholder: '2024' },
      { name: 'issuer', label: 'Issued by', type: 'text', span: 4, placeholder: 'Amazon Web Services' },
      { name: 'credentialId', label: 'Credential ID', type: 'text', span: 2, placeholder: '', hint: 'Optional' },
      { name: 'url', label: 'Verify at', type: 'url', span: 6 },
      { name: 'detail', label: 'Detail', type: 'textarea', span: 6 },
    ],
    entry: (c) => ({
      primary: c.name,
      secondary: joinParts([c.issuer, c.credentialId && `ID ${c.credentialId}`]),
      meta: c.year,
      detail: c.detail,
      links: buildLinks([{ key: 'url', label: 'Verify', raw: c.url, icon: BadgeCheck }]),
    }),
    navLabel: (c) => c.name || 'Untitled certification',
    navSub: (c) => joinParts([c.issuer, c.year]),
  },

  /* ---------------------------------------------------------- patents */
  {
    key: 'patents',
    title: 'Patents',
    nav: 'Patents',
    icon: ScrollText,
    group: 'Further detail',
    hint: 'Granted, pending and provisional filings',
    blurb: 'Listed separately from publications, as review panels expect.',
    addLabel: 'Add a patent',
    empty: 'No patents yet.',
    fields: [
      { name: 'title', label: 'Title', type: 'text', span: 6, placeholder: 'Method for Sparse Expert Routing' },
      { name: 'number', label: 'Number', type: 'text', span: 2, placeholder: 'US 11,987,654 B2' },
      { name: 'status', label: 'Status', type: 'select', span: 2, options: PATENT_STATUS },
      { name: 'date', label: 'Date', type: 'text', span: 2, placeholder: 'Mar 2025' },
      { name: 'inventors', label: 'Inventors', type: 'text', span: 4, placeholder: 'N. S. Pathan, A. Colleague' },
      { name: 'office', label: 'Office', type: 'text', span: 2, placeholder: 'USPTO' },
      { name: 'url', label: 'Link', type: 'url', span: 6 },
    ],
    entry: (p) => ({
      primary: p.title,
      secondary: joinParts([p.inventors, p.office, p.number]),
      meta: p.date,
      badge: optionLabel(PATENT_STATUS, p.status),
      links: buildLinks([{ key: 'url', label: 'Filing', raw: p.url }]),
    }),
    navLabel: (p) => p.title || 'Untitled patent',
    navSub: (p) => joinParts([p.number, optionLabel(PATENT_STATUS, p.status), p.date]),
  },

  /* ---------------------------------------------------------- languages */
  {
    key: 'languages',
    title: 'Languages',
    nav: 'Languages',
    icon: LanguagesIcon,
    group: 'Further detail',
    hint: 'Spoken and written languages, with proficiency',
    blurb: 'Rendered as one flowing line rather than a list — it reads better and costs less space.',
    addLabel: 'Add a language',
    empty: 'No languages yet.',
    layout: 'inline',
    fields: [
      { name: 'language', label: 'Language', type: 'text', span: 3, placeholder: 'Bengali' },
      { name: 'level', label: 'Proficiency', type: 'select', span: 3, options: LANGUAGE_LEVELS },
      { name: 'detail', label: 'Note', type: 'text', span: 6, placeholder: 'IELTS 8.0', hint: 'Optional' },
    ],
    inlineText: (l) =>
      joinParts([l.language, optionLabel(LANGUAGE_LEVELS, l.level) && `(${optionLabel(LANGUAGE_LEVELS, l.level)})`], ' '),
    entry: (l) => ({
      primary: l.language,
      secondary: optionLabel(LANGUAGE_LEVELS, l.level),
      meta: l.detail,
    }),
    navLabel: (l) => l.language || 'Untitled language',
    navSub: (l) => joinParts([optionLabel(LANGUAGE_LEVELS, l.level), l.detail]),
  },

  /* ---------------------------------------------------------- volunteering */
  {
    key: 'volunteering',
    title: 'Volunteering & Outreach',
    nav: 'Outreach',
    icon: Heart,
    group: 'Further detail',
    hint: 'Community work, mentoring, science communication',
    blurb: 'Broader-impacts statements draw on exactly this.',
    addLabel: 'Add outreach',
    empty: 'No outreach yet.',
    fields: [
      { name: 'role', label: 'Role', type: 'text', span: 4, placeholder: 'Workshop Facilitator' },
      { name: 'organisation', label: 'Organisation', type: 'text', span: 4, placeholder: 'Girls Who Code' },
      { name: 'location', label: 'Location', type: 'text', span: 2, placeholder: 'Boston, MA' },
      { name: 'start', label: 'From', type: 'text', span: 1, placeholder: '2023' },
      { name: 'end', label: 'To', type: 'text', span: 1, placeholder: '' },
      { name: 'bullets', label: 'Highlights', type: 'bullets', span: 6 },
    ],
    entry: (v) => ({
      primary: v.role,
      secondary: joinParts([v.organisation, v.location]),
      meta: span(v),
      bullets: v.bullets,
    }),
    navLabel: (v) => v.role || v.organisation || 'Untitled entry',
    navSub: (v) => joinParts([v.organisation, span(v)]),
  },

  /* ---------------------------------------------------------- references */
  {
    key: 'references',
    title: 'References',
    nav: 'References',
    icon: UserCheck,
    group: 'Further detail',
    hint: 'Referees, with how they know you',
    blurb:
      'Hide this section and add one entry reading "Available on request" if you would rather not publish contact details.',
    addLabel: 'Add a referee',
    empty: 'No referees yet. Most people hide this section until asked.',
    fields: [
      { name: 'name', label: 'Name', type: 'text', span: 3, placeholder: 'Prof. A. Supervisor' },
      { name: 'position', label: 'Position', type: 'text', span: 3, placeholder: 'Professor of Computer Science' },
      { name: 'organisation', label: 'Organisation', type: 'text', span: 3, placeholder: 'Your University' },
      { name: 'relationship', label: 'Relationship', type: 'text', span: 3, placeholder: 'Doctoral advisor' },
      { name: 'email', label: 'Email', type: 'text', span: 3, placeholder: 'a.supervisor@university.edu' },
      { name: 'phone', label: 'Phone', type: 'text', span: 3, placeholder: '' },
    ],
    entry: (r) => ({
      primary: r.name,
      secondary: joinParts([r.position, r.organisation]),
      meta: r.relationship,
      tertiary: joinParts([r.email, r.phone]),
      links: buildLinks([
        { key: 'url', label: r.email, raw: r.email ? `mailto:${r.email}` : '', icon: Mail },
      ]),
    }),
    navLabel: (r) => r.name || 'Untitled referee',
    navSub: (r) => joinParts([r.position, r.organisation]),
  },
];

/** @type {Record<string, SectionSchema>} */
export const SCHEMA_BY_KEY = Object.fromEntries(SECTION_SCHEMAS.map((s) => [s.key, s]));

/** @type {string[]} Keys of the schema-driven sections, in default page order. */
export const SCHEMA_KEYS = SECTION_SCHEMAS.map((s) => s.key);

/* ============================================================
   Normalising and templating, generated from `fields`
   ============================================================ */

/**
 * The empty value for a field type.
 *
 * @param {FieldSpec} f
 * @returns {string|string[]|boolean}
 */
function blankValue(f) {
  switch (f.type) {
    case 'tags':
    case 'bullets':
      return [];
    case 'check':
      return false;
    case 'select':
      return f.options?.[0]?.value ?? '';
    default:
      return '';
  }
}

/**
 * Coerce one raw value to the type its field declares.
 *
 * @param {FieldSpec} f
 * @param {unknown} raw
 * @returns {string|string[]|boolean}
 */
function coerce(f, raw) {
  switch (f.type) {
    case 'tags':
    case 'bullets':
      return Array.isArray(raw) ? raw.map((v) => String(v)) : [];
    case 'check':
      return Boolean(raw);
    case 'select': {
      const v = typeof raw === 'string' ? raw : '';
      return f.options?.some((o) => o.value === v) ? v : blankValue(f);
    }
    default:
      return typeof raw === 'string' ? raw : '';
  }
}

/**
 * A blank item for the given section.
 *
 * @param {string} key
 * @param {(prefix: string) => string} makeId
 * @returns {Object}
 */
export function blankItem(key, makeId) {
  const schema = SCHEMA_BY_KEY[key];
  if (!schema) return { id: makeId(key.slice(0, 2)), include: true };
  const out = { id: makeId(key.slice(0, 3)), include: true };
  schema.fields.forEach((f) => {
    out[f.name] = blankValue(f);
  });
  return out;
}

/**
 * Repair one stored item so every declared field is present and correctly
 * typed. Unknown extra keys are dropped, which is what keeps a hand-edited
 * file from silently carrying junk forward.
 *
 * @param {string} key
 * @param {unknown} raw
 * @param {(prefix: string) => string} makeId
 * @returns {Object}
 */
export function normaliseItem(key, raw, makeId) {
  const schema = SCHEMA_BY_KEY[key];
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {
    id: typeof src.id === 'string' && src.id ? src.id : makeId(key.slice(0, 3)),
    include: src.include !== false,
  };
  if (!schema) return out;
  schema.fields.forEach((f) => {
    out[f.name] = coerce(f, src[f.name]);
  });
  return out;
}

/**
 * Split a list into ordered groups when the schema asks for it; otherwise one
 * anonymous group. Themes render subheadings only when there is more than one.
 *
 * @param {SectionSchema} schema
 * @param {any[]} items
 * @returns {Array<{key: string, label: string, items: any[]}>}
 */
export function groupItems(schema, items) {
  if (!schema.groupBy) return [{ key: 'all', label: '', items }];

  const order = Object.keys(schema.groupLabels || {});
  /** @type {Map<string, any[]>} */
  const buckets = new Map();
  items.forEach((it) => {
    const k = it[schema.groupBy] || 'other';
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(it);
  });

  const known = order.filter((k) => buckets.has(k));
  const unknown = [...buckets.keys()].filter((k) => !order.includes(k));

  return [...known, ...unknown].map((k) => ({
    key: k,
    label: schema.groupLabels?.[k] || '',
    items: buckets.get(k),
  }));
}
