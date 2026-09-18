/**
 * @file storage.js
 *
 * LocalStorage manager for the résumé builder.
 *
 * Every read is defensive: a corrupt or hand-edited payload must never take
 * the app down. When parsing fails we park the raw text under a `.corrupt`
 * key so the user can recover it from the console, then fall back to defaults.
 */

/** @type {string} Primary state key. */
export const STORAGE_KEY = 'resume-builder.v1';
/** @type {string} Snapshot taken immediately before a destructive import/reset. */
export const BACKUP_KEY = `${STORAGE_KEY}.backup`;
/** @type {string} Where unparseable payloads are parked. */
export const CORRUPT_KEY = `${STORAGE_KEY}.corrupt`;
/**
 * @type {string} Workspace layout preferences — which chrome is folded away.
 *
 * Deliberately a separate key from STORAGE_KEY. Everything under STORAGE_KEY is
 * the *document*: it is exported to JSON, imported on another machine, and
 * restored from backup. "I collapsed the nav rail on this laptop" is none of
 * those things, and putting it in resume.settings would ship it inside every
 * exported résumé and overwrite it on every import.
 */
export const UI_KEY = `${STORAGE_KEY}.ui`;

/**
 * Is localStorage usable? Private-mode Safari and some embedded webviews
 * expose the object but throw on write.
 *
 * @returns {boolean}
 */
export function isAvailable() {
  try {
    const probe = '__probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read and parse the saved state.
 *
 * @returns {{data: unknown|null, recovered: boolean}} `data` is null when
 *   nothing is stored or the payload was unusable; `recovered` is true when a
 *   corrupt payload was found and quarantined.
 */
export function load() {
  if (!isAvailable()) return { data: null, recovered: false };

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { data: null, recovered: false };

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
    return { data: parsed, recovered: false };
  } catch (err) {
    // Quarantine rather than discard — this may be the only copy.
    try {
      window.localStorage.setItem(CORRUPT_KEY, raw);
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage full; nothing more we can do */
    }
    console.warn(
      `[storage] Saved résumé could not be parsed (${err.message}). ` +
        `The raw text is preserved under "${CORRUPT_KEY}".`
    );
    return { data: null, recovered: true };
  }
}

/**
 * Persist the state.
 *
 * @param {unknown} data Anything JSON-serialisable.
 * @returns {{ok: boolean, error?: string}}
 */
export function save(data) {
  if (!isAvailable()) return { ok: false, error: 'This browser is blocking local storage.' };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (err) {
    const quotaHit = err && (err.name === 'QuotaExceededError' || err.code === 22);
    return {
      ok: false,
      error: quotaHit
        ? 'Local storage is full. Export a JSON backup, then clear old data.'
        : `Could not save: ${err.message}`,
    };
  }
}

/**
 * Snapshot the current state before something destructive.
 *
 * @returns {boolean} True when a backup was written.
 */
export function backup() {
  if (!isAvailable()) return false;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    window.localStorage.setItem(BACKUP_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the pre-import backup, if one exists.
 *
 * @returns {unknown|null}
 */
export function readBackup() {
  if (!isAvailable()) return null;
  const raw = window.localStorage.getItem(BACKUP_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Remove the saved state. The backup and corrupt keys are left alone on
 * purpose — this is "start over", not "destroy every trace".
 *
 * @returns {void}
 */
export function clear() {
  if (!isAvailable()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Read one workspace layout preference.
 *
 * Same defensive stance as load(), minus the quarantine: a UI preference is not
 * worth recovering, so anything unreadable just yields the default.
 *
 * @param {string} name      Property inside the UI_KEY object.
 * @param {*} fallback       Returned when unset, unreadable or the wrong shape.
 * @returns {*}
 */
export function loadUi(name, fallback) {
  if (!isAvailable()) return fallback;
  try {
    const raw = window.localStorage.getItem(UI_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !(name in parsed)) return fallback;
    return parsed[name];
  } catch {
    return fallback;
  }
}

/**
 * Write one workspace layout preference, leaving the others alone.
 *
 * @param {string} name
 * @param {*} value
 * @returns {void}
 */
export function saveUi(name, value) {
  if (!isAvailable()) return;
  try {
    const raw = window.localStorage.getItem(UI_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const next = parsed && typeof parsed === 'object' ? parsed : {};
    next[name] = value;
    window.localStorage.setItem(UI_KEY, JSON.stringify(next));
  } catch {
    /* A full or unavailable quota must not cost the user a keystroke. */
  }
}

/**
 * Approximate size of the saved payload, for the UI's storage readout.
 *
 * @returns {{bytes: number, label: string}}
 */
export function usage() {
  if (!isAvailable()) return { bytes: 0, label: '—' };
  const raw = window.localStorage.getItem(STORAGE_KEY) || '';
  const bytes = new Blob([raw]).size;
  const label = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  return { bytes, label };
}

/**
 * Trigger a client-side file download.
 *
 * @param {string} text     File contents.
 * @param {string} filename Suggested name.
 * @param {string} [mime='application/json'] MIME type.
 * @returns {void}
 */
export function downloadFile(text, filename, mime = 'application/json') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on the next tick; revoking synchronously cancels the download in
  // some Firefox versions.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Read a `File` as UTF-8 text.
 *
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * A dated filename stem built from the résumé owner's name.
 *
 * @param {string} name  e.g. "Jane Doe"
 * @param {string} suffix e.g. "cv" | "resume"
 * @returns {string} e.g. "jane-doe-cv-2026-08-14"
 */
export function suggestFilename(name, suffix = 'resume') {
  const slug =
    String(name || 'resume')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'resume';
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
  return `${slug}-${suffix}-${stamp}`;
}
