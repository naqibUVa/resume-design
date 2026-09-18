# Résumé & CV Builder

A local-first web app for maintaining **one** set of career data and printing several
different documents from it — an academic CV with every publication, an ATS-safe
one-pager, a modern engineering résumé — without ever retyping or deleting anything.

Twenty-four sections, ten themes (two ported from LaTeX `.sty` files), fourteen
font pairings with an independent heading face and six type sizes, and twenty-three
profile links drawn as real brand marks. Built with React 18 + Vite, Tailwind CSS,
Lucide + Simple Icons, and the browser's own print pipeline for **vector** PDF
output with clickable links.

Your document is kept as an ordinary file in `data/resume.json` inside this
folder, so it survives a cleared cache and travels with the project.

---

## Contents

1. [Running it](#1-running-it)
2. [How it works](#2-how-it-works)
3. [Sections, themes, typography and icons](#3-sections-themes-typography-and-icons)
4. [Importing publications from BibTeX](#4-importing-publications-from-bibtex)
5. [Visibility: one document, several audiences](#5-visibility-one-document-several-audiences)
6. [Exporting a PDF](#6-exporting-a-pdf)
7. [Where your data lives, and how to move it](#7-where-your-data-lives-and-how-to-move-it)
8. [Project layout](#8-project-layout)
9. [Editing and extending it](#9-editing-and-extending-it)
10. [Deploying](#10-deploying)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Running it

### The easy way — double-click

| Your machine | Double-click this      |
| ------------ | ---------------------- |
| macOS        | **`start.command`**    |
| Windows      | **`start.bat`**        |
| Linux        | **`./start.sh`** from a terminal |

That is the whole procedure. The script checks that Node.js is installed and new
enough, installs the dependencies the first time (into `./node_modules` — nothing
touches the rest of your system), starts a local server, and opens the app in your
browser. Later runs skip straight to the last step.

**Leave the terminal window open while you work.** It *is* the server; closing it
stops the app. Press `Ctrl+C` there when you are done.

If anything is missing or broken, the script says so in plain words and gives you
the exact command to fix it — it never just prints "Error".

Extra flags, all optional:

| Command                  | What it does                                                     |
| ------------------------ | ---------------------------------------------------------------- |
| `./start.sh`             | Install if needed, then the dev server with hot reload             |
| `./start.sh --built`     | Build once, then serve the static `dist/` — what a visitor sees    |
| `./start.sh --check`     | Print diagnostics (Node, npm, deps, port) and stop                 |
| `./start.sh --clean`     | Delete `node_modules` and reinstall from scratch                   |
| `./start.sh --port 5300` | Use a different port                                              |

`start.bat` takes the same flags on Windows.

> **Do not double-click `index.html`.** It is a Vite *source* file: its only script
> is `/src/main.jsx`, which is JSX with bare package imports, and no browser can
> compile or resolve that on its own. If you try, the page now explains this
> instead of sitting blank. See [Troubleshooting](#11-troubleshooting).

### The manual way

You need [Node.js](https://nodejs.org) 18 or newer — check with `node -v`.

```bash
cd Resume_design
npm install        # once
npm run dev        # starts on http://localhost:5180 and opens a browser
```

Other commands:

| Command           | What it does                                              |
| ----------------- | --------------------------------------------------------- |
| `npm run dev`     | Development server with hot reload                          |
| `npm run build`   | Production build into `dist/`                               |
| `npm run preview` | Serve the built `dist/` locally, to check it before deploying |
| `npm run lint`    | ESLint over the project                                     |
| `npm test`        | Server-renders all ten themes and asserts 512 things (see [§9](#9-editing-and-extending-it)) |
| `npm run shots`   | Renders every theme to `.shots/*.png` so you can *look* at them |
| `npm run check`   | Lint, test and build in one go                              |

`npm run build` produces a `dist/` folder of plain static files with **relative**
asset paths, so it works from any directory on any static host — including a
GitHub Pages project subpath — with no configuration.

---

## 2. How it works

There is one document, held in `src/context/ResumeContext.jsx`. Everything else
reads from it or dispatches an action against it.

```
your typing ──▶ reducer ──▶ document ──┬──▶ live preview (on screen, scaled)
                              │         └──▶ print copy (portal → PDF)
                              │
                              ├──▶ data/resume.json   (debounced 600 ms, via the
                              │                        dev/preview server)
                              └──▶ localStorage       (debounced 600 ms, fallback)
```

Three properties fall out of that shape and are worth knowing:

- **Nothing is ever lost by hiding it.** Toggling a section or an item off sets a
  flag; the data stays in the document.
- **The preview is the PDF.** There is no separate export renderer that could
  drift out of sync — the same theme component renders both.
- **Every load is normalised.** A hand-edited or half-broken JSON file is repaired
  against the defaults rather than crashing the app. Unknown keys are dropped,
  missing ones are filled in.
- **The folder copy is the real one.** On launch the app reads `data/resume.json`
  first and only falls back to the browser copy if there is no server behind the
  page. See [§7](#7-where-your-data-lives-and-how-to-move-it).

Undo (last 30 edits) and redo live in the header.

---

## 3. Sections, themes, typography and icons

### 3.1 The twenty-four sections

Six sections have hand-written editors, because their shapes are irregular:
**About**, **Education**, **Experience**, **Projects**, **Publications** and
**Skills**.

The other eighteen are *schema-driven*. Each one is a single object in
`src/data/sectionSchemas.js` that describes its fields; from that one object the
app derives the editor, the visibility matrix row, the sidebar entry and how all
ten themes lay it out. Adding a nineteenth is one object and nothing else.

| Section | Group | What it holds |
| ------- | ----- | ------------- |
| **Presentations & Talks** | Academic record | Title, event, place, date, and a **kind**: Keynote / Invited talk / Conference talk / **Oral presentation** / **Poster** / Panel / Seminar / Workshop / Lecture. Entries are grouped under their kind on the page. |
| **Awards & Honours** | Academic record | Award, awarding body, year, amount, short note |
| **Grants & Funding** | Academic record | Title, funder, role (PI / Co-I / …), amount, period, grant number |
| **Teaching** | Academic record | Course, institution, role, level, term, enrolment, description |
| **Student Supervision** ° | Academic record | Student, level (Postdoc → Intern), your role, institution, thesis title, period, outcome, thesis link. Grouped by level. Kept apart from Teaching because panels read them differently: one shows you can run a course, this one shows you can run a researcher. |
| **Professional Service** | Academic record | Role, organisation, period — reviewing, committees, panels |
| **Editorial & Review Boards** ° | Academic record | Journal or venue, role, publisher, special issue, period, volume handled, link |
| **Workshops & Events Organised** ° | Academic record | Event, kind, your role, co-located with, location, date, scale, event site |
| **Datasets & Software** ° | Academic record | Name, kind, your role, year, host/archive, licence, DOI, uptake, repository, demo. Emits Code / Demo / DOI links when the fields are filled. |
| **Memberships & Affiliations** | Academic record | Society, membership grade, period |
| **Media & Press** ° | Further detail | Headline or episode, kind, outlet, date, your part, link |
| **Professional Development** ° | Further detail | Programme, kind, host, date, location, selectivity, link |
| **Conferences Attended** ° | Further detail | Conference, year, location, mode, capacity. Prints as a compact inline list, not one block per row. |
| **Certifications & Training** | Further detail | Name, issuer, date, expiry, credential ID and URL |
| **Patents** | Further detail | Title, number, status, filing/grant date, inventors |
| **Languages** | Further detail | Language and proficiency (Native → Elementary), optional certificate |
| **Volunteering & Outreach** | Further detail | Role, organisation, period, description |
| **References** | Further detail | Name, title, institution, email, phone — or an "available on request" line |

Every one of them can be **renamed**, **reordered**, **hidden**, and filtered
item-by-item, exactly like the original six.

**° = present but switched off in the sample document.** Eleven sections ship off
— the seven marked above plus Certifications, Patents, Volunteering and References
— so a first run does not look cluttered. Each still holds one sample entry, so
turning it on in the **Visibility** panel shows you immediately what it looks
like; replace the sample and it is yours.

### 3.2 The ten themes

Pick one from the dropdown at the top of the preview pane — it is grouped by
family — or press **Browse layouts** to see thumbnails of all ten. The switch is
instant and lossless: the same data, laid out differently.

**Classic**

- **Academic** — Serif throughout. Centred name block, ruled headings, one-inch
  margins. Publications grouped by kind and numbered continuously, the way a
  citation list is numbered on a paper. For faculty and postdoc applications.
- **Simplistic** — One column, one reading order, conventional section names, no
  icons, no colour. Send this when a parser will read it before a human does;
  Markdown emphasis is deliberately stripped so the text stream stays plain.
- **Editorial** — Magazine styling: display serif, a drop-capped opening
  paragraph, hairline rules.

**Modern**

- **Tech / Modern** — Sans-serif, tinted header, skill chips, prominent links.
- **Sidebar** — Coloured left rail carrying contact, skills and the short
  sections; the main column runs the narrative.
- **Banner** — Full-bleed colour header with a monogram, then a clean single
  column.

**Structured**

- **Timeline** — Dated vertical rail with markers; chronology reads first.
- **Compact CV** — Two dense columns, built to fit a long academic record into
  few pages.

**LaTeX (from your `.sty`)** — both ported from the `cv-llt` style file you
supplied. The two files you uploaded (`sty1.sty` and `sty2.sty`) turned out to be
byte-identical, so rather than ship the same theme twice these are two different
readings of the one template:

- **Swish** — the faithful port. Olive tikz-shaded rules under each heading
  (`SwishLineColour`), crimson circled citation numbers (`MarkerColour`), the
  right-aligned `\keyalignment{r}` date column, `\makefield` icon boxes in the
  contact row, and the `\faBookmark` prefix marker hanging in the margin. Its
  palette is fixed, exactly as the `.sty` fixes it, so the accent picker does not
  apply. One deliberate departure: the `.sty`'s own margins are kept as-is,
  rather than the template's. The page size is yours to choose — set **Page → A4**
  in the strip above the preview to match the original.
- **Marker** — the same machinery, looser: **every** entry in the document is
  numbered in a filled disc, not just the bibliography, headings are small-caps,
  and the whole thing follows your chosen accent colour.

### 3.3 Typography — three controls that compose

The strip above the preview has a **typography row** of three dropdowns. They are
separate on purpose, and they stack: pick a body face, optionally override just
the headings, then scale the whole thing.

| Control      | Options | What it does |
| ------------ | ------- | ------------ |
| **Font**     | 14 pairings + **Theme default** | Sets the body face — and the headings too, unless you override them below. Inter, Helvetica/Arial, Calibri, Georgia, Palatino, Garamond, Charter/Cambria, Times New Roman, Latin Modern (LaTeX), serif-body-with-sans-heads and its inverse, slab headings, monospace headings. **Theme default** leaves each theme with the faces it was designed around. |
| **Headings** | **Match body** + 13 heading faces | Overrides the heading face alone. A Georgia body under Inter headings is a different document from either on its own, and this is how you get it without a fifteenth pairing for every combination. |
| **Size**     | Extra small (−12%) / Small (−6%) / **Default** / Large (+6%) / Larger (+12%) / Extra large (+20%) | Scales *every* type size in the document at once, headings and body together, keeping the theme's proportions intact. Extra small buys roughly half a page; extra large costs about the same. |

**Size is not Density.** Size scales the glyphs; Density (below) scales the space
around them. Being one line over the page break is usually a Size problem;
looking cramped is usually a Density one. They work together and neither is a
substitute for the other.

How Size works, since it is unusual: the themes set type in absolute points
(`10.5pt`), which is what makes the printed page predictable and which no
root-font-size trick can override. So every size in every theme is written as
`calc(10.5pt * var(--rf-fs, 1))`. With the variable unset the fallback is `1`
and the output is byte-identical to before the feature existed; setting it once
on the paper element rescales all of it. `zoom` would have been simpler and
wrong — it scales the page box and its margins along with the text.

Every stack is built from fonts already on your machine. Nothing is fetched from
a CDN, for two reasons: the app is meant to run offline from `start.sh`, and a
webfont that has not finished loading when the print dialog opens produces a PDF
set in the fallback — silently, and only sometimes.

### 3.4 Links and icons

**Real brand marks.** GitHub, LinkedIn, Google Scholar, ORCID, ResearchGate,
arXiv, Hugging Face, Kaggle, Stack Overflow, GitLab, DBLP, OSF, Zenodo, Semantic
Scholar, CodePen, X, Bluesky, Mastodon, YouTube, Instagram and Medium are drawn
with their **own** logos — single-path [Simple Icons](https://simpleicons.org)
marks (CC0), inlined as components in `src/components/icons/BrandIcons.jsx` so
nothing is fetched at runtime. They are drawn at 0.88 of nominal size so they sit
optically level with the Lucide glyphs beside them, which carry more internal
padding.

**Twenty-three profile slots.** Website, GitHub, LinkedIn and Google Scholar show
by default; the rest are one click away under **More profiles** in the General
panel. Email, phone and location have their own icons too.

**How a link prints — the Links dropdown.**

| Setting | A GitHub profile prints as |
| ------- | -------------------------- |
| **Name only** *(default)* | `GitHub` |
| **Short address** | `github.com/you` |
| **Full URL** | `https://github.com/you` |

In all three the `href` is the full address, so the PDF link works identically —
only the visible text changes. "Name only" gives you a masthead reading
*Website · GitHub · LinkedIn · Scholar · ORCID* instead of five wrapped URLs.

One deliberate exception: **the Simplistic theme ignores this setting** and always
prints the short address. It is the ATS-safe theme, and a parser reads the text
node rather than the `href` — a masthead reading "GitHub · LinkedIn" gives it
nothing to extract.

**Entry links.** Code, Paper, Demo, DOI, Slides, Video, Data and generic links
each have their own glyph. **A link only appears — icon, label and all — once it
holds a real address.** That is structural, not a special case: every candidate
URL is run through `safeHref`, which allows only `https:`, `http:` and `mailto:`,
and anything that fails is dropped before the row is built. Empty fields render
nothing at all: no icon, no label, no stray separator.

Icons can be turned off wholesale (**Show icons**), and Simplistic ignores them
regardless.

### 3.5 The settings that apply on top

- **Accent** — eight presets, all chosen to stay legible in greyscale. Ignored by
  Academic, Simplistic and Swish, which have fixed palettes by design.
- **Density** — Compact / Normal / Roomy. Adjusts page margins and spacing.
  Compact is often the difference between two pages and one. See the note in
  [§3.3](#33-typography--three-controls-that-compose) on why this is not the
  same control as Size.

### 3.6 Page setup — size and margins

Two controls, `Page` and `Margins`, sitting on their own row. They change the
sheet in the preview and the page box in the PDF together, so the preview stays
honest: the page-break rulers drawn across it are computed from the same
geometry the print engine paginates with.

- **Page** — **US Letter** (8.5 × 11 in) or **A4** (210 × 297 mm). A4 is
  narrower and three quarters of an inch taller, which is enough to move a page
  break, so pick the one your reader prints on. The choice is written into the
  `@page` rule, so the browser's own print dialog opens on the right paper.
- **Margins** — **Theme default**, or a fixed **Narrow** (0.5 in), **Normal**
  (0.75 in) or **Wide** (1 in). "Theme default" keeps whatever the theme picks
  for the current density, which is part of each design; the fixed presets
  override it. Margin is usually a better lever than type size when you are one
  line over: Narrow buys roughly two lines a page without touching legibility.

**The margins apply to every page, not just the first.** They live on the CSS
page box (`@page`), which the print engine repeats per sheet — not on the
résumé's padding, which would only ever open a gap above the first line and
below the last one. That distinction is the whole reason page two used to start
hard against the paper edge.

**Banner and Sidebar are exceptions at the edges.** Both are drawn to the paper
edge — a colour band across the top, a coloured rail down the left — so they
keep zero side margins whatever you pick, and the band still bleeds off the top
of page one. The margin control still gives their continuation pages their top
and bottom air, which is what they were missing.

---

## 4. Importing publications from BibTeX

Open the **Publications** panel. You can:

- Drag a `.bib` file onto the drop zone,
- click **Choose a file**,
- paste BibTeX into the text area and press **Parse entries**, or
- click **Load sample** to try it with the bundled `src/data/sampleBibtex.bib`.

The sample document already carries three publications — a journal article, a
conference paper and a preprint — so you can see how a bibliography is laid out
before importing anything. Delete them when you add your own.

Parsed entries appear in a review list with a checkbox each. Untick anything you
do not want, then **Add to publications**. Nothing touches your document until you
do — importing a 300-entry library and then trying to undo it is not a good
afternoon.

The parser (`src/utils/bibtexParser.js`) is hand-written, has no dependencies, and
handles:

- `@article`, `@inproceedings`, `@incollection`, `@book`, `@phdthesis`,
  `@mastersthesis`, `@techreport`, `@misc` and seven more
- `@string` abbreviations and `#` concatenation
- Both `{braced}` and `"quoted"` values, nested braces, `%` comments
- Author lists in either `Last, First` or `First Last` order, with `and`
  separators, lowercase particles (`van der Berg`) and `{Corporate Authors}`
- LaTeX accents in both spellings (`M{\"u}ller` and `M\"{u}ller`), symbol commands,
  dashes and escaped specials
- `eprint` + `archivePrefix` → an arXiv URL when there is no explicit one

It **never throws**. A malformed record is reported and skipped so the other 299
still import. Duplicates are detected on DOI first, citation key second, so
re-importing an updated `.bib` adds only what is new.

Every field the review list shows — title, authors, venue, year, volume, number,
pages, DOI, URL — is editable afterwards in the same panel.

---

## 5. Visibility: one document, several audiences

The **Visibility** panel is the inclusion matrix. Two levels:

**Section level** — show or hide a whole section, rename its heading (call it
"Selected Publications" or "Relevant Experience" if you like), and reorder it on
the page with the arrows.

**Item level** — tick exactly which roles, degrees, projects, publications, skill
groups, talks, awards, grants, courses, supervised students, service roles,
editorial boards, events organised, datasets, media items, memberships,
certifications, patents, languages, volunteering entries and references appear.
All twenty-four sections are in the matrix.

Two presets are provided:

- **Show everything** — the full academic CV.
- **Lean résumé preset** — hides publications and keeps the top three roles and
  projects. A sensible starting point for a one-page industry résumé; adjust from
  there.

The counts beside each section in the sidebar (`3/5`) turn amber when something is
hidden, so you never send a document that is quietly missing half your work.

---

## 6. Exporting a PDF

Click **Download PDF** in the header (or press <kbd>⌘</kbd>/<kbd>Ctrl</kbd> +
<kbd>P</kbd>).

### Why this is a print dialog and not a one-click download

The requirement was a PDF with real, selectable, searchable text and working
links. The common `html2canvas` + `jsPDF` approach cannot do that: it screenshots
the page to a bitmap, so the text stops being text — unselectable, blurry when
zoomed, and completely invisible to the applicant-tracking systems that parse
résumés — and every link stops being a link.

The browser's own print pipeline is the only client-side path that produces vector
output with live link annotations. So this app drives that pipeline properly
instead of fighting it. The trade-off is that **you confirm the save in the print
sheet** — no web page can write a file to disk unattended.

### Settings to use, once

Expand **Show print settings** under the header for your specific browser. The
three that matter everywhere:

- **Destination → Save as PDF**
- **Margins → Default** — the app's `@page` rule supplies the real margins, on
  every page. Setting the dialog to "None" **overrides** it with zero and prints
  into the paper edge. (Safari is the exception: its dialog margins add to the
  CSS ones, so set those to 0 under *Show Details*.)
- **Paper size → whatever you chose under Page** — Letter or A4. A mismatch
  makes the browser rescale the page and nothing lands where the preview said.

Also tick **Background graphics** (Chrome/Edge) or **Print backgrounds**
(Firefox/Safari) so accent rules and technology badges survive.

The suggested filename comes from your name and today's date
(`jane-doe-cv-2026-08-14.pdf`); Chrome and Edge pick it up automatically.

### Page count

The badge in the preview toolbar (`≈ 2 pages · US Letter`) is an estimate: the
rendered height, divided across the content box your page size and margins leave
— the same arithmetic the print engine starts from. It can still come out one
short, because the themes ask the browser not to split an entry across a page
boundary and a card pushed whole onto the next page takes its height with it. So
treat it as "about".

The dashed rulers across the preview mark the same estimated break points. A
heading sitting just below one is a heading worth moving, either with the
**Page break** control or by winning back a line elsewhere.

---

## 7. Where your data lives, and how to move it

**In this folder, as a file: `data/resume.json`.**

You do not have to do anything to make that happen and there is no "save"
button. About half a second after you stop typing, the document is written to
that file. The previous version is kept beside it as `data/resume.backup.json`.
The header tells you which store is live — it reads `Saved · data/resume.json`
when the folder is being written, and hovering it explains the state.

Nothing is uploaded anywhere. The write goes to the local dev/preview server that
`start.sh` already runs, over a single route on localhost.

What this buys you, compared with a browser-only store:

- **Copy the project folder and your résumé comes with it.** Nothing to export.
- **Clearing your browser cache no longer matters.** The file is read back on the
  next launch.
- **It is readable and editable.** It is plain JSON in a text editor.
- **It can be version-controlled.** Commit it and every draft is recoverable.

### The browser copy, still there as a fallback

localStorage (key `resume-builder.v1`) is written on every save as well. It is
what you get when there is no server behind the page — opening `dist/index.html`
straight off disk, or hosting the built app somewhere static. The header says
"Saved in this browser" in that case, so you are never guessing.

**Which one wins:** the folder. On launch the app reads `data/resume.json` and,
if it is there, uses it and ignores the browser copy. The folder file is
rewritten on every save, so it can never be the staler of the two.

### Export and Import

| Button              | What it does                                                             |
| ------------------- | ------------------------------------------------------------------------ |
| **Export** (header) | Downloads the whole document as `your-name-resume-data-YYYY-MM-DD.json`   |
| **Import** (header) | Loads such a file back, after snapshotting what you had                   |
| **Raw JSON** panel  | The same document, editable in place, with Copy / Download / Apply        |

Still useful: for a snapshot before a big restructure, for sending your data to
another install, or for keeping a version you like while you experiment.

### Safety nets

- `data/resume.backup.json` is rotated in before every folder write.
- Folder writes are write-then-rename, so a crash mid-save leaves either the old
  document or the new one — never half of each.
- Before any import or reset, the previous document is copied to
  `resume-builder.v1.backup` in localStorage.
- If the browser payload is ever unreadable, it is **quarantined** under
  `resume-builder.v1.corrupt` rather than discarded, and you get a message saying
  so: `localStorage.getItem('resume-builder.v1.corrupt')` in the console gets the
  raw text back.
- A malformed hand-edited `data/resume.json` is reported in a banner rather than
  silently reverting you to an older copy.
- Storage full is reported explicitly rather than failing silently.

### Editing `data/resume.json` by hand

Allowed, and occasionally the fastest way to fix a typo across twenty entries.
Close the app first, or your next keystroke in the browser overwrites your edits.

### Before you push this to a public repository

`data/resume.json` holds whatever you typed, including your email address, phone
number and city. Either clear those fields first or add `data/resume.json` to
`.gitignore`. `data/README.md` says the same thing where you will actually see
it.

---

## 8. Project layout

```
Resume_design/
├── start.command               # macOS: double-click this. Wrapper around start.sh.
├── start.sh                    # The launcher: checks Node, installs, serves,
│                               # and explains every failure it hits
├── start.bat                   # Windows equivalent of start.sh
├── index.html                  # Shell. #root, #print-portal, and the
│                               # "you opened this the wrong way" fallback panel
├── package.json
├── vite.config.js              # base:'./' → portable dist/, @ alias → src/,
│                               # and the document-store plugin
├── tailwind.config.js          # Fonts, colours, page-size spacing tokens
├── postcss.config.js
├── .eslintrc.cjs
├── sty1.sty, sty2.sty          # The LaTeX style files the Swish and Marker
│                               # themes were ported from (kept for reference)
├── data/                       # YOUR DOCUMENT LIVES HERE
│   ├── README.md               # What these files are, in plain words
│   ├── resume.json             # Written ~600 ms after every edit
│   └── resume.backup.json      # The previous version, rotated automatically
├── vite-plugins/
│   └── documentStore.js        # GET/PUT /__resume/document on the dev and
│                               # preview servers. Constant target path, 8 MB
│                               # cap, write-then-rename. Not in dist/.
├── scripts/
│   ├── smoke.mjs               # `npm test` — server-renders all ten themes and
│   │                           # asserts what a build cannot (see below)
│   └── shots.mjs               # `npm run shots` — renders every theme to
│                               # .shots/ as HTML + PNG, for looking at
└── src/
    ├── main.jsx                # Mounts React
    ├── App.jsx                 # Composition root, panel list, toast
    │
    ├── context/
    │   └── ResumeContext.jsx   # The document: reducer, actions, persistence,
    │                           # undo/redo, derived "what is visible" view
    ├── data/
    │   ├── sectionSchemas.js        # THE registry. One object per schema-driven
    │   │                            # section (18 of them) → editor, matrix,
    │   │                            # sidebar, themes. Also the 23 profile-link
    │   │                            # slots, the icon tables and LINK_STYLES
    │   ├── fontStacks.js            # 14 pairings, 13 heading faces, 6 type
    │   │                            # sizes; fontAttrs()/fontVars() (local fonts)
    │   ├── pageSetup.js             # Letter/A4, margin presets, and the page
    │   │                            # arithmetic: @page CSS, break offsets,
    │   │                            # page count. Pure — no DOM
    │   ├── initialResumeData.json   # Default placeholder résumé
    │   └── sampleBibtex.bib         # Eight demo BibTeX entries
    │
    ├── utils/
    │   ├── bibtexParser.js     # Dependency-free BibTeX → publication objects
    │   ├── markdown.js         # Tiny Markdown subset → React elements
    │   ├── pdfExporter.js      # Native print pipeline, per-browser tips
    │   ├── folderStore.js      # Talks to the documentStore plugin; every
    │   │                       # failure path degrades to "use localStorage"
    │   └── storage.js          # localStorage, download, file read
    │
    ├── components/
    │   ├── icons/
    │   │   └── BrandIcons.jsx     # 22 single-path Simple Icons brand marks
    │   │                          # (CC0), inlined — nothing fetched at runtime
    │   ├── layout/
    │   │   ├── Header.jsx          # PDF / Export / Import / Reset / undo
    │   │   ├── Sidebar.jsx         # Panel navigation with visibility counts
    │   │   └── SplitView.jsx       # Responsive rail | editor | preview
    │   ├── editor/
    │   │   ├── EditorPrimitives.jsx   # TextField, TagInput, ItemCard, …
    │   │   ├── GeneralInfoEditor.jsx  # Identity, contact, 23 link slots, About
    │   │   ├── ExperienceEditor.jsx
    │   │   ├── EducationEditor.jsx
    │   │   ├── ProjectsEditor.jsx
    │   │   ├── SkillsEditor.jsx
    │   │   ├── GenericListEditor.jsx  # ONE editor driving all eighteen
    │   │   │                          # schema-driven sections
    │   │   ├── BibtexImporter.jsx     # Publications panel + .bib import
    │   │   ├── VisibilityManager.jsx  # The inclusion matrix
    │   │   └── RawJsonEditor.jsx
    │   ├── preview/
    │   │   ├── ResumePreview.jsx      # Scaled preview + print portal
    │   │   └── ThemeSelector.jsx      # Grouped dropdown, thumbnail grid, and
    │   │                              # the two control rows: typography
    │   │                              # (font / headings / size) and display
    │   │                              # (accent / density / links / icons)
    │   └── themes/
    │       ├── AcademicTheme.jsx      # Classic
    │       ├── SimplisticTheme.jsx
    │       ├── EditorialTheme.jsx
    │       ├── TechTheme.jsx          # Modern
    │       ├── SidebarTheme.jsx
    │       ├── BannerTheme.jsx
    │       ├── TimelineTheme.jsx      # Structured
    │       ├── CompactTheme.jsx
    │       ├── SwishTheme.jsx         # LaTeX — faithful cv-llt port
    │       ├── MarkerTheme.jsx        # LaTeX — accent-driven variant
    │       ├── sectionModel.js        # Flattens any section's items into the
    │       │                          # neutral shape every theme renders
    │       ├── SectionRenderer.jsx    # Walks visible.order through a theme's
    │       │                          # `ui` contract
    │       └── themeHelpers.js        # Shared data helpers, no markup
    │
    └── styles/
        └── index.css           # Tailwind directives, .resume-paper,
                                # page-break rules, the @media print engine
```

---

## 9. Editing and extending it

**Change the starting content.** Edit `src/data/initialResumeData.json`. That is
what "Reset" restores to, and what a first-time visitor sees. To change *your*
document, though, just type in the app — it is in `data/resume.json`, which takes
precedence over this file.

**Change how something looks on the page.** The ten theme files are
self-contained. Each exports a component taking `{ resume, visible }`, supplies a
`ui` object — `{ Section, Heading, SubHeading, Entry, Prose, Skills, Inline,
Publications }` — and hands it to `renderSections()`, which walks
`visible.order`. Themes deliberately share no layout code; they are supposed to
look different. What they *do* share is `sectionModel.js`, which flattens any
section's items into one neutral shape (`primary`, `secondary`, `meta`, `badge`,
`bullets`, `tags`, `links`, …), so a theme never has to know that "Grants" and
"Patents" are different things.

**Add an eleventh theme.**

1. Copy a theme file in `src/components/themes/`.
2. Register the component in `THEME_COMPONENTS` in
   `src/components/preview/ResumePreview.jsx`.
3. Add an entry to `THEMES` in `src/context/ResumeContext.jsx`, including a
   `family` — that is what groups it in the dropdown.
4. Optionally add a case to `Mini` in `ThemeSelector.jsx` for its thumbnail.

Three things a new theme must do to stay wired up:

1. Keep the root element's `resume-paper` class.
2. Spread `fontVars(settings)` into its inline style **and** `{...fontAttrs(settings)}`
   onto the same element. Two attributes come out of that call, `data-font-body`
   and `data-font-head`, because the heading override has to be able to apply on
   its own — a single shared attribute leaves the headings-only case unmatched.
3. Write every type size as `text-[calc(10.5pt*var(--rf-fs,1))]` rather than
   `text-[10.5pt]`, so the Size control reaches it. With the variable unset the
   fallback is `1`, so this costs nothing at default.

Put `avoid-break` on anything that should not be split across a page. A theme
whose `ui` omits a renderer simply skips that section rather than crashing. Call
`contactRows(profile, settings)` for the masthead and the Links setting works for
free.

**Add a whole new section.** Add one object to `SECTION_SCHEMAS` in
`src/data/sectionSchemas.js` — key, title, icon, group, nav labels, and a `fields`
array. That single object gives you the editor (via `GenericListEditor`), the
visibility-matrix row, the sidebar entry with its count badge, normalisation of
imported JSON, and rendering in all ten themes. Nothing else needs touching. Add
`groupBy` + `groupLabels` if entries should be sub-grouped on the page (that is
how Talks splits into Keynotes / Invited / Oral / Poster), and `layout: 'inline'`
if it should print as a comma-separated run rather than a block per item (that is
Conferences Attended).

**Add a field to an existing section.** For the eighteen schema-driven ones, add
it to that schema's `fields` array. For the original six, add it to `TEMPLATES`
and to the matching branch of `normalise()` (both in `ResumeContext.jsx`), then to
the editor and the themes. `normalise()` is the contract — a field missing from it
is a field that gets dropped on the next load.

**Add a brand icon.** Copy the 24×24 single path from
[simpleicons.org](https://simpleicons.org) into `src/components/icons/BrandIcons.jsx`
using the existing `brand()` helper, then reference it from the relevant
`PROFILE_LINKS` entry. The helper applies the 0.88 optical scale so it matches the
Lucide glyphs around it.

**Verify your changes.**

```bash
npm run check      # lint, then the smoke test, then a production build
```

`npm test` runs `scripts/smoke.mjs`, which bundles the app for Node with Vite's
own SSR build and server-renders it — **512 assertions across 10 themes × 24
sections**, covering things a successful build cannot tell you:

- every theme emits every visible section rather than throwing;
- adding a URL to a project adds exactly one anchor, and removing it removes the
  icon and label too;
- a `javascript:` URL never reaches an `href`;
- an on-but-empty section prints no bare heading;
- the font picker is completely inert on its default, the heading override applies
  without a body override, and a type-size change moves every size on the page;
- each Links setting prints the text it promises while the `href` stays the full
  address in all three — and Simplistic ignores the setting, as designed;
- the brand marks resolve to real logos, not fallback glyphs;
- an author name that was never split into first/last still appears in a citation;
- a publication whose `kind` is unrecognised is filed under "Preprints & Other"
  rather than dropped;
- the eleven newest sections ship switched off.

No test-framework dependency: one file, `node scripts/smoke.mjs`.

**Look at it, too.**

```bash
npm run shots      # builds, then renders every theme into .shots/
```

Fourteen standalone pages — all ten themes plus the type-size extremes and each
link style — server-rendered against the *real* built stylesheet, with a PNG of
each if Chrome is installed. Open `.shots/index.html` for the contact sheet.

This catches what assertions cannot: a heading colliding with a date column, a
brand mark sitting a pixel low against the text beside it, a citation that lost
its authors. Both of the last two defects found in this project were found this
way and only this way — the test suite was green for both. `.shots/` is
gitignored; regenerate it rather than committing it.

**Page-break control** lives in `src/styles/index.css`:

| Class            | Effect                                     |
| ---------------- | ------------------------------------------ |
| `.avoid-break`   | Do not split this element across pages      |
| `.resume-heading`| Never leave this heading alone at a page foot |
| `.force-break`   | Always start a new page here                |
| `.no-print`      | Screen only; never printed                  |

---

## 10. Deploying

The build is static — no server, no API, no database.

```bash
npm run build      # → dist/
npm run preview    # check it before you ship it
```

Then drop `dist/` on any static host: GitHub Pages, Netlify, Vercel, Cloudflare
Pages, or a folder on your own server. `base: './'` in `vite.config.js` means the
relative asset paths work from a subdirectory too, so
`https://you.github.io/resume-builder/` needs no extra configuration.

**GitHub Pages, the short version:**

```bash
git init && git add . && git commit -m "Résumé builder"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Then either enable Pages with a GitHub Actions workflow that runs
`npm ci && npm run build` and publishes `dist/`, or push the built `dist/` to a
`gh-pages` branch.

Two things to be deliberate about.

**The deployed app starts from the placeholder data, not yours.** A static host
has no document store — `data/` is not part of `dist/`, and the `documentStore`
plugin only runs under `vite dev` and `vite preview`. Visitors get the sample
document in their own localStorage. That is usually what you want. If you would
rather ship your real content as the default, put it in
`src/data/initialResumeData.json` before building, and be aware you have then
published your phone number and email address.

**`data/resume.json` is not in `dist/`, but it is in the repository** if you
`git add .` without thinking. Add it to `.gitignore` first unless you mean to
publish it:

```
data/resume.json
```

---

## 11. Troubleshooting

**I double-clicked `index.html` and got a blank page — or a page explaining
itself.** That is expected, and the explanation page is the fix working. This file
is the *source* entry point of a build. Its only script is
`<script type="module" src="/src/main.jsx">`: JSX is not JavaScript any browser
understands, and an `import` that names a package rather than a file path means
nothing over `file://`. A build step has to translate both first. Double-click
`start.command` (macOS) or `start.bat` (Windows) instead. There is no version of
opening `index.html` directly that works.

**I built it, and `dist/index.html` is also blank.** Browsers block module scripts
loaded over `file://`, so a built page still has to be *served*, not opened. Run
`./start.sh --built` — it builds and serves in one step.

**`start.command` says "permission denied", or does nothing.** The executable bit
was lost, which happens when a folder travels through a zip, a USB stick or Google
Drive. Restore it once from Terminal:

```bash
chmod +x /path/to/Resume_design/start.command /path/to/Resume_design/start.sh
```

**`start.command` opens in a text editor instead of running.** Right-click it →
*Open With* → *Terminal*. macOS also blocks unidentified scripts the first time:
right-click → *Open* → *Open* confirms it once, permanently.

**The launcher says Node is not installed, but I know it is.** Finder-launched
scripts do not read your `.zshrc`, so a Node installed via `nvm` is invisible to
them. `start.sh` looks in the usual places (`/usr/local/bin`, `/opt/homebrew/bin`,
`~/.nvm/versions/node/*`) and says so when it finds one that way. If yours lives
somewhere else, run `./start.sh` from a terminal where `node -v` already works.

**Page two starts hard against the top of the paper.** The print dialog's margin
setting is on "None", which throws away the page margins the app sets. Put it
back to "Default" — in Safari, set the dialog's own margins to 0 instead.

**The PDF is cut off at the right, or the type looks slightly small.** The paper
size in the print dialog does not match the one under **Page**. Set both to
Letter, or both to A4, and leave Scale at 100%.

**The PDF has huge white borders.** In Safari the dialog's margins stack on top
of the CSS ones — set them to 0 under *Show Details*. Elsewhere, check you have
not left Margins on "Custom".

**I want more or less white space around the text.** That is **Margins** in the
strip above the preview, not a browser setting: Narrow, Normal, Wide, or the
theme's own.

**Accent colours and badges are missing in the PDF.** Tick "Background graphics"
(Chrome/Edge) or "Print backgrounds" (Firefox/Safari).

**The Academic theme is not using Computer Modern.** That font is not installed by
default anywhere. Install *Latin Modern Roman* or *CMU Serif* system-wide and it
will be picked up; otherwise it falls back to Palatino, then Georgia, then the
system serif — all reasonable.

**My work disappeared.** First open `data/resume.json` in a text editor — that is
the real copy and it is almost always intact. Next to it, `data/resume.backup.json`
is the version before the last save. Failing both: if the app told you your data
was quarantined, run `localStorage.getItem('resume-builder.v1.corrupt')` in the
browser console to get the raw text back, and there may be a pre-import snapshot
under `resume-builder.v1.backup`.

**The header says "Saved in this browser" instead of "Saved · data/resume.json".**
There is no server behind the page, so there is nowhere to write. That is normal
if you opened `dist/index.html` off disk or are using a deployed copy. Run
`./start.sh` (or `npm run dev`) and the folder store comes back. If it says
"folder write failed", the folder is read-only — check permissions on
`Resume_design/data`, and note that a project sitting inside a mounted `.dmg`
cannot be written to at all.

**I edited `data/resume.json` by hand and my changes vanished.** The app was still
open and its next autosave overwrote them. Close the browser tab (and stop the
server) before hand-editing. `data/resume.backup.json` holds what was there
before the overwrite.

**A red banner says `data/resume.json` could not be read.** The JSON is malformed
— usually a trailing comma from a hand edit. Fix it, or copy
`data/resume.backup.json` over it, then reload. The app deliberately refuses to
start over silently in this case.

**A `.bib` file imported nothing.** The review panel lists the specific parse
errors. The most common causes are a truncated file (an unclosed brace swallows
everything after it) and a file that is not actually BibTeX — an EndNote or RIS
export, for instance.

**`npm install` fails.** Run `./start.sh --clean`, which deletes `node_modules`
and `package-lock.json` and reinstalls. If it still fails, the launcher prints the
last 15 lines of the npm log and the path to the full one — the usual causes are no
internet, a corporate proxy or VPN, or running from a read-only folder (a mounted
`.dmg`, or a zip you have not actually extracted).

**Port 5180 is busy.** `./start.sh` detects this and steps up to the next free
port on its own, telling you which one it picked. To force a specific one:
`./start.sh --port 5300`.

**Something else is wrong and I want the facts.** `./start.sh --check` prints
Node and npm versions, whether dependencies are installed, whether a build exists,
and which port is free — then exits without starting anything.
