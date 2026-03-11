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
import { exportToYaml } from '$lib/export/yaml';
import { WORKFLOWS_DIR } from '$lib/server/workflows-dir';
import type { WorkflowFile } from '$lib/tasks/model';
import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request }) => {
  const fileName = params.workflowId;

  // Enforce .yaml / .yml extension.
  if (!fileName.endsWith('.yaml') && !fileName.endsWith('.yml')) {
    return json(
      { ok: false, error: 'File must have a .yaml or .yml extension' },
      { status: 400 },
    );
  }

  // Validate path is inside WORKFLOWS_DIR — prevent path traversal.
  const filePath = resolve(WORKFLOWS_DIR, fileName);
  if (!filePath.startsWith(WORKFLOWS_DIR + '/') && filePath !== WORKFLOWS_DIR) {
    return json({ ok: false, error: 'Invalid workflow path' }, { status: 400 });
  }

  // Parse JSON body.
  let workflowFile: WorkflowFile;
  try {
    const body: unknown = await request.json();
    if (
      typeof body !== 'object' ||
      body === null ||
      !('workflowFile' in body)
    ) {
      return json(
        { ok: false, error: 'Missing workflowFile in request body' },
        { status: 400 },
      );
    }
    workflowFile = (body as { workflowFile: WorkflowFile }).workflowFile;
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  // Export WorkflowFile → YAML (also validates the graph).
  const exportResult = exportToYaml(workflowFile);
  if (!exportResult.ok) {
    return json(
      { ok: false, error: `Export failed: ${exportResult.errors.join('; ')}` },
      { status: 400 },
    );
  }

  // Atomic write: write to a temp file then rename so readers never see a
  // partial file.
  const dir = dirname(filePath);
  const tempPath = resolve(dir, `.${basename(filePath)}.tmp.${randomUUID()}`);
  try {
    await fs.writeFile(tempPath, exportResult.yaml, 'utf-8');
    await fs.rename(tempPath, filePath);
  } catch (err) {
    // Best-effort cleanup of the temp file.
    await fs.unlink(tempPath).catch(() => undefined);
    return json(
      { ok: false, error: `Write failed: ${String(err)}` },
      { status: 500 },
    );
  }

  return json({ ok: true });
};
