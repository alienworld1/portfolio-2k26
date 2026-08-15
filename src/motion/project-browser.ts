import gsap from 'gsap';
import { Flip } from 'gsap/Flip';

import type { GitHubProject } from '../data/github-projects';
import {
  filterAndPaginateProjects,
  parseProjectFilters,
  serializeProjectFilters,
  type ProjectFilterState,
  type ProjectSiteFilter,
  type ProjectSort,
} from '../utils/project-browser';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const DESKTOP_QUERY = '(min-width: 64rem)';
const SEARCH_DELAY = 180;

gsap.registerPlugin(Flip);

function projectFromRow(row: HTMLElement): GitHubProject {
  return {
    name: row.dataset.name ?? '',
    description: row.dataset.description || null,
    primaryLanguage: row.dataset.language || null,
    repositoryUrl: 'https://github.com/',
    websiteUrl:
      row.dataset.hasWebsite === 'true' ? 'https://example.com/' : null,
    updatedAt: row.dataset.updatedAt ?? new Date(0).toISOString(),
    isFork: false,
    isArchived: false,
    pinnedPosition: null,
  };
}

function getFilterState(form: HTMLFormElement): ProjectFilterState {
  const data = new FormData(form);
  const site = String(data.get('site') ?? 'all') as ProjectSiteFilter;
  const sort = String(data.get('sort') ?? 'updated') as ProjectSort;

  return {
    q: String(data.get('q') ?? '').trim(),
    language: String(data.get('language') ?? 'all'),
    site,
    sort,
    page: 1,
  };
}

