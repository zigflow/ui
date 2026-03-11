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

test.describe('Workflow save', () => {
  test('dragging a palette item makes the editor dirty then saved, and persists after reload', async ({
    page,
  }) => {
    await page.goto(WORKFLOW);

    // Wait for the canvas to be fully hydrated: nodes are shown with dimensions
    // only after the client-side $effect runs, so we wait for a canvas node to
    // appear before triggering any drag.
    await page
      .locator('.svelte-flow__node')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 });

    // Locate the "Wait" palette item and the canvas drop target.
    const waitItem = page.getByText('Wait', { exact: true });
    const canvas = page.getByRole('region', { name: 'Workflow canvas' });

    await expect(waitItem).toBeVisible();
    await expect(canvas).toBeVisible();

    // Use Playwright's native dragTo so the browser fires trusted drag events
    // and the dataTransfer set in ondragstart flows through to ondrop correctly.
    await waitItem.dragTo(canvas);

    // Status should transition through dirty / saving to saved.
    const saveStatus = page.getByTestId('save-status');
    await expect(saveStatus).toContainText(/Unsaved changes|Saving…/);
    await expect(saveStatus).toContainText('Saved', { timeout: 5000 });

    // After reload the newly inserted "wait" node must persist.
    await page.reload();

    await page.getByRole('button', { name: 'Export YAML' }).click();

    const exportCode = page.locator('.export-code');
    await expect(exportCode).toBeVisible();

    const yamlText = await exportCode.textContent();
    // The wait task config serialises as "wait:\n  seconds: ..." in YAML.
    expect(yamlText).toMatch(/wait:\s+seconds:/);
  });
});
