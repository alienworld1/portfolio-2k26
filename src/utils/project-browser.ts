import type { GitHubProject } from '../data/github-projects';

export const PROJECTS_PER_PAGE = 12;

export type ProjectSiteFilter = 'all' | 'with' | 'without';
export type ProjectSort = 'updated' | 'name';

export interface ProjectFilterState {
  q: string;
  language: string;
  site: ProjectSiteFilter;
  sort: ProjectSort;
  page: number;
}

export interface ProjectPage {
  projects: GitHubProject[];
  totalResults: number;
  totalPages: number;
  page: number;
}

export const DEFAULT_PROJECT_FILTERS: ProjectFilterState = {
  q: '',
  language: 'all',
  site: 'all',
  sort: 'updated',
  page: 1,
};

function isSiteFilter(value: string | null): value is ProjectSiteFilter {
  return value === 'all' || value === 'with' || value === 'without';
}

function isProjectSort(value: string | null): value is ProjectSort {
  return value === 'updated' || value === 'name';
}

export function parseProjectFilters(
  searchParams: URLSearchParams,
): ProjectFilterState {
  const pageValue = Number.parseInt(searchParams.get('page') ?? '', 10);
  const siteValue = searchParams.get('site');
  const sortValue = searchParams.get('sort');

  return {
    q: searchParams.get('q')?.trim() ?? '',
    language: searchParams.get('language')?.trim() || 'all',
    site: isSiteFilter(siteValue) ? siteValue : 'all',
    sort: isProjectSort(sortValue) ? sortValue : 'updated',
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
  };
}

export function serializeProjectFilters(
  state: ProjectFilterState,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (state.q) searchParams.set('q', state.q);
  if (state.language !== 'all') {
    searchParams.set('language', state.language);
  }
  if (state.site !== 'all') searchParams.set('site', state.site);
  if (state.sort !== 'updated') searchParams.set('sort', state.sort);
  if (state.page !== 1) searchParams.set('page', String(state.page));

  return searchParams;
}

export function filterAndPaginateProjects(
  projects: readonly GitHubProject[],
  state: ProjectFilterState,
): ProjectPage {
  const query = state.q.toLocaleLowerCase();
  const filtered = projects.filter((project) => {
    const matchesQuery =
      !query ||
      project.name.toLocaleLowerCase().includes(query) ||
      project.description?.toLocaleLowerCase().includes(query);
    const matchesLanguage =
      state.language === 'all' || project.primaryLanguage === state.language;
    const matchesSite =
      state.site === 'all' ||
      (state.site === 'with' && project.websiteUrl !== null) ||
      (state.site === 'without' && project.websiteUrl === null);

    return Boolean(matchesQuery && matchesLanguage && matchesSite);
  });

  filtered.sort((left, right) => {
    if (state.sort === 'name') return left.name.localeCompare(right.name);
    return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PROJECTS_PER_PAGE),
  );
  const page = Math.min(Math.max(1, state.page), totalPages);
  const startIndex = (page - 1) * PROJECTS_PER_PAGE;

  return {
    projects: filtered.slice(startIndex, startIndex + PROJECTS_PER_PAGE),
    totalResults: filtered.length,
    totalPages,
    page,
  };
}
