## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

# Project Standards

## Don't reinvent the wheel

Before writing custom logic, check if a trusted, well-tested library already solves it — and check if the codebase already has a utility/component/pattern for it. Prefer proven dependencies and existing in-repo solutions over new, unaudited custom implementations. This applies to things like date handling, form validation, state management, animations, etc. — not just icons.

## Code quality

- Write clean, readable, maintainable code. Prefer clarity over cleverness.
- **One component per file.** Don't bundle multiple components in a single file for convenience — split them out, even small ones.
- Use descriptive file and component names that match what they render.
- Keep functions small and focused. Extract logic into hooks/utils when a component starts doing too much.

## Styling & icons

- Use Tailwind utility classes directly in JSX as the default styling method for layout, spacing, and one-off styles.
- **Design tokens (colors, fonts, radii, etc.) belong in `globals.css`** as CSS variables / Tailwind theme config — not as hardcoded hex codes or arbitrary values (`bg-[#3b82f6]`) sprinkled across components. Define the palette once, reference it via Tailwind classes (e.g. `bg-primary`, `text-muted`) everywhere else.
- If the project needs a custom color/design system, set it up in `globals.css` theme variables *before* building components, so agents reference tokens instead of inventing new colors ad hoc.
- Beyond design tokens, `globals.css` should stay minimal — just Tailwind directives, theme variables, and true global resets, not component-specific styles.
- **Use `react-icons`** for all icons. Don't hand-draw custom SVG icons.
- Don't make the page too static. Use `motion` to animate it whenever a page is too static/boring.

## User-facing copy

- All text the end user sees (buttons, empty states, errors, onboarding, tooltips) should speak **to the user**, not to a developer.
- Avoid dev/debug language in the UI: no "TODO," "test data," "Module \[N\]" or references to implementation details. This applies to documentation too.
- Write copy like a real product would: clear, friendly, purposeful. E.g. prefer "We couldn't find that page" over "Error: page not found (404)."

## General

- Don't leave commented-out code, unused imports, or console.logs in the final state.
- Favor small, composable components over large monolithic ones.
- Use pnpm not npm