function getRelativeUrl(state: ProjectFilterState): string {
  const search = serializeProjectFilters(state).toString();
  return `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
}

function isEditingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function enhanceProjectBrowser(workspace: HTMLElement): () => void {
  const form = workspace.querySelector<HTMLFormElement>(
    '[data-project-filter-form]',
  );
  const controls = workspace.querySelector<HTMLElement>(
    '[data-project-controls]',
  );
  const search = workspace.querySelector<HTMLInputElement>(
    '[data-project-search]',
  );
  const language = workspace.querySelector<HTMLSelectElement>(
    '[data-project-language]',
  );
  const site = workspace.querySelector<HTMLSelectElement>(
    '[data-project-site]',
  );
  const sort = workspace.querySelector<HTMLSelectElement>(
    '[data-project-sort]',
  );
  const reset = workspace.querySelector<HTMLAnchorElement>(
    '[data-project-reset]',
  );
  const details = workspace.querySelector<HTMLDetailsElement>(
    '[data-project-filter-details]',
  );
  const list = workspace.querySelector<HTMLOListElement>('[data-project-list]');
  const rows = Array.from(
    workspace.querySelectorAll<HTMLElement>('[data-project-item]'),
  );
  const pagination = workspace.querySelector<HTMLElement>(
    '[data-project-pagination]',
  );
  const previous = workspace.querySelector<HTMLButtonElement>(
    '[data-project-previous]',
  );
  const next = workspace.querySelector<HTMLButtonElement>(
    '[data-project-next]',
  );
  const pages = workspace.querySelector<HTMLElement>('[data-project-pages]');
  const range = workspace.querySelector<HTMLElement>('[data-project-range]');
  const announcement = workspace.querySelector<HTMLElement>(
    '[data-project-announcement]',
  );
  const empty = workspace.querySelector<HTMLElement>('[data-project-empty]');
  const bufferTitle = workspace.querySelector<HTMLElement>(
    '#repository-results-title',
  );

  if (
    !form ||
    !controls ||
    !search ||
    !language ||
    !site ||
    !sort ||
    !reset ||
    !details ||
    !list ||
    !pagination ||
    !previous ||
    !next ||
    !pages ||
    !range ||
    !announcement ||
    !empty
  ) {
    return () => undefined;
  }

  const controller = new AbortController();
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
  const projectByName = new Map(
    rows.map((row) => [row.dataset.name ?? '', projectFromRow(row)]),
  );
  const rowByName = new Map(rows.map((row) => [row.dataset.name ?? '', row]));
  let currentState = parseProjectFilters(
    new URL(window.location.href).searchParams,
  );
  let activeFlip: gsap.core.Timeline | undefined;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  const setFormState = (state: ProjectFilterState) => {
    search.value = state.q;
    language.value = Array.from(language.options).some(
      (option) => option.value === state.language,
    )
      ? state.language
      : 'all';
    site.value = state.site;
    sort.value = state.sort;
  };

  const renderPages = (page: number, totalPages: number) => {
    pages.replaceChildren();

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const button = document.createElement('button');
      const isCurrent = pageNumber === page;
      button.type = 'button';
      button.textContent = String(pageNumber);
      button.dataset.projectPage = String(pageNumber);
      button.className =
        'font-interface min-h-11 min-w-11 px-2 text-xs font-semibold hover:bg-primary-container';
      if (isCurrent) {
        button.classList.add('bg-primary', 'text-on-primary');
        button.setAttribute('aria-current', 'page');
      }
      button.setAttribute('aria-label', `Page ${pageNumber}`);
      pages.append(button);
    }

    previous.disabled = page <= 1;
    next.disabled = page >= totalPages;
    pagination.hidden = totalPages <= 1;
  };

  const updateHistory = (
    state: ProjectFilterState,
    mode: 'push' | 'replace' | 'none',
  ) => {
    if (mode === 'none') return;
    const url = getRelativeUrl(state);
    if (mode === 'push') window.history.pushState({}, '', url);
    else window.history.replaceState({}, '', url);
  };

  const applyState = (
    requestedState: ProjectFilterState,
    options: {
      animate?: boolean;
      focusBuffer?: boolean;
      history?: 'push' | 'replace' | 'none';
      announce?: boolean;
    } = {},
  ) => {
    activeFlip?.progress(1).kill();
    activeFlip = undefined;

    const normalizedLanguage = Array.from(language.options).some(
      (option) => option.value === requestedState.language,
    )
      ? requestedState.language
      : 'all';
    const nextState = { ...requestedState, language: normalizedLanguage };
    const page = filterAndPaginateProjects(
      Array.from(projectByName.values()),
      nextState,
    );
    currentState = { ...nextState, page: page.page };

    const visibleBefore = rows.filter((row) => !row.hidden);
    const flipState =
      options.animate !== false &&
      !reducedMotion.matches &&
      visibleBefore.length > 0 &&
      page.projects.length > 0
        ? Flip.getState(visibleBefore, { simple: true })
        : undefined;
    const visibleNames = new Set(page.projects.map(({ name }) => name));

    page.projects.forEach(({ name }) => {
      const row = rowByName.get(name);
      if (row) list.append(row);
    });
    rows.forEach((row) => {
      row.hidden = !visibleNames.has(row.dataset.name ?? '');
    });

    if (flipState) {
      activeFlip = Flip.from(flipState, {
        duration: 0.42,
        ease: 'power3.inOut',
        absolute: true,
        prune: true,
        simple: true,
        onEnter: (elements) =>
          gsap.fromTo(
            elements,
            { opacity: 0, y: 8 },
            { duration: 0.2, opacity: 1, y: 0 },
          ),
        onComplete: () => {
          activeFlip = undefined;
        },
        onInterrupt: () => {
          activeFlip = undefined;
        },
      });
    }

    setFormState(currentState);
    renderPages(page.page, page.totalPages);
    empty.hidden = page.totalResults !== 0;

    if (page.totalResults === 0) {
      range.textContent = '0 repositories';
      if (options.announce !== false) {
        announcement.textContent = 'No repositories match this view.';
      }
    } else {
      const start = (page.page - 1) * 12 + 1;
      const end = Math.min(start + page.projects.length - 1, page.totalResults);
      range.textContent = `${start}–${end} of ${page.totalResults}`;
      if (options.announce !== false) {
        announcement.textContent = `${page.totalResults} repositories found. Showing ${start} through ${end}.`;
      }
    }

    updateHistory(currentState, options.history ?? 'none');
    if (options.focusBuffer) bufferTitle?.focus({ preventScroll: true });
  };

  const applyFormState = (history: 'push' | 'replace') => {
    applyState(getFilterState(form), {
      animate: true,
      history,
      announce: true,
    });
  };

  form.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      applyFormState('push');
    },
    { signal: controller.signal },
  );
  search.addEventListener(
    'input',
    () => {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => applyFormState('replace'), SEARCH_DELAY);
    },
    { signal: controller.signal },
  );
  [language, site, sort].forEach((control) => {
    control.addEventListener('change', () => applyFormState('push'), {
      signal: controller.signal,
    });
  });
  reset.addEventListener(
    'click',
    (event) => {
      event.preventDefault();
      applyState(
        { q: '', language: 'all', site: 'all', sort: 'updated', page: 1 },
        { animate: true, history: 'push', announce: true },
      );
    },
    { signal: controller.signal },
  );
  previous.addEventListener(
    'click',
    () => {
      applyState(
        { ...currentState, page: currentState.page - 1 },
        { animate: true, focusBuffer: true, history: 'push' },
      );
    },
    { signal: controller.signal },
  );
  next.addEventListener(
    'click',
    () => {
      applyState(
        { ...currentState, page: currentState.page + 1 },
        { animate: true, focusBuffer: true, history: 'push' },
      );
    },
    { signal: controller.signal },
  );
  pages.addEventListener(
    'click',
    (event) => {
      const button =
        event.target instanceof Element
          ? event.target.closest<HTMLButtonElement>('[data-project-page]')
          : null;
      const page = Number.parseInt(button?.dataset.projectPage ?? '', 10);
      if (!Number.isFinite(page)) return;
      applyState(
        { ...currentState, page },
        { animate: true, focusBuffer: true, history: 'push' },
      );
    },
    { signal: controller.signal },
  );
  window.addEventListener(
    'popstate',
    () => {
      applyState(
        parseProjectFilters(new URL(window.location.href).searchParams),
        {
          animate: true,
          history: 'none',
          announce: true,
        },
      );
    },
    { signal: controller.signal },
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === '/' && !isEditingTarget(event.target)) {
        event.preventDefault();
        search.focus();
        return;
      }
      if (event.key !== 'Escape') return;
      if (search.value) {
        search.value = '';
        applyFormState('replace');
        search.focus();
      } else if (!window.matchMedia(DESKTOP_QUERY).matches && details.open) {
        details.open = false;
        details.querySelector('summary')?.focus();
      }
    },
    { signal: controller.signal },
  );

  workspace.dataset.enhanced = 'true';
  controls.hidden = false;
  applyState(currentState, {
    animate: false,
    history: 'replace',
    announce: false,
  });

  if (!reducedMotion.matches) {
    gsap.fromTo(
      workspace.querySelectorAll('[data-featured-project]'),
      { y: 8 },
      { duration: 0.28, ease: 'power2.out', stagger: 0.045, y: 0 },
    );
  }

  return () => {
    controller.abort();
    if (searchTimer) clearTimeout(searchTimer);
    activeFlip?.progress(1).kill();
  };
}

export function initializeProjectBrowsers(
  root: ParentNode = document,
): () => void {
  const cleanups = Array.from(
    root.querySelectorAll<HTMLElement>('[data-project-workspace]'),
  ).map(enhanceProjectBrowser);

  return () => cleanups.forEach((cleanup) => cleanup());
}
