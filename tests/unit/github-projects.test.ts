import { describe, expect, it, vi } from 'vitest';

import {
  curateGitHubProjects,
  githubProjectSnapshotSchema,
  normalizeGitHubProject,
  resolveGitHubProjectSnapshot,
  type GitHubProject,
  type GitHubProjectSnapshot,
} from '../../src/data/github-projects';

function project(
  name: string,
  overrides: Partial<GitHubProject> = {},
): GitHubProject {
  return {
    name,
    description: `${name} description`,
    primaryLanguage: 'TypeScript',
    repositoryUrl: `https://github.com/alienworld1/${name}`,
    websiteUrl: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    isFork: false,
    isArchived: false,
    pinnedPosition: null,
    ...overrides,
  };
}

function snapshot(
  repositories: GitHubProject[] = [project('piTrace')],
): GitHubProjectSnapshot {
  return {
    username: 'alienworld1',
    fetchedAt: '2026-08-16T00:00:00.000Z',
    pinnedNames: repositories
      .filter(({ pinnedPosition }) => pinnedPosition !== null)
      .sort(
        (left, right) =>
          (left.pinnedPosition ?? 0) - (right.pinnedPosition ?? 0),
      )
      .map(({ name }) => name),
    repositories,
  };
}

describe('GitHub project data', () => {
  it('normalizes blank metadata and records pin order', () => {
    const normalized = normalizeGitHubProject(
      {
        name: 'piTrace',
        description: '  ',
        language: null,
        html_url: 'https://github.com/alienworld1/piTrace',
        homepage: 'not a URL',
        updated_at: '2026-01-01T00:00:00.000Z',
        fork: false,
        archived: false,
      },
      ['another-project', 'piTrace'],
    );

    expect(normalized).toMatchObject({
      description: null,
      primaryLanguage: null,
      websiteUrl: null,
      pinnedPosition: 2,
    });
  });

  it('validates a complete checked snapshot', () => {
    expect(
      githubProjectSnapshotSchema.parse(snapshot()).repositories,
    ).toHaveLength(1);
  });

  it('orders pins and removes forks, system repos, denylisted repos, and duplicates', () => {
    const input = snapshot([
      project('second-pin', { pinnedPosition: 2 }),
      project('first-pin', { pinnedPosition: 1 }),
      project('forked', { isFork: true }),
      project('alienworld1'),
      project('vite-react-template'),
      project('archive-new', { updatedAt: '2026-02-01T00:00:00.000Z' }),
      project('archive-old', { updatedAt: '2025-01-01T00:00:00.000Z' }),
    ]);

    const curated = curateGitHubProjects(input);

    expect(curated.featured.map(({ name }) => name)).toEqual([
      'first-pin',
      'second-pin',
    ]);
    expect(curated.archive.map(({ name }) => name)).toEqual([
      'archive-new',
      'archive-old',
    ]);
  });

  it('lets a GitHub pin override the local denylist', () => {
    const curated = curateGitHubProjects(
      snapshot([project('portfolio-2k26', { pinnedPosition: 1 })]),
    );

    expect(curated.featured[0]?.name).toBe('portfolio-2k26');
    expect(curated.archive).toHaveLength(0);
  });

  it('prefers live data when the authenticated refresh succeeds', async () => {
    const live = snapshot([project('live-project')]);
    const fetchLive = vi.fn().mockResolvedValue(live);

    await expect(
      resolveGitHubProjectSnapshot({
        token: 'read-only-token',
        fallback: snapshot(),
        fetchLive,
      }),
    ).resolves.toEqual(live);
    expect(fetchLive).toHaveBeenCalledWith('read-only-token');
  });

  it('warns and uses the checked snapshot when a live refresh fails', async () => {
    const fallback = snapshot();
    const onWarning = vi.fn();

    await expect(
      resolveGitHubProjectSnapshot({
        token: 'read-only-token',
        fallback,
        fetchLive: vi.fn().mockRejectedValue(new Error('rate limited')),
        onWarning,
      }),
    ).resolves.toEqual(fallback);
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining('using the checked snapshot'),
    );
  });

  it('fails when neither live data nor a valid snapshot exists', async () => {
    await expect(
      resolveGitHubProjectSnapshot({ fallback: { repositories: [] } }),
    ).rejects.toThrow('GitHub project data is unavailable');
  });
});
