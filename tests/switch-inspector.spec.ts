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

async function openSwitchInspector(page: Page) {
  await page.goto(WORKFLOW);
  await page
    .locator('.svelte-flow__node')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });
  // The demo workflow has a switch node named "route".
  await page.getByText('route').click();
  // Wait until the Branches section is visible.
  await expect(
    page.locator('[data-testid="switch-branch-card"]').first(),
  ).toBeVisible({ timeout: 5_000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Switch inspector', () => {
  test('shows editable branch fields for each branch', async ({ page }) => {
    await openSwitchInspector(page);

    const cards = page.locator('[data-testid="switch-branch-card"]');
    await expect(cards).toHaveCount(2);

    // First branch (fast-path): has name, condition, and target fields.
    const first = cards.first();
    await expect(first.getByLabel('Branch name')).toHaveValue('fast-path');
    await expect(first.getByLabel('Condition (when)')).toHaveValue(
      '${ $input.fast == true }',
    );
    await expect(first.getByLabel('Target workflow')).toHaveValue(
      'route-fast-path',
    );

    // Second branch (default): has name and target but no condition field.
    const second = cards.nth(1);
    await expect(second.getByLabel('Branch name')).toHaveValue('default');
    await expect(second.getByLabel('Condition (when)')).toHaveCount(0);
    await expect(second.getByLabel('Target workflow')).toHaveValue(
      'route-default',
    );
    // Default badge is shown.
    await expect(second.getByText('Default branch')).toBeVisible();
  });

  test('can rename a branch and change its condition', async ({ page }) => {
    await openSwitchInspector(page);

    const first = page.locator('[data-testid="switch-branch-card"]').first();
    const nameInput = first.getByLabel('Branch name');
    const condInput = first.getByLabel('Condition (when)');

    // Rename the branch.
    await nameInput.fill('fast-route');
    // Change the condition.
    await condInput.fill('${ $input.speed == "fast" }');

    // Wait for auto-save.
    await expect(page.getByTestId('save-status')).toContainText('Saved', {
      timeout: 5_000,
    });

    // Reload and verify persistence.
    await page.reload();
    await page
      .locator('.svelte-flow__node')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 });
    await page.getByText('route').click();
    await expect(
      page.locator('[data-testid="switch-branch-card"]').first(),
    ).toBeVisible({ timeout: 5_000 });

    const firstAfter = page
      .locator('[data-testid="switch-branch-card"]')
      .first();
    await expect(firstAfter.getByLabel('Branch name')).toHaveValue(
      'fast-route',
    );
    await expect(firstAfter.getByLabel('Condition (when)')).toHaveValue(
      '${ $input.speed == "fast" }',
    );

    // Restore original values.
    await firstAfter.getByLabel('Branch name').fill('fast-path');
    await firstAfter
      .getByLabel('Condition (when)')
      .fill('${ $input.fast == true }');
    await expect(page.getByTestId('save-status')).toContainText('Saved', {
      timeout: 5_000,
    });
  });

  test('can change target workflow and it persists', async ({ page }) => {
    await openSwitchInspector(page);

    const first = page.locator('[data-testid="switch-branch-card"]').first();
    const targetSelect = first.getByLabel('Target workflow');

    // Change target to route-default.
    await targetSelect.selectOption('route-default');

    // Wait for auto-save.
    await expect(page.getByTestId('save-status')).toContainText('Saved', {
      timeout: 5_000,
    });

    // Reload and verify.
    await page.reload();
    await page
      .locator('.svelte-flow__node')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 });
    await page.getByText('route').click();
    await expect(
      page.locator('[data-testid="switch-branch-card"]').first(),
    ).toBeVisible({ timeout: 5_000 });

    await expect(
      page
        .locator('[data-testid="switch-branch-card"]')
        .first()
        .getByLabel('Target workflow'),
    ).toHaveValue('route-default');

    // Restore original.
    await page
      .locator('[data-testid="switch-branch-card"]')
      .first()
      .getByLabel('Target workflow')
      .selectOption('route-fast-path');
    await expect(page.getByTestId('save-status')).toContainText('Saved', {
      timeout: 5_000,
    });
  });

  test('can add a new branch', async ({ page }) => {
    await openSwitchInspector(page);

    const initialCount = await page
      .locator('[data-testid="switch-branch-card"]')
      .count();

    // Click the add branch button.
    await page.getByRole('button', { name: '+ Add branch' }).click();

    // A new card should appear.
    await expect(
      page.locator('[data-testid="switch-branch-card"]'),
    ).toHaveCount(initialCount + 1);

    // The new branch should have "new-branch" as the name.
    const last = page.locator('[data-testid="switch-branch-card"]').last();
    await expect(last.getByLabel('Branch name')).toHaveValue('new-branch');

    // New non-default branch should have a condition field.
    await expect(last.getByLabel('Condition (when)')).toBeVisible();

    // Condition is empty — warning should be shown.
    await expect(last.getByText('Condition is required')).toBeVisible();

    // Wait for save, then delete the new branch to restore state.
    await expect(page.getByTestId('save-status')).toContainText('Saved', {
      timeout: 5_000,
    });
    await last
      .getByRole('button', { name: 'Remove branch new-branch' })
      .click();
    await expect(page.getByTestId('save-status')).toContainText('Saved', {
      timeout: 5_000,
    });
  });

  test('"Add default branch" button is hidden when default already exists', async ({
    page,
  }) => {
    await openSwitchInspector(page);

    // The demo workflow already has a default branch — button should not appear.
    await expect(
      page.getByRole('button', { name: '+ Add default branch' }),
    ).toHaveCount(0);
  });
});
