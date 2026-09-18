/**
 * @file SplitView.jsx
 *
 * The three-column workspace: nav rail, editor, live preview.
 *
 * Responsive behaviour
 * --------------------
 *   ≥1280px  rail + editor + preview, all visible, each scrolling on its own
 *   ≥1024px  same, with a narrower preview
 *   <1024px  one pane at a time, switched by the header toggle; the rail
 *            collapses into the horizontal chip strip Sidebar renders
 *
 * Each pane owns its own scroll container (`min-h-0` + `overflow-y-auto`), so
 * scrolling the editor never moves the preview and vice versa. `min-h-0` is
 * load-bearing: without it a flex child refuses to shrink below its content
 * and the page grows a second scrollbar instead.
 *
 * The nav rail folds away independently of the toolbars (`railOpen`), because
 * on a laptop it is the biggest single reclaimable area and you only need it
 * when you are changing section, not while you are typing.
 */

/**
 * @param {Object} props
 * @param {'edit'|'preview'} props.mobileView
 * @param {boolean} props.railOpen  Is the section nav showing?
 * @param {import('react').ReactNode} props.sidebar
 * @param {import('react').ReactNode} props.editor
 * @param {import('react').ReactNode} props.preview
 * @returns {JSX.Element}
 */
export default function SplitView({ mobileView, railOpen, sidebar, editor, preview }) {
  const showEditor = mobileView === 'edit';

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* Nav rail — horizontal chips below lg, fixed rail above.

          Collapsed with `w-0` + `invisible` rather than by not rendering it:
          `visibility: hidden` takes the buttons out of the tab order, which is
          the same promise the shared chrome CSS makes, and keeping the element
          mounted lets the width animate instead of snapping. `overflow-hidden`
          stops the 14rem of content spilling over the editor on the way. */}
      <div
        className={`flex-none overflow-hidden transition-[width] duration-200 ${
          showEditor ? '' : 'hidden lg:block'
        } ${railOpen ? 'lg:w-56 xl:w-60' : 'invisible h-0 w-0 lg:h-auto'}`}
        aria-hidden={railOpen ? undefined : 'true'}
      >
        {sidebar}
      </div>

      {/* Editor */}
      <section
        aria-label="Editor"
        className={`scroll-slim min-h-0 flex-1 overflow-y-auto bg-ui-bg lg:border-r lg:border-ui-line ${
          showEditor ? '' : 'hidden lg:block'
        }`}
      >
        {editor}
      </section>

      {/* Live preview */}
      <section
        aria-label="Live preview"
        className={`min-h-0 flex-1 lg:max-w-[46%] xl:max-w-[48%] ${showEditor ? 'hidden lg:flex' : 'flex'} flex-col bg-ui-bg`}
      >
        {preview}
      </section>
    </div>
  );
}
