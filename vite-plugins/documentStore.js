/**
 * @file documentStore.js
 *
 * A Vite plugin that gives the browser a single file to read and write inside
 * the project folder: `data/resume.json`.
 *
 * Why this exists. The builder's own store is localStorage, which is tied to
 * one browser profile on one machine — clear the site data, switch browsers,
 * or copy the project to a laptop and the document is gone. Keeping the
 * document in the folder makes it a file like any other: it survives a cleared
 * cache, it can be committed, copied to a USB stick, or opened in a text
 * editor. localStorage stays as the fallback for when the app is opened
 * without a server behind it.
 *
 * Two endpoints, one path, no parameters:
 *
 *   GET  /__resume/document → 200 with the saved document, or 204 if none.
 *   PUT  /__resume/document → replaces it. Body is the JSON document.
 *
 * Deliberate constraints, because this is a process that writes to disk on
 * behalf of a web page:
 *
 * - The target path is a constant. Nothing in the request can influence where
 *   the write lands, so there is no path to traverse out of.
 * - Only JSON objects are accepted, and only up to `MAX_BYTES`.
 * - Writes go to a temporary file and are renamed into place, so a crash
 *   mid-write cannot leave a half-written document where the good one was.
 * - The previous contents are kept as `data/resume.backup.json`, which has
 *   already earned its keep more than once.
 *
 * This plugin runs only under `vite dev` and `vite preview`, both of which
 * bind to localhost by default. It is not part of the production bundle and
 * `dist/` has no trace of it.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** The one and only route. Namespaced so it cannot collide with a real asset. */
export const DOCUMENT_ROUTE = '/__resume/document';

/** Path of the saved document, relative to the project root. */
export const DOCUMENT_PATH = 'data/resume.json';

/** Path of the copy taken before each overwrite. */
export const BACKUP_PATH = 'data/resume.backup.json';

/** 8 MB. A résumé that large is a bug, not a résumé. */
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Send a JSON response.
 *
 * @param {import('http').ServerResponse} res
 * @param {number} status
 * @param {unknown} body
 */
function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // The document is the user's own data on their own machine, but there is no
  // reason for any cache between here and the tab to hold a copy of it.
  res.setHeader('Cache-Control', 'no-store');
  res.end(text);
}

/**
 * Collect a request body, refusing anything oversized.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<string>}
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    /** @type {Buffer[]} */
    const chunks = [];

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BYTES) {
        reject(new Error(`Document is larger than ${MAX_BYTES / 1024 / 1024} MB.`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * The middleware, shared by the dev server and the preview server.
 *
 * @param {string} root Absolute path of the project root.
 * @returns {Function} A connect-style middleware.
 */
function middleware(root) {
  const file = join(root, DOCUMENT_PATH);
  const backup = join(root, BACKUP_PATH);

  return async function documentStoreMiddleware(req, res, next) {
    // `req.url` carries a query string in some setups; compare the path only.
    const path = (req.url || '').split('?')[0];
    if (path !== DOCUMENT_ROUTE) return next();

    if (req.method === 'GET') {
      if (!existsSync(file)) {
        // 204 means "the store is here, it is simply empty" — distinct from the
        // fetch failing outright, which is how the client tells that there is
        // no server behind the page. A 204 carries no body by definition.
        res.statusCode = 204;
        res.setHeader('Cache-Control', 'no-store');
        return res.end();
      }
      try {
        const raw = readFileSync(file, 'utf8');
        const data = JSON.parse(raw);
        return sendJson(res, 200, { ok: true, data, path: DOCUMENT_PATH, bytes: raw.length });
      } catch (err) {
        // A hand-edited file with a stray comma should report itself clearly
        // rather than silently reverting the user to an older browser copy.
        return sendJson(res, 500, {
          ok: false,
          error: `${DOCUMENT_PATH} could not be read: ${err.message}`,
        });
      }
    }

    if (req.method === 'PUT') {
      let parsed;
      try {
        const body = await readBody(req);
        parsed = JSON.parse(body);
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return sendJson(res, 400, { ok: false, error: 'Body must be a JSON object.' });
      }

      try {
        mkdirSync(dirname(file), { recursive: true });
        if (existsSync(file)) {
          try {
            renameSync(file, backup);
          } catch {
            /* a missing backup is not worth failing the save over */
          }
        }
        const text = `${JSON.stringify(parsed, null, 2)}\n`;
        // Write-then-rename: the rename is atomic on every platform we target,
        // so the file is either the old document or the new one, never a
        // truncated mixture of the two.
        const tmp = `${file}.tmp`;
        writeFileSync(tmp, text, 'utf8');
        renameSync(tmp, file);
        return sendJson(res, 200, {
          ok: true,
          path: DOCUMENT_PATH,
          bytes: text.length,
          savedAt: new Date().toISOString(),
        });
      } catch (err) {
        return sendJson(res, 500, { ok: false, error: `Could not write ${DOCUMENT_PATH}: ${err.message}` });
      }
    }

    res.statusCode = 405;
    res.setHeader('Allow', 'GET, PUT');
    return res.end();
  };
}

/**
 * @returns {import('vite').Plugin}
 */
export default function documentStore() {
  /** @type {string} */
  let root = process.cwd();

  return {
    name: 'resume-document-store',
    // Not `apply: 'serve'` — preview needs it too, and that flag would exclude
    // it. `configureServer` and `configurePreviewServer` only fire on their own
    // command anyway, so the build never sees this.
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use(middleware(root));
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware(root));
    },
  };
}
