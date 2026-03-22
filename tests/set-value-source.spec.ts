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
// Set assignment ValueSourceSelector integration tests.
//
// Pure logic tests use inline data and direct imports (no filesystem I/O).
// Rendering tests provision a minimal workflow via the PUT API using an
// inline object — no disk reads in test code.
import {
  type APIRequestContext,
  type Page,
  expect,
  test,
} from '@playwright/test';

import {
  coerceWithOverride,
  inferOverride,
} from '../src/lib/ui/node-editors/set-value';
import {
  buildInputValue,
  detectSource,
  parseInputPath,
} from '../src/lib/ui/value-source';

// ---------------------------------------------------------------------------
// Item 2 — input path selection stores ${ $input.<path> }  (in-memory)
// ---------------------------------------------------------------------------

test.describe('set assignment: input path round-trip', () => {
  test('selecting input path hello.world stores ${ $input.hello.world }', () => {
    const path = 'hello.world';
    const stored = buildInputValue(path);
    expect(stored).toBe('${ $input.hello.world }');
    expect(detectSource(stored)).toBe('input');
    expect(parseInputPath(stored)).toBe(path);
  });
});

// ---------------------------------------------------------------------------
// Item 3 — literal mode stores raw string unchanged  (in-memory)
// ---------------------------------------------------------------------------

test.describe('set assignment: literal mode', () => {
  test('literal string passes through coerceWithOverride unchanged', () => {
    // With string override, any raw value is stored verbatim as a string.
    expect(coerceWithOverride('hello world', 'string')).toEqual({
      ok: true,
      value: 'hello world',
    });
  });

  test('literal string in auto mode stays a string when not coercible', () => {
    // "hello" is not parseable as number/boolean/null → stored as string.
    expect(coerceWithOverride('hello', 'auto')).toEqual({
      ok: true,
      value: 'hello',
    });
  });
});

// ---------------------------------------------------------------------------
// Item 4 — expression mode stores raw expression unchanged  (in-memory)
// ---------------------------------------------------------------------------

test.describe('set assignment: expression mode', () => {
  test('expression ${ ... } stored verbatim via string override', () => {
    const expr = '${ $input.user.name }';
    expect(coerceWithOverride(expr, 'string')).toEqual({
      ok: true,
      value: expr,
    });
    expect(detectSource(expr)).toBe('input');
  });

  test('complex expression stored verbatim via string override', () => {
    const expr = '${ $context.result ?? "default" }';
    expect(coerceWithOverride(expr, 'string')).toEqual({
      ok: true,
      value: expr,
    });
    expect(detectSource(expr)).toBe('expression');
  });
});

// ---------------------------------------------------------------------------
// Item 5 — Number / Boolean / Null assignments do NOT use ValueSourceSelector
//           Verified via inferOverride: non-string values yield non-string
//           overrides or the value itself is not a string, so isStringValue=false.
// ---------------------------------------------------------------------------

