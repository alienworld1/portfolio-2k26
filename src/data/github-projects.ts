import { z } from 'astro/zod';
import { Octokit } from 'octokit';

import fallbackSnapshotJson from './github-projects.snapshot.json';

export const GITHUB_USERNAME = 'alienworld1';

export const PROJECT_DENYLIST = new Set([
  'portfolio-2k26',
  'alienworld1.github.io',
  'vite-react-template',
  'flutter-demo',
  'nextjs-dashboard',
  'treasurehunt-sample-frontend',
  'github-slideshow',
]);

const githubProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  primaryLanguage: z.string().nullable(),
  repositoryUrl: z.url(),
  websiteUrl: z.url().nullable(),
  updatedAt: z.string().min(1),
  isFork: z.boolean(),
  isArchived: z.boolean(),
  pinnedPosition: z.number().int().positive().nullable(),
});

export const githubProjectSnapshotSchema = z.object({
  username: z.string().min(1),
  fetchedAt: z.string().min(1),
  pinnedNames: z.array(z.string().min(1)).max(6),
  repositories: z.array(githubProjectSchema),
});

export type GitHubProject = z.infer<typeof githubProjectSchema>;
export type GitHubProjectSnapshot = z.infer<typeof githubProjectSnapshotSchema>;

interface GitHubRepositoryResponse {
  name: string;
  description?: string | null;
  language?: string | null;
  html_url: string;
  homepage?: string | null;
  updated_at?: string | null;
  fork?: boolean;
  archived?: boolean;
  owner?: { login?: string } | null;
}

interface PinnedRepositoriesResponse {
  user: {
    pinnedItems: {
      nodes: Array<{ name?: string } | null>;
    };
  } | null;
}

interface SnapshotResolutionOptions {
  token?: string;
  fallback?: unknown;
  fetchLive?: (token: string) => Promise<GitHubProjectSnapshot>;
  onWarning?: (message: string) => void;
}

let cachedSnapshotToken: string | undefined;
let cachedSnapshotPromise: Promise<GitHubProjectSnapshot> | undefined;

function normalizeWebsiteUrl(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    return new URL(candidate).toString();
  } catch {
    return null;
  }
}

export function normalizeGitHubProject(
  repository: GitHubRepositoryResponse,
  pinnedNames: readonly string[],
): GitHubProject {
  const pinnedIndex = pinnedNames.indexOf(repository.name);

  return githubProjectSchema.parse({
    name: repository.name,
    description: repository.description?.trim() || null,
    primaryLanguage: repository.language?.trim() || null,
    repositoryUrl: repository.html_url,
    websiteUrl: normalizeWebsiteUrl(repository.homepage),
    updatedAt: repository.updated_at ?? new Date(0).toISOString(),
    isFork: repository.fork ?? false,
    isArchived: repository.archived ?? false,
    pinnedPosition: pinnedIndex === -1 ? null : pinnedIndex + 1,
  });
}

export async function fetchGitHubProjectSnapshot(
  token: string,
): Promise<GitHubProjectSnapshot> {
  const octokit = new Octokit({ auth: token });
  const [repositories, pinnedResponse] = await Promise.all([
    octokit.paginate(octokit.rest.repos.listForUser, {
      username: GITHUB_USERNAME,
      type: 'owner',
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
    }),
    octokit.graphql<PinnedRepositoriesResponse>(
      `
        query PinnedRepositories($login: String!) {
          user(login: $login) {
            pinnedItems(first: 6, types: REPOSITORY) {
              nodes {
                ... on Repository {
                  name
                }
              }
            }
          }
        }
      `,
      { login: GITHUB_USERNAME },
    ),
  ]);

  const pinnedNames =
    pinnedResponse.user?.pinnedItems.nodes.flatMap((node) =>
      node?.name ? [node.name] : [],
    ) ?? [];
  const ownedRepositories = repositories.filter(
    (repository) => repository.owner?.login === GITHUB_USERNAME,
  );

  return githubProjectSnapshotSchema.parse({
    username: GITHUB_USERNAME,
    fetchedAt: new Date().toISOString(),
    pinnedNames,
    repositories: ownedRepositories.map((repository) =>
      normalizeGitHubProject(repository, pinnedNames),
    ),
  });
}

export async function resolveGitHubProjectSnapshot({
  token = process.env.GITHUB_TOKEN,
  fallback = fallbackSnapshotJson,
  fetchLive = fetchGitHubProjectSnapshot,
  onWarning = console.warn,
}: SnapshotResolutionOptions = {}): Promise<GitHubProjectSnapshot> {
  const fallbackResult = githubProjectSnapshotSchema.safeParse(fallback);

  if (token) {
    try {
      return await fetchLive(token);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      onWarning(
        `[github-projects] Live refresh failed; using the checked snapshot. ${reason}`,
      );
    }
  }

  if (fallbackResult.success) return fallbackResult.data;

  throw new Error(
    'GitHub project data is unavailable: no live response or valid checked snapshot exists.',
  );
}

export function loadGitHubProjectSnapshot(
  token?: string,
): Promise<GitHubProjectSnapshot> {
  if (!cachedSnapshotPromise || cachedSnapshotToken !== token) {
    cachedSnapshotToken = token;
    cachedSnapshotPromise = resolveGitHubProjectSnapshot({ token });
  }

  return cachedSnapshotPromise;
}

export function curateGitHubProjects(snapshot: GitHubProjectSnapshot): {
  featured: GitHubProject[];
  archive: GitHubProject[];
} {
  const featured = snapshot.repositories
    .filter((project) => project.pinnedPosition !== null)
    .sort(
      (left, right) =>
        (left.pinnedPosition ?? Number.MAX_SAFE_INTEGER) -
        (right.pinnedPosition ?? Number.MAX_SAFE_INTEGER),
    );
  const featuredNames = new Set(featured.map(({ name }) => name));
  const archive = snapshot.repositories
    .filter(
      (project) =>
        !project.isFork &&
        project.name !== snapshot.username &&
        !PROJECT_DENYLIST.has(project.name) &&
        !featuredNames.has(project.name),
    )
    .sort(
      (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
    );

  return { featured, archive };
}

export function formatProjectDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}
