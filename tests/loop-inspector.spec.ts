/*
 * Copyright 2025 - 2026 Zigflow authors <https://github.com/zigflow/studio/graphs/contributors>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { type Page, expect, test } from '@playwright/test';

const WORKFLOW = '/workflows/demo-workflow.yaml';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function openLoopInspector(page: Page) {
  await page.goto(WORKFLOW);
  await page
    .locator('.svelte-flow__node')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });
  // The demo workflow has a loop node named "process-items".
  await page.getByText('process-items').click();
  // Wait for the Loop configuration section heading.
  await expect(
    page.getByRole('heading', { name: 'Loop configuration' }),
  ).toBeVisible({ timeout: 5_000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Loop inspector', () => {
  test('shows all loop fields with correct initial values', async ({
    page,
  }) => {
    await openLoopInspector(page);

    await expect(page.getByLabel('Collection')).toHaveValue(
      '${ $input.items }',
    );
    await expect(page.getByLabel('Item variable')).toHaveValue('');
    await expect(page.getByLabel('Index variable')).toHaveValue('');
    await expect(page.getByLabel('Break condition')).toHaveValue('');
  });

  test('collection change persists across reload', async ({ page }) => {
    await openLoopInspector(page);

    await page.getByLabel('Collection').fill('${ $input.data }');
    await expect(page.getByTestId('save-status')).toContainText('Saved', {
      timeout: 5_000,
    });

    // Reload — URL ?selected= keeps inspector open on the same node.
    await page.reload();
    await page
      .locator('.svelte-flow__node')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 });
    await expect(page.getByLabel('Collection')).toHaveValue(
      '${ $input.data }',
      {
        timeout: 5_000,
      },
    );

    // Restore original value.
    await page.getByLabel('Collection').fill('${ $input.items }');
    await expect(page.getByTestId('save-status')).toContainText('Saved', {
      timeout: 5_000,
    });
  });

  test('collection change is reflected in YAML export', async ({ page }) => {
    await openLoopInspector(page);

    await page.getByLabel('Collection').fill('${ $context.list }');
    await expect(page.getByTestId('save-status')).toContainText('Saved', {
      timeout: 5_000,
    });

    await page.getByRole('button', { name: 'Export YAML' }).click();
    const exportCode = page.locator('.export-code');
    await expect(exportCode).toBeVisible();
    await expect(exportCode).toContainText('$context.list');
    await page.getByRole('button', { name: 'Close' }).click();

    // Restore.
    await page.getByLabel('Collection').fill('${ $input.items }');
    await expect(page.getByTestId('save-status')).toContainText('Saved', {
      timeout: 5_000,
    });
  });

  test('optional fields (item variable, index variable) persist', async ({
    page,
  }) => {
    await openLoopInspector(page);

    await page.getByLabel('Item variable').fill('item');
    await page.getByLabel('Index variable').fill('idx');
    await expect(page.getByTestId('save-status')).toContainText('Saved', {
      timeout: 5_000,
    });

    await page.reload();
    await page
      .locator('.svelte-flow__node')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 });
    await expect(page.getByLabel('Item variable')).toHaveValue('item', {
      timeout: 5_000,
    });
    await expect(page.getByLabel('Index variable')).toHaveValue('idx', {
      timeout: 5_000,
    });

    // Restore.
    await page.getByLabel('Item variable').fill('');
    await page.getByLabel('Index variable').fill('');
    await expect(page.getByTestId('save-status')).toContainText('Saved', {
      timeout: 5_000,
    });
  });

  test('empty collection shows a validation warning', async ({ page }) => {
    await openLoopInspector(page);

    await page.getByLabel('Collection').fill('');
    await expect(page.getByText('Collection is required')).toBeVisible();
  });

  test('invalid identifier in item variable shows a warning', async ({
    page,
  }) => {
    await openLoopInspector(page);

    await page.getByLabel('Item variable').fill('invalid identifier');
    await expect(page.getByText('Must be a valid identifier')).toBeVisible();

    // Restore.
    await page.getByLabel('Item variable').fill('');
    await expect(page.getByTestId('save-status')).toContainText('Saved', {
      timeout: 5_000,
    });
  });

  test('"Enter loop body" button navigates into the body graph', async ({
    page,
  }) => {
    await openLoopInspector(page);

    await page.getByRole('button', { name: 'Enter loop body' }).click();

    // After navigating in, the inspector should close (no node selected).
    await expect(page.getByLabel('Collection')).toHaveCount(0);
    // Breadcrumb should show we are inside the loop body.
    await expect(page.locator('.breadcrumb')).toContainText('process-items');
  });
});
