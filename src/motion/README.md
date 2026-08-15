# Motion modules

Motion is a progressive enhancement over complete server-rendered HTML. Components expose scoped `data-*` hooks; motion modules own animation state and return explicit cleanup functions.

## Tiling workspace

`tiling-workspace.ts` enhances the overview workspace on desktop:

- GSAP Flip animates between semantic CSS Grid layout states.
- Each new retiling finishes the active transition before measuring the next state, so rapid input cannot strand inline geometry.
- Intro motion targets pane contents while Flip exclusively owns pane transforms.
- `gsap.matchMedia()` scopes the interaction to desktop, while live motion-preference checks remove reduced-motion retiling.
- Pane focus buttons stay hidden until the enhancement is available.
- The one-time entry sequence is session-scoped and never blocks navigation.
- Escape restores the default layout while preserving DOM and keyboard focus order.
- Pane internals use container queries and desktop overflow containment, so supporting panes remain usable at every tiled width.

Mobile and no-JavaScript views keep the same semantic pane order and render as a conventional vertical workspace.
