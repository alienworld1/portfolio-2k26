import { describe, expect, it } from 'vitest';

import type { GitHubProject } from '../../src/data/github-projects';
import {
  filterAndPaginateProjects,
  parseProjectFilters,
  serializeProjectFilters,
  type ProjectFilterState,
} from '../../src/utils/project-browser';

function project(
  index: number,
  overrides: Partial<GitHubProject> = {},
): GitHubProject {
  return {
    name: `project-${String(index).padStart(2, '0')}`,
    description: `Description ${index}`,
    primaryLanguage: index % 2 === 0 ? 'TypeScript' : 'Rust',
    repositoryUrl: `https://github.com/alienworld1/project-${index}`,
    websiteUrl: index % 3 === 0 ? `https://project-${index}.example.com` : null,
    updatedAt: `2026-01-${String(Math.min(index + 1, 28)).padStart(2, '0')}T00:00:00.000Z`,
    isFork: false,
    isArchived: false,
    pinnedPosition: null,
    ...overrides,
  };
}

const defaults: ProjectFilterState = {
  q: '',
  language: 'all',
  site: 'all',
  sort: 'updated',
  page: 1,
};

describe('project browser state', () => {
  it('parses valid URL state and normalizes invalid values', () => {
    expect(
      parseProjectFilters(
        new URLSearchParams('q=trace&language=Rust&site=with&sort=name&page=2'),
      ),
    ).toEqual({
      q: 'trace',
      language: 'Rust',
      site: 'with',
      sort: 'name',
      page: 2,
    });
    expect(
      parseProjectFilters(
        new URLSearchParams('site=maybe&sort=random&page=-4'),
      ),
    ).toEqual(defaults);
  });

  it('omits default values while serializing URL state', () => {
    expect(serializeProjectFilters(defaults).toString()).toBe('');
    expect(
      serializeProjectFilters({
        q: 'pi trace',
        language: 'C++',
        site: 'without',
        sort: 'name',
        page: 3,
      }).toString(),
    ).toBe('q=pi+trace&language=C%2B%2B&site=without&sort=name&page=3');
  });

  it('searches name and description without case sensitivity', () => {
    const projects = [
      project(1, { name: 'piTrace', description: 'Forensic metadata triage' }),
      project(2, { name: 'other', description: 'A messenger app' }),
    ];

    expect(
      filterAndPaginateProjects(projects, { ...defaults, q: 'FORENSIC' })
        .projects[0]?.name,
    ).toBe('piTrace');
    expect(
      filterAndPaginateProjects(projects, { ...defaults, q: 'pitrace' })
        .projects[0]?.name,
    ).toBe('piTrace');
  });

  it('combines language and website filters', () => {
    const result = filterAndPaginateProjects(
      [project(1), project(2), project(3), project(4)],
      { ...defaults, language: 'Rust', site: 'with' },
    );

    expect(result.projects.map(({ name }) => name)).toEqual(['project-03']);
  });

  it('sorts by name and paginates twelve results', () => {
    const result = filterAndPaginateProjects(
      Array.from({ length: 14 }, (_, index) => project(index)),
      { ...defaults, sort: 'name', page: 2 },
    );

    expect(result).toMatchObject({ totalResults: 14, totalPages: 2, page: 2 });
    expect(result.projects.map(({ name }) => name)).toEqual([
      'project-12',
      'project-13',
    ]);
  });

  it('clamps out-of-range pages and represents empty results as page one', () => {
    expect(
      filterAndPaginateProjects([project(1)], { ...defaults, page: 99 }).page,
    ).toBe(1);
    expect(
      filterAndPaginateProjects([], { ...defaults, page: 9 }),
    ).toMatchObject({ totalResults: 0, totalPages: 1, page: 1, projects: [] });
  });
});
