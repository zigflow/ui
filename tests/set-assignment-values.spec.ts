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

/**
 * Open the greet node inspector (it is a Set node in the demo workflow).
 * Waits until the Assignments section is visible.
 */
async function openGreetInspector(page: Page) {
  await page.goto(WORKFLOW);
  await page
    .locator('.svelte-flow__node')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByText('greet').click();
  await expect(
    page.getByRole('button', { name: '+ Add assignment' }),
  ).toBeVisible({ timeout: 5_000 });
}

/**
 * Add a new assignment row. Optionally selects a type override before filling
 * the value (needed for non-string types since VSS no longer auto-coerces).
 *
 * When typeOverride is 'null', the value input is disabled — no fill is done.
 */
async function addRow(
  page: Page,
  key: string,
  value: string,
  typeOverride?: string,
) {
  const addBtn = page.getByRole('button', { name: '+ Add assignment' });
  const rows = page.locator('.assignment-item');
  const countBefore = await rows.count();

  await addBtn.click();
  await expect(rows).toHaveCount(countBefore + 1);

  const newRow = rows.last();
  // getByRole('textbox').first() reliably targets the key input because it
  // appears before the VSS value input in DOM order.
  await newRow.getByRole('textbox').first().fill(key);

  if (typeOverride) {
    // Selecting a non-string override hides the VSS and shows the plain input.
    await newRow
      .getByRole('combobox', { name: /Type for/ })
      .selectOption(typeOverride);
  }

  // 'null' override immediately stores null and disables the value input.
  if (typeOverride !== 'null') {
    await newRow.getByLabel('Value').fill(value);
  }

  return newRow;
}

/**
 * Export YAML and return the full text of the export code block.
 */
async function exportYaml(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Export YAML' }).click();
  const exportCode = page.locator('.export-code');
  await expect(exportCode).toBeVisible();
  const text = await exportCode.textContent();
  // Close the dialog so it doesn't interfere with other assertions.
  await page.getByRole('button', { name: 'Close' }).click();
  return text ?? '';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Set assignment value types', () => {
  // -------------------------------------------------------------------------
  // Non-string types: must use the type-override dropdown to force the type.
  // ValueSourceSelector (used for string values) stores all values verbatim
  // as strings — no auto-coercion. Selecting 'boolean', 'number', or 'null'
  // hides the VSS and shows a plain typed input instead.
  // -------------------------------------------------------------------------

  test('boolean override: true stored as unquoted boolean in YAML', async ({
    page,
  }) => {
    await openGreetInspector(page);
    // Selecting 'boolean' override makes the VSS disappear; 'true' is then
    // typed into the plain text input and coerced to boolean.
    await addRow(page, 'pw-bool', 'true', 'boolean');

    const yaml = await exportYaml(page);
    // js-yaml emits boolean true without quotes.
    expect(yaml).toMatch(/pw-bool:\s+true(?!\w)/);
    // Must NOT be quoted.
    expect(yaml).not.toMatch(/pw-bool:\s+'true'/);
    expect(yaml).not.toMatch(/pw-bool:\s+"true"/);
  });

  test('number override: integer stored as unquoted number in YAML', async ({
    page,
  }) => {
    await openGreetInspector(page);
    await addRow(page, 'pw-num', '123', 'number');

    const yaml = await exportYaml(page);
    expect(yaml).toMatch(/pw-num:\s+123(?!\d)/);
    // Must NOT be a quoted string.
    expect(yaml).not.toMatch(/pw-num:\s+'123'/);
  });

  test('literal mode: plain string stored as unquoted string in YAML', async ({
    page,
  }) => {
    // 'hello' does not require type-coercion — VSS literal mode stores it as
    // a string and js-yaml emits it without quotes.
    await openGreetInspector(page);
    await addRow(page, 'pw-str', 'hello');

    const yaml = await exportYaml(page);
    expect(yaml).toMatch(/pw-str:\s+hello/);
  });

  test('literal mode: object-like strings are stored verbatim without error', async ({
    page,
  }) => {
    // VSS literal mode stores any string verbatim — no validation fires.
    // (The old plain-input "objects not supported" error only applied to
    // auto-coerce mode; it no longer applies to the VSS path.)
    await openGreetInspector(page);

    const addBtn = page.getByRole('button', { name: '+ Add assignment' });
    const rows = page.locator('.assignment-item');
    const countBefore = await rows.count();

    await addBtn.click();
    await expect(rows).toHaveCount(countBefore + 1);

    const newRow = rows.last();
    await newRow.getByRole('textbox').first().fill('pw-obj');

    const valueInput = newRow.getByLabel('Value');
    await valueInput.fill('{ "a": 1 }');

    // No validation error must appear.
    await expect(
      page.getByText('Objects and arrays are not supported'),
    ).toHaveCount(0);

    // The key is present in the YAML (emitted by handleKeyChange).
    const yaml = await exportYaml(page);
    expect(yaml).toContain('pw-obj:');
  });

  test('string override: "true" is stored as quoted string in YAML', async ({
    page,
  }) => {
    await openGreetInspector(page);

    const addBtn = page.getByRole('button', { name: '+ Add assignment' });
    const rows = page.locator('.assignment-item');
    const countBefore = await rows.count();

    await addBtn.click();
    await expect(rows).toHaveCount(countBefore + 1);

    const newRow = rows.last();
    await newRow.getByRole('textbox').first().fill('pw-strover');

    // Switch override to String before entering the value.
    await newRow
      .getByRole('combobox', { name: /Type for/ })
      .selectOption('string');

    const valueInput = newRow.getByLabel('Value');
    await valueInput.fill('true');

    const yaml = await exportYaml(page);
    // js-yaml must quote the string "true" to distinguish it from boolean.
    expect(yaml).toMatch(/pw-strover:\s+'true'/);
  });

  test('number override: float stored as unquoted float in YAML', async ({
    page,
  }) => {
    await openGreetInspector(page);
    await addRow(page, 'pw-float', '3.14', 'number');

    const yaml = await exportYaml(page);
    expect(yaml).toMatch(/pw-float:\s+3\.14/);
  });

  test('literal mode: the string "null" is stored as a quoted string', async ({
    page,
  }) => {
    // VSS literal mode does not coerce 'null' to YAML null. The string is
    // stored as-is and js-yaml emits it quoted to distinguish from null.
    await openGreetInspector(page);
    await addRow(page, 'pw-str-null', 'null');

    const yaml = await exportYaml(page);
    expect(yaml).toMatch(/pw-str-null:\s+'null'/);
  });

  test('null override — value input is disabled and YAML emits null', async ({
    page,
  }) => {
    await openGreetInspector(page);

    const addBtn = page.getByRole('button', { name: '+ Add assignment' });
    const rows = page.locator('.assignment-item');
    const countBefore = await rows.count();

    await addBtn.click();
    await expect(rows).toHaveCount(countBefore + 1);

    const newRow = rows.last();
    await newRow.getByRole('textbox').first().fill('pw-nullov');

    // Switch override to Null.
    await newRow
      .getByRole('combobox', { name: /Type for/ })
      .selectOption('null');

    // Value input must be disabled.
    const valueInput = newRow.getByLabel('Value');
    await expect(valueInput).toBeDisabled();

    const yaml = await exportYaml(page);
    expect(yaml).toMatch(/pw-nullov:\s+null/);
  });
});
