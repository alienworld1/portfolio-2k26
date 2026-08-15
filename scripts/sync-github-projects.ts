import { writeFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

import { fetchGitHubProjectSnapshot } from '../src/data/github-projects';

try {
  loadEnvFile();
} catch {
  // A deployment may provide GITHUB_TOKEN directly without a local .env file.
}

const token = process.env.GITHUB_TOKEN;

if (!token) {
  throw new Error('Set GITHUB_TOKEN before running pnpm sync:github.');
}

const snapshot = await fetchGitHubProjectSnapshot(token);
const outputUrl = new URL(
  '../src/data/github-projects.snapshot.json',
  import.meta.url,
);

await writeFile(
  fileURLToPath(outputUrl),
  `${JSON.stringify(snapshot, null, 2)}\n`,
  'utf8',
);

console.log(
  `Saved ${snapshot.repositories.length} repositories and ${snapshot.pinnedNames.length} pins.`,
);