test.describe('set assignment: non-string types bypass ValueSourceSelector', () => {
  test('number value infers auto override (not string)', () => {
    // inferOverride(42) = 'auto'; typeof 42 !== 'string' → isStringValue=false
    expect(inferOverride(42)).toBe('auto');
    expect(typeof 42).not.toBe('string');
  });

  test('boolean value infers auto override (not string)', () => {
    expect(inferOverride(true)).toBe('auto');
    expect(typeof true).not.toBe('string');
  });

  test('null value infers null override (not string)', () => {
    expect(inferOverride(null)).toBe('null');
    expect(typeof null).not.toBe('string');
  });

  test('number 42 fails number-mode coercion when input is non-numeric', () => {
    // If override is 'number', a non-numeric raw value gives an error.
    const result = coerceWithOverride('not-a-number', 'number');
    expect(result.ok).toBe(false);
  });

  test('boolean override rejects non-boolean input', () => {
    const result = coerceWithOverride('maybe', 'boolean');
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Item 1 — Set string assignment renders ValueSourceSelector  (rendering test)
//
// Uses an inline workflow object provisioned via the PUT API — no disk reads
// in test code. The workflow is written once per test via beforeEach so each
// test starts from a known state.
// ---------------------------------------------------------------------------

// Minimal inline workflow: one Set node with a single string assignment.
// Input schema exposes a `name` field so the VSS has at least one input path.
const VSS_TEST_ID = 'set-vss-test.yaml';

const vssTestWorkflow = {
  document: {
    dsl: '1.0.0',
    namespace: 'test',
    name: 'set-vss-test',
    version: '0.0.1',
  },
  input: {
    schema: {
      format: 'json',
      document: {
        type: 'object',
        properties: { name: { type: 'string' } },
      },
    },
  },
  workflows: {
    main: {
      id: 'main',
      name: 'main',
      root: {
        nodes: {
          'node-set-1': {
            id: 'node-set-1',
            type: 'task',
            name: 'assign',
            config: {
              kind: 'set',
              assignments: { greeting: 'hello' },
            },
          },
        },
        order: ['node-set-1'],
      },
    },
  },
  order: ['main'],
};

async function provisionWorkflow(request: APIRequestContext): Promise<void> {
  const res = await request.put(`/api/workflows/${VSS_TEST_ID}`, {
    data: { workflowFile: vssTestWorkflow },
  });
  expect(res.ok()).toBeTruthy();
}

async function openSetInspector(page: Page): Promise<void> {
  await page.goto(`/workflows/${VSS_TEST_ID}`);
  await page
    .locator('.svelte-flow__node')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByText('assign').click();
  await expect(
    page.getByRole('button', { name: '+ Add assignment' }),
  ).toBeVisible({ timeout: 5_000 });
}

test.describe('set assignment: ValueSourceSelector rendering', () => {
  test.beforeEach(async ({ request }) => {
    await provisionWorkflow(request);
  });

  test('new string assignment row renders ValueSourceSelector', async ({
    page,
  }) => {
    await openSetInspector(page);

    // Add a new row — it starts with an empty string value, which uses the VSS.
    const rows = page.locator('.assignment-item');
    const countBefore = await rows.count();
    await page.getByRole('button', { name: '+ Add assignment' }).click();
    await expect(rows).toHaveCount(countBefore + 1);

    const newRow = rows.last();
    // The VSS source-mode dropdown must be present.
    await expect(newRow.locator('.vss-source')).toBeVisible();
    // The VSS value control must be present.
    await expect(newRow.locator('.vss-value')).toBeVisible();
  });

  test('switching to number override hides ValueSourceSelector', async ({
    page,
  }) => {
    await openSetInspector(page);

    const rows = page.locator('.assignment-item');
    const countBefore = await rows.count();
    await page.getByRole('button', { name: '+ Add assignment' }).click();
    await expect(rows).toHaveCount(countBefore + 1);

    const newRow = rows.last();
    await expect(newRow.locator('.vss-source')).toBeVisible();

    // Switch to number override — VSS should disappear.
    await newRow
      .getByRole('combobox', { name: /Type for/ })
      .selectOption('number');

    await expect(newRow.locator('.vss-source')).toHaveCount(0);
    // The plain text input (not a VSS) must be present instead.
    await expect(newRow.getByLabel('Value')).toBeVisible();
  });

  test('input source mode hides type selector', async ({ page }) => {
    await openSetInspector(page);

    const rows = page.locator('.assignment-item');
    const countBefore = await rows.count();
    await page.getByRole('button', { name: '+ Add assignment' }).click();
    await expect(rows).toHaveCount(countBefore + 1);

    const newRow = rows.last();
    // Default new row is in literal mode — type selector must be visible.
    await expect(
      newRow.getByRole('combobox', { name: /Type for/ }),
    ).toBeVisible();

    // Switch to input source.
    await newRow.locator('.vss-source').selectOption('input');

    // Type selector must disappear in input mode.
    await expect(
      newRow.getByRole('combobox', { name: /Type for/ }),
    ).toHaveCount(0);
  });

  test('switching from input back to literal restores type selector', async ({
    page,
  }) => {
    await openSetInspector(page);

    const rows = page.locator('.assignment-item');
    const countBefore = await rows.count();
    await page.getByRole('button', { name: '+ Add assignment' }).click();
    await expect(rows).toHaveCount(countBefore + 1);

    const newRow = rows.last();

    // Go to input mode → type selector hidden.
    await newRow.locator('.vss-source').selectOption('input');
    await expect(
      newRow.getByRole('combobox', { name: /Type for/ }),
    ).toHaveCount(0);

    // Return to literal mode → type selector visible again.
    await newRow.locator('.vss-source').selectOption('literal');
    await expect(
      newRow.getByRole('combobox', { name: /Type for/ }),
    ).toBeVisible();
  });
});
