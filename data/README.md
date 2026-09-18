# `data/` — your résumé, as a file

This folder is where the builder keeps your work. You do not have to do
anything with it; it fills itself in as you type.

| File                 | What it is                                                        |
| -------------------- | ----------------------------------------------------------------- |
| `resume.json`        | The live document. Rewritten about half a second after every edit. |
| `resume.backup.json` | The previous version, kept automatically before each overwrite.    |

Both appear the first time you run the app through `start.sh` (or
`npm run dev` / `npm run preview`). Until then the folder holds only this note.

## Why it matters

Without this folder the résumé lives in your browser's local storage, which is
tied to one browser profile on one machine. Clearing site data, switching from
Chrome to Safari, or copying the project to a laptop would each lose it.

With it, your résumé is an ordinary file:

- **Copy the project folder and the résumé comes with it.** Nothing to export.
- **Clearing your browser cache no longer matters.** The folder copy is read
  back on the next launch.
- **It is readable.** Open `resume.json` in any text editor.
- **It can be version-controlled.** Commit it and every draft is recoverable.

The browser copy is still written on every save, as a fallback. If you open
`dist/index.html` directly from disk — with no server behind it — there is
nothing to write to the folder, and the header says
"Saved in this browser" rather than "Saved · data/resume.json".

## Which copy wins

The folder. On launch the app reads `resume.json` and, if it is there, uses it
and ignores what the browser had. The folder file is rewritten on every save,
so it is never the older of the two.

## Editing it by hand

Allowed, and occasionally the fastest way to fix a typo across twenty entries.
Two things to know:

- Close the app first, or your next keystroke in the browser will overwrite
  your edits.
- If you leave the JSON malformed, the app will say so in a red banner rather
  than silently starting over. `resume.backup.json` is your way back.

## Starting fresh

Delete `resume.json`. The next launch starts from the sample document. The
backup is left alone on purpose — that is "start over", not "destroy every
trace".

## Sharing it

`resume.json` contains whatever you typed, including your email address, phone
number and home city. If you are pushing this project to a public GitHub
repository, either clear those fields first or add this line to `.gitignore`:

```
data/resume.json
```
