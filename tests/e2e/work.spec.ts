import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pinnedNames = [
  'basic-malicious-programs',
  'blocksmith-showcase',
  'piTrace',
  'swiss-cheese-bot',
];

test('redirects Work to current pins and switches tmux windows', async ({
  page,
}) => {
  await page.goto('/work/');

  await expect(page).toHaveURL('/work/pinned/');
  await expect(page.locator('[data-featured-project]')).toHaveCount(4);
  await expect(
    page.locator('[data-featured-project] h3').allTextContents(),
  ).resolves.toEqual(pinnedNames);
  await expect(
    page.locator('[data-work-window-link="pinned"]'),
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-project-item]')).toHaveCount(0);

  await page.locator('[data-work-window-link="repositories"]').click();
  await expect(page).toHaveURL('/work/repositories/');
  await expect(
    page.locator('[data-work-window-link="repositories"]'),
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-featured-project]')).toHaveCount(0);
  await expect(page.locator('[data-project-item]:visible')).toHaveCount(12);

  await page.getByRole('button', { name: 'Page 2' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('[data-project-item]:visible')).toHaveCount(12);
});

test('persists combined filters and restores them through history', async ({
  page,
}) => {
  await page.goto('/work/repositories/');

  await page.getByLabel('Primary language').selectOption('TypeScript');
  await page.getByLabel('Website', { exact: true }).selectOption('with');
  await expect(page).toHaveURL(/language=TypeScript/);
  await expect(page).toHaveURL(/site=with/);
  await expect(page.locator('[data-project-item]:visible')).not.toHaveCount(0);

  await page.getByRole('link', { name: 'Reset view' }).click();
  await expect(page).toHaveURL('/work/repositories/');
  await page.goBack();
  await expect(page.getByLabel('Primary language')).toHaveValue('TypeScript');
  await expect(page.getByLabel('Website', { exact: true })).toHaveValue('with');
});

test('supports search shortcuts and an honest empty state', async ({
  page,
}) => {
  await page.goto('/work/repositories/');

  await page.keyboard.press('/');
  await expect(page.getByRole('searchbox', { name: 'Search' })).toBeFocused();
  await page.getByRole('searchbox', { name: 'Search' }).fill('payne');
  await expect(page.locator('[data-project-item]:visible')).toHaveCount(1);
  await expect(page.locator('[data-project-item]:visible h3')).toHaveText(
    'payne',
  );

  await page
    .getByRole('searchbox', { name: 'Search' })
    .fill('definitely-not-a-repository');
  await expect(page.locator('[data-project-empty]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('searchbox', { name: 'Search' })).toHaveValue('');
});

test('marks external evidence links safely', async ({ page }) => {
  await page.goto('/work/pinned/');

  const repositoryLink = page
    .locator('[data-featured-project]')
    .first()
    .getByRole('link', { name: /repository on GitHub/i });
  await expect(repositoryLink).toHaveAttribute('target', '_blank');
  await expect(repositoryLink).toHaveAttribute('rel', 'noopener noreferrer');
});

test('has no serious or critical automated accessibility violations', async ({
  page,
}) => {
  for (const path of ['/work/pinned/', '/work/repositories/']) {
    await page.goto(path);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const seriousViolations = results.violations.filter(({ impact }) =>
      impact ? ['serious', 'critical'].includes(impact) : false,
    );

    expect(seriousViolations).toEqual([]);
  }
});

test('keeps both views usable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto('/work/pinned/');
  await expect(page.locator('[data-featured-project]')).toHaveCount(4);
  await page.locator('[data-work-window-link="repositories"]').click();
  await expect(page).toHaveURL('/work/repositories/');

  const totalRows = await page.locator('[data-project-item]').count();
  await expect(page.locator('[data-project-item]:visible')).toHaveCount(
    totalRows,
  );
  await expect(page.locator('[data-project-controls]')).toBeHidden();
  await context.close();
});

test('uses a focused mobile filter disclosure', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'));
  await page.goto('/work/repositories/');

  const filters = page.locator('[data-project-filter-details]');
  await expect(filters).toHaveAttribute('open', '');
  await filters.locator('summary').click();
  await expect(filters).not.toHaveAttribute('open', '');
});
