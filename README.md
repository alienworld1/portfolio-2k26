# Portfolio

## Commands

Use pnpm for all package and script operations.

| Command                    | Purpose                                             |
| -------------------------- | --------------------------------------------------- |
| `pnpm dev -- --background` | Start Astro’s managed background development server |
| `pnpm astro dev status`    | Check the background server                         |
| `pnpm astro dev logs`      | Read background server logs                         |
| `pnpm astro dev stop`      | Stop the background server                          |
| `pnpm check`               | Run Astro and TypeScript diagnostics                |
| `pnpm lint`                | Run ESLint                                          |
| `pnpm format:check`        | Check formatting                                    |
| `pnpm format`              | Format supported files                              |
| `pnpm build`               | Create the static production build                  |
| `pnpm preview`             | Preview the production build                        |

## Adding content

1. Copy `src/content/templates/work.md.example` into `src/content/work/<id>.md`, or copy `lab.md.example` into `src/content/labs/<id>.md`.
2. Replace every bracketed field with verified information.
3. Keep `draft: true` while writing. Draft entries never generate detail routes.
4. Set `draft: false` only when the entry and its evidence are ready to publish.
5. Run `pnpm check` and `pnpm build`; invalid published or draft frontmatter fails validation.

Shared profile and resume facts live in `src/data/site.ts`. This is the single source for identity, contact, experience, competition, and credential data until those sections receive their final content implementation.

## Production URL

Copy `.env.example` to `.env` and set `PUBLIC_SITE_URL` to the canonical deployment origin. Sitemap generation is enabled only when that value exists. Route-specific metadata, final social assets, and deployment configuration are deferred.

## Architecture rules

- Astro components render the interface; React’s server renderer is used only to turn `react-icons` into static HTML.
- Tailwind utilities are the default for component styling. Design tokens and true global behavior remain in `src/styles/global.css`.
- Every component has its own file and receives content through typed props.
- Client-side behavior must be progressive enhancement. Primary content and navigation must work without JavaScript.
- Future GSAP modules must use `data-*` hooks and remain page-scoped with explicit cleanup.
