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
import { expect, test } from '@playwright/test';

const WORKFLOW = '/workflows/demo-workflow.yaml';

test.describe('YAML export shape', () => {
  test('exported YAML uses workflows-list format', async ({ page }) => {
    await page.goto(WORKFLOW);

    await page.getByRole('button', { name: 'Export YAML' }).click();

    const exportCode = page.locator('.export-code');
    await expect(exportCode).toBeVisible();

    const text = await exportCode.textContent();
    expect(text).toBeTruthy();

    // Top-level do: must contain named workflow declarations, not bare steps.
    expect(text).toMatch(/- demo-workflow:\s+do:/);

    // Hoisted sub-workflows must appear as top-level workflow entries.
    expect(text).toMatch(/- route-fast-path:\s+do:/);
    expect(text).toMatch(/- route-default:\s+do:/);

    // Switch branches must use then: references, not inline steps.
    expect(text).toContain('then: route-fast-path');
    expect(text).toContain('then: route-default');

    // Primary workflow steps must be nested under demo-workflow.do.
    expect(text).toContain('greet:');
    expect(text).toContain('pause:');
    expect(text).toContain('route:');
  });

  test('sidebar lists all top-level workflows', async ({ page }) => {
    await page.goto(WORKFLOW);

    // All three workflows from the new format should be in the sidebar.
    await expect(
      page.getByRole('button', { name: 'demo-workflow' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'route-fast-path' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'route-default' }),
    ).toBeVisible();
  });
});
