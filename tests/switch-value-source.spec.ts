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
// Switch branch `when` — ValueSourceSelector integration tests.
//
// Pure logic tests use inline data and direct imports (no filesystem I/O).
// Rendering tests navigate to the demo workflow which contains a switch node;
// they assert structural presence / absence of the selector, not specific
// file-derived values.
import { type Page, expect, test } from '@playwright/test';

import {
  buildInputValue,
  detectSource,
  parseInputPath,
} from '../src/lib/ui/value-source';

// ---------------------------------------------------------------------------
// Item 2 — pure in-memory logic (no browser, no filesystem)
// ---------------------------------------------------------------------------

test.describe('switch condition: value-source round-trip', () => {
  test('selecting input path hello.world stores ${ $input.hello.world }', () => {
    const path = 'hello.world';
    const stored = buildInputValue(path);
    expect(stored).toBe('${ $input.hello.world }');
    expect(detectSource(stored)).toBe('input');
    expect(parseInputPath(stored)).toBe(path);
  });

  test('complex expression is NOT misclassified as input mode', () => {
    // Ensures the regex fix is in effect: spaces/operators keep `expression` mode.
    const expr = '${ $input.fast == true }';
    expect(detectSource(expr)).toBe('expression');
    expect(parseInputPath(expr)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Rendering tests — inline assertions, no workflow file content assumed
// ---------------------------------------------------------------------------

const WORKFLOW = '/workflows/demo-workflow.yaml';

async function openSwitchInspector(page: Page): Promise<void> {
  await page.goto(WORKFLOW);
  await page
    .locator('.svelte-flow__node')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByText('route').click();
  await expect(
    page.locator('[data-testid="switch-branch-card"]').first(),
  ).toBeVisible({ timeout: 5_000 });
}

test.describe('switch branch when — ValueSourceSelector rendering', () => {
  // Item 1: non-default branch renders ValueSourceSelector
  test('non-default switch branch renders ValueSourceSelector', async ({
    page,
  }) => {
    await openSwitchInspector(page);

    const first = page.locator('[data-testid="switch-branch-card"]').first();
    // The source-mode dropdown is the outer select rendered by ValueSourceSelector.
    await expect(first.locator('.vss-source')).toBeVisible();
    // The condition label should be present.
    await expect(first.getByText('Condition (when)')).toBeVisible();
  });

  // Item 3: default branch has no `when` selector
  test('default branch does not render a when selector', async ({ page }) => {
    await openSwitchInspector(page);

    const cards = page.locator('[data-testid="switch-branch-card"]');
    // Second card is the default branch in the demo workflow.
    const defaultCard = cards.nth(1);
    await expect(defaultCard.getByText('Default branch')).toBeVisible();
    // No ValueSourceSelector source-mode dropdown in the default card.
    await expect(defaultCard.locator('.vss-source')).toHaveCount(0);
    // Condition label absent.
    await expect(defaultCard.getByText('Condition (when)')).toHaveCount(0);
  });

  // Item 4: reload preserves the switch `when` condition selection
  test('reload preserves existing switch when condition selection', async ({
    page,
  }) => {
    await openSwitchInspector(page);

    const first = page.locator('[data-testid="switch-branch-card"]').first();

    // Capture current source mode and condition value before reload.
    const sourceSelect = first.locator('.vss-source');
    const initialSource = await sourceSelect.inputValue();
    const condInput = first.getByLabel('Condition (when)');
    const initialCondValue = await condInput.inputValue();

    // Reload the page — does NOT save anything to disk.
    await page.reload();
    await page
      .locator('.svelte-flow__node')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 });
    // Re-open the inspector (demo workflow has ?selected in the URL after click).
    await page.getByText('route').click();
    await expect(
      page.locator('[data-testid="switch-branch-card"]').first(),
    ).toBeVisible({ timeout: 5_000 });

    const firstAfter = page
      .locator('[data-testid="switch-branch-card"]')
      .first();

    // Source mode and condition value must survive reload.
    await expect(firstAfter.locator('.vss-source')).toHaveValue(initialSource);
    await expect(firstAfter.getByLabel('Condition (when)')).toHaveValue(
      initialCondValue,
    );
  });
});
