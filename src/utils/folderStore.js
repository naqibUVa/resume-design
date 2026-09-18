/**
 * @file folderStore.js
 *
 * Client half of the folder-backed document store.
 *
 * The app talks to the small endpoint that `vite-plugins/documentStore.js`
 * adds to the dev and preview servers. When that endpoint answers, the
 * résumé lives in `data/resume.json` inside the project folder and is
 * genuinely a file: it survives a cleared cache, moves with the folder to
 * another machine, and can be read in a text editor.
 *
 * When it does not answer — the `dist/` build opened straight off disk, or
 * hosted somewhere static — every function here reports "unavailable" and the
 * caller falls back to localStorage. Nothing throws, and nothing here is ever
 * the reason an edit is lost: the browser copy is always written as well.
 *
 * `base: './'` in vite.config.js makes asset URLs relative, so the route is
 * spelled out absolutely here; it is served from the server root, not from
 * wherever the page happens to sit.
 */

/** The route the plugin listens on. Must match DOCUMENT_ROUTE in the plugin. */
const ROUTE = '/__resume/document';

/** Where the document lands, for display in the UI. */
export const FOLDER_PATH = 'data/resume.json';

/**
 * @typedef {Object} FolderResult
 * @property {boolean} available Did the endpoint answer at all?
 * @property {boolean} ok        Did the operation succeed?
 * @property {any} [data]        The document, on a successful load.
 * @property {string} [error]    Why it failed, when it did.
 */

/** Signals "there is no server behind this page". */
const UNAVAILABLE = { available: false, ok: false };

/**
 * Is a static file server (or no server) answering rather than our plugin?
 *
 * A static host handed a URL it does not recognise usually replies 200 with
 * `index.html`, which would parse as neither JSON nor a résumé. Checking the
 * content type catches that before it becomes a confusing parse error.
 *
 * @param {Response} res
 * @returns {boolean}
 */
function isJson(res) {
  return (res.headers.get('content-type') || '').includes('application/json');
}

/**
 * Read the document from the project folder.
 *
 * @returns {Promise<FolderResult>} `available:false` when there is no server;
 *   `ok:true` with `data:null` when the server is there but nothing is saved.
 */
export async function loadFromFolder() {
  let res;
  try {
    res = await fetch(ROUTE, { method: 'GET', headers: { Accept: 'application/json' } });
  } catch {
    // Network error, or a file:// page where fetch cannot reach anything.
    return UNAVAILABLE;
  }

  // 204: the plugin is running, the file has simply not been written yet.
  if (res.status === 204) return { available: true, ok: true, data: null };
  if (!isJson(res)) return UNAVAILABLE;

  let body;
  try {
    body = await res.json();
  } catch {
    return UNAVAILABLE;
  }

  if (!res.ok || !body?.ok) {
    return { available: true, ok: false, error: body?.error || `Server returned ${res.status}.` };
  }
  return { available: true, ok: true, data: body.data ?? null };
}

/**
 * Write the document to the project folder.
 *
 * @param {unknown} doc Anything JSON-serialisable; the plugin requires an object.
 * @returns {Promise<FolderResult>}
 */
export async function saveToFolder(doc) {
  let res;
  try {
    res = await fetch(ROUTE, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
  } catch {
    return UNAVAILABLE;
  }

  if (!isJson(res)) return UNAVAILABLE;

  let body;
  try {
    body = await res.json();
  } catch {
    return UNAVAILABLE;
  }

  if (!res.ok || !body?.ok) {
    return { available: true, ok: false, error: body?.error || `Server returned ${res.status}.` };
  }
  return { available: true, ok: true };
}
