import gsap from 'gsap';
import { Flip } from 'gsap/Flip';

const INTRO_SESSION_KEY = 'portfolio-workspace-intro';
const DESKTOP_QUERY = '(min-width: 64rem)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const DEFAULT_LAYOUT = 'default';
const SPATIAL_DURATION = 0.52;
const RESTORE_DURATION = 0.42;
const WORKSPACE_LAYOUTS = [
  DEFAULT_LAYOUT,
  'identity',
  'featured',
  'focus',
  'index',
] as const;

type WorkspaceLayout = (typeof WORKSPACE_LAYOUTS)[number];

gsap.registerPlugin(Flip);

function hasPlayedIntro(): boolean {
  try {
    return sessionStorage.getItem(INTRO_SESSION_KEY) === 'played';
  } catch {
    return false;
  }
}

function rememberIntro(): void {
  try {
    sessionStorage.setItem(INTRO_SESSION_KEY, 'played');
  } catch {
    // Storage can be unavailable in privacy-restricted browsing contexts.
  }
}

function getPanes(workspace: HTMLElement): HTMLElement[] {
  return Array.from(workspace.querySelectorAll<HTMLElement>('[data-pane]'));
}

function isWorkspaceLayout(
  value: string | undefined,
): value is WorkspaceLayout {
  return WORKSPACE_LAYOUTS.some((layout) => layout === value);
}

function getLayout(workspace: HTMLElement): WorkspaceLayout {
  const layout = workspace.dataset.layout;
  return isWorkspaceLayout(layout) ? layout : DEFAULT_LAYOUT;
}

function getPaneTitle(button: HTMLButtonElement): string {
  return (
    button
      .closest('[data-pane]')
      ?.querySelector('h2, h3')
      ?.textContent?.trim() || 'workspace'
  );
}

function renderWorkspaceState(
  workspace: HTMLElement,
  nextLayout: WorkspaceLayout,
): void {
  workspace.dataset.layout = nextLayout;

  getPanes(workspace).forEach((pane) => {
    pane.dataset.active = String(pane.dataset.pane === nextLayout);
  });

  workspace
    .querySelectorAll<HTMLButtonElement>('[data-pane-focus]')
    .forEach((button) => {
      const isActive = button.dataset.paneFocus === nextLayout;
      const action = isActive ? 'Restore' : 'Focus';
      const label = button.querySelector<HTMLElement>('[data-focus-label]');

      button.setAttribute('aria-pressed', String(isActive));
      button.setAttribute(
        'aria-label',
        `${action} ${getPaneTitle(button)} pane`,
      );
      if (label) label.textContent = action;
    });

  const message = workspace.querySelector<HTMLElement>(
    '[data-workspace-message]',
  );
  if (message) {
    message.textContent =
      nextLayout === DEFAULT_LAYOUT ? 'ready' : `${nextLayout} focused`;
  }
}

function playIntro(workspace: HTMLElement): gsap.core.Timeline | undefined {
  if (hasPlayedIntro()) return;

  const shell = workspace.closest<HTMLElement>('[data-workspace-shell]');
  if (!shell) return;

  const paneContents = workspace.querySelectorAll<HTMLElement>(
    '[data-pane-content]',
  );
  const status = workspace.querySelector<HTMLElement>(
    '[data-workspace-status]',
  );
  const timeline = gsap.timeline({ defaults: { ease: 'power2.out' } });

  timeline.fromTo(
    shell,
    { clipPath: 'inset(0 0 100% 0)', opacity: 0.75 },
    { clipPath: 'inset(0 0 0% 0)', duration: 0.42, opacity: 1 },
  );

  if (paneContents.length > 0) {
    // Keep transforms off the panes themselves: Flip exclusively owns those.
    timeline.fromTo(
      paneContents,
      { opacity: 0, y: 12 },
      { duration: 0.34, opacity: 1, stagger: 0.06, y: 0 },
      0.18,
    );
  }

  if (status) {
    timeline.fromTo(
      status,
      { opacity: 0 },
      { duration: 0.18, opacity: 1 },
      0.56,
    );
  }

  rememberIntro();
  return timeline;
}

function enhanceWorkspace(workspace: HTMLElement): () => void {
  const media = gsap.matchMedia();
  const context = gsap.context(() => {
    media.add(DESKTOP_QUERY, () => {
      const panes = getPanes(workspace);
      const buttons = Array.from(
        workspace.querySelectorAll<HTMLButtonElement>('[data-pane-focus]'),
      );
      const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
      const controller = new AbortController();
      let activeTransition: gsap.core.Timeline | undefined;
      let intro: gsap.core.Timeline | undefined;

      const finishTransition = () => {
        if (!activeTransition) return;
        activeTransition.progress(1).kill();
        activeTransition = undefined;
        delete workspace.dataset.animating;
      };

      const transitionTo = (
        nextLayout: WorkspaceLayout,
        duration = SPATIAL_DURATION,
      ) => {
        if (nextLayout === getLayout(workspace)) return;

        // Finish at the current semantic layout before measuring another move.
        // This makes rapid, repeated reshuffles deterministic.
        finishTransition();

        const state = reducedMotion.matches
          ? undefined
          : Flip.getState(panes, { simple: true });

        renderWorkspaceState(workspace, nextLayout);

        if (!state) return;

        workspace.dataset.animating = 'true';
        activeTransition = Flip.from(state, {
          duration,
          ease: 'power3.inOut',
          prune: true,
          simple: true,
          onComplete: () => {
            activeTransition = undefined;
            delete workspace.dataset.animating;
          },
          onInterrupt: () => {
            activeTransition = undefined;
            delete workspace.dataset.animating;
          },
        });
      };

      const togglePane = (button: HTMLButtonElement) => {
        const requestedLayout = button.dataset.paneFocus;
        if (!isWorkspaceLayout(requestedLayout)) return;

        transitionTo(
          getLayout(workspace) === requestedLayout
            ? DEFAULT_LAYOUT
            : requestedLayout,
        );
      };

      buttons.forEach((button) => {
        button.hidden = false;
        button.classList.remove('hidden');
        button.classList.add('flex');
        button.addEventListener('click', () => togglePane(button), {
          signal: controller.signal,
        });
      });

      workspace.addEventListener(
        'keydown',
        (event) => {
          if (
            event.key === 'Escape' &&
            getLayout(workspace) !== DEFAULT_LAYOUT
          ) {
            transitionTo(DEFAULT_LAYOUT, RESTORE_DURATION);
          }
        },
        { signal: controller.signal },
      );

      reducedMotion.addEventListener(
        'change',
        () => {
          if (reducedMotion.matches) finishTransition();
        },
        { signal: controller.signal },
      );

      renderWorkspaceState(workspace, getLayout(workspace));
      if (!reducedMotion.matches) intro = playIntro(workspace);

      return () => {
        controller.abort();
        finishTransition();
        intro?.progress(1).kill();
        buttons.forEach((button) => {
          button.hidden = true;
          button.classList.remove('flex');
          button.classList.add('hidden');
        });
        renderWorkspaceState(workspace, DEFAULT_LAYOUT);
      };
    });
  }, workspace);

  return () => {
    media.revert();
    context.revert();
  };
}

export function initializeTilingWorkspaces(
  root: ParentNode = document,
): () => void {
  const cleanups = Array.from(
    root.querySelectorAll<HTMLElement>('[data-tiling-workspace]'),
  ).map(enhanceWorkspace);

  return () => cleanups.forEach((cleanup) => cleanup());
}
