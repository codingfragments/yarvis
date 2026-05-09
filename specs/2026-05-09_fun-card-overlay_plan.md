# Fun card overlay

## Problem

The Fun fact / joke card in the dashboard sidebar (`DashboardSidebar.svelte:101`)
sits in the narrow `md:w-96` sidebar and uses `line-clamp-4`, so longer
fun facts get truncated mid-sentence. Click-to-flip toggles between the
fact and the joke but doesn't reveal full text. The home-page version
(`routes/+page.svelte:290`) is already unclamped, so this is sidebar-only.

## Approach

Reuse the existing `Overlay` primitive (already used by `MarkdownViewer`,
`QuestionEditor`, `CommandPalette`) — small modal that shows the **full
fact and full joke side-by-side** with no clamping.

Keep the small teaser card as-is (gradient + clamp) but change the click
target:

- Click anywhere on the card body → opens the Fun overlay
- Tiny `↻` flip button in the top-right corner → toggles which one is
  shown in the teaser (preserves existing flip behaviour); only rendered
  when *both* fact and joke exist
- The flip button is a sibling of the open-overlay button inside a
  `relative` wrapper, with `event.stopPropagation()` — avoids nesting
  `<button>` elements (invalid HTML)

## File-by-file

- `src/lib/components/dashboard/DashboardSidebar.svelte` — restructure
  the Fun card into a `relative` wrapper containing two sibling buttons
  (open-overlay / flip), add `funOverlayOpen` state, render `<Overlay>`
  showing both fact and joke

## Out of scope

- Home-page Fun card — already unclamped. If the user wants a unified
  experience later, lift the overlay into a shared `FunCard` component.
- Markdown rendering of fact/joke text — they're plain strings per
  schema; the overlay uses `whitespace-pre-wrap` for paragraph breaks
  and that's enough.
