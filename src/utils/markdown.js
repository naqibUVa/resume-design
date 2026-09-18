/**
 * @file markdown.js
 *
 * A deliberately small Markdown subset renderer for project descriptions and
 * the "About Me" blurb.
 *
 * Why not a library: résumé prose needs bold, italic, inline code, links and
 * bullet lists — that is the whole vocabulary. Shipping a full CommonMark
 * parser to render six lines of text is not a good trade, and it would drag
 * in `dangerouslySetInnerHTML` or a sanitiser with it.
 *
 * This module emits **React elements**, never raw HTML strings, so user text
 * can never become markup. That property is the reason it is written this way.
 *
 * Supported:
 *   **bold**   *italic*   `code`   [label](https://url)   bare https:// links
 *   - bullet lists (also `*` and `•`)
 *   blank-line-separated paragraphs
 *
 * Not supported, on purpose: headings, tables, images, nested lists, HTML.
 */

import { createElement as h, Fragment } from 'react';

/** Schemes we are willing to turn into a live anchor. */
const SAFE_SCHEME = /^(https?:|mailto:)/i;

/**
 * Make a URL safe to put in an `href`.
 *
 * @param {string} raw
 * @returns {string} A safe absolute URL, or '' if the input should not be linked.
 */
export function safeHref(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (SAFE_SCHEME.test(s)) return s;
  // Reject javascript:, data:, vbscript:, and anything else with a scheme.
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return '';
  if (/^www\./i.test(s) || /^[\w-]+(\.[\w-]+)+\//.test(s)) return `https://${s}`;
  return '';
}

/** Matches, in priority order: code, bold, italic, md-link, bare URL. */
const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(\[[^\]]+\]\([^)\s]+\))|((?:https?:\/\/|www\.)[^\s<>()]+)/g;

/**
 * Render inline markup within one line of text.
 *
 * @param {string} text
 * @param {string} keyPrefix Stable key namespace for the emitted nodes.
 * @returns {Array<import('react').ReactNode>}
 */
export function renderInline(text, keyPrefix = 'i') {
  const out = [];
  let last = 0;
  let n = 0;
  const src = String(text ?? '');

  src.replace(INLINE, (match, code, bold, italic, mdLink, bareUrl, offset) => {
    if (offset > last) out.push(src.slice(last, offset));
    const key = `${keyPrefix}-${(n += 1)}`;

    if (code) {
      out.push(h('code', { key }, code.slice(1, -1)));
    } else if (bold) {
      out.push(h('strong', { key }, bold.slice(2, -2)));
    } else if (italic) {
      out.push(h('em', { key }, italic.slice(1, -1)));
    } else if (mdLink) {
      const m = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(mdLink);
      const href = safeHref(m ? m[2] : '');
      out.push(
        href
          ? h('a', { key, href, target: '_blank', rel: 'noopener noreferrer' }, m[1])
          : m
            ? m[1]
            : mdLink
      );
    } else if (bareUrl) {
      const href = safeHref(bareUrl);
      const label = bareUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '');
      out.push(
        href ? h('a', { key, href, target: '_blank', rel: 'noopener noreferrer' }, label) : bareUrl
      );
    }

    last = offset + match.length;
    return match;
  });

  if (last < src.length) out.push(src.slice(last));
  return out;
}

/**
 * Render a multi-line Markdown-ish string into paragraphs and bullet lists.
 *
 * @param {string} text
 * @param {Object} [opts]
 * @param {string} [opts.className] Class applied to each paragraph / list.
 * @returns {import('react').ReactNode}
 */
export function renderMarkdown(text, opts = {}) {
  // undefined rather than '' so we do not emit a stray class="" on every node.
  const className = opts.className || undefined;
  const src = String(text ?? '').trim();
  if (!src) return null;

  /** @type {Array<{type: 'p'|'ul', lines: string[]}>} */
  const blocks = [];
  let current = null;

  src.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      current = null;
      return;
    }

    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      if (!current || current.type !== 'ul') {
        current = { type: 'ul', lines: [] };
        blocks.push(current);
      }
      current.lines.push(bullet[1]);
      return;
    }

    if (!current || current.type !== 'p') {
      current = { type: 'p', lines: [] };
      blocks.push(current);
    }
    current.lines.push(line.trim());
  });

  return h(
    Fragment,
    null,
    blocks.map((block, bi) =>
      block.type === 'ul'
        ? h(
            'ul',
            { key: `b${bi}`, className },
            block.lines.map((li, li2) => h('li', { key: `l${li2}` }, renderInline(li, `b${bi}l${li2}`)))
          )
        : h('p', { key: `b${bi}`, className }, renderInline(block.lines.join(' '), `b${bi}`))
    )
  );
}

/**
 * Strip all markup, for places that need plain text (page titles, ATS-safe
 * output, character counts).
 *
 * @param {string} text
 * @returns {string}
 */
export function stripMarkdown(text) {
  return String(text ?? '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}
