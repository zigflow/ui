<!--
  ~ Copyright 2025 - 2026 Zigflow authors <https://github.com/zigflow/studio/graphs/contributors>
  ~
  ~ Licensed under the Apache License, Version 2.0 (the "License");
  ~ you may not use this file except in compliance with the License.
  ~ You may obtain a copy of the License at
  ~
  ~     http://www.apache.org/licenses/LICENSE-2.0
  ~
  ~ Unless required by applicable law or agreed to in writing, software
  ~ distributed under the License is distributed on an "AS IS" BASIS,
  ~ WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  ~ See the License for the specific language governing permissions and
  ~ limitations under the License.
-->

<script lang="ts">
  import { t } from '$lib/i18n/index.svelte';
  import { referencedWorkflowNames } from '$lib/tasks/actions';
  import type { WorkflowFile } from '$lib/tasks/model';
  import { TASK_REGISTRY } from '$lib/tasks/registry';

  // ---------------------------------------------------------------------------
  // Props & events
  // ---------------------------------------------------------------------------

  interface Props {
    file: WorkflowFile;
    selectedWorkflowId: string;
    onworkflowselect?: (id: string) => void;
    onaddworkflow?: () => void;
    onworkflowdelete?: (id: string) => void;
    onworkflowrename?: (id: string, newName: string) => void;
  }

  let {
    file,
    selectedWorkflowId,
    onworkflowselect,
    onaddworkflow,
    onworkflowdelete,
    onworkflowrename,
  }: Props = $props();

  // ---------------------------------------------------------------------------
  // Workflow reference analysis
  // ---------------------------------------------------------------------------

  const usedWorkflowNames = $derived(referencedWorkflowNames(file));

  function isDeletable(id: string): boolean {
    if (file.order.length <= 1) return false;
    const wf = file.workflows[id];
    if (!wf) return false;
    return !usedWorkflowNames.has(wf.name);
  }

  function deleteBlockedReason(id: string): string {
    if (file.order.length <= 1) return t('sidebar.workflow.deleteLastBlocked');
    const wf = file.workflows[id];
    if (wf && usedWorkflowNames.has(wf.name))
      return t('sidebar.workflow.deleteInUse');
    return '';
  }

  // ---------------------------------------------------------------------------
  // Rename state
  // ---------------------------------------------------------------------------

  let editingId = $state<string | null>(null);
  let editingName = $state('');

  function focusInput(el: HTMLElement) {
    el.focus();
    if (el instanceof HTMLInputElement) el.select();
  }

  function handleRenameClick(id: string): void {
    editingId = id;
    editingName = file.workflows[id]?.name ?? '';
  }

  function handleRenameCommit(): void {
    const id = editingId;
    editingId = null;
    if (!id) return;
    const trimmed = editingName.trim();
    if (!trimmed || trimmed === file.workflows[id]?.name) return;
    onworkflowrename?.(id, trimmed);
  }

  function handleRenameKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') handleRenameCommit();
    if (e.key === 'Escape') editingId = null;
  }

  // ---------------------------------------------------------------------------
  // Delete confirmation state
  // ---------------------------------------------------------------------------

  let confirmDeleteId = $state<string | null>(null);

  function handleDeleteClick(id: string): void {
    if (!isDeletable(id)) return; // blocked — button is disabled
    confirmDeleteId = id;
  }

  function handleConfirmDelete(): void {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    confirmDeleteId = null;
    onworkflowdelete?.(id);
  }

  function handleCancelDelete(): void {
    confirmDeleteId = null;
  }

  // ---------------------------------------------------------------------------
  // Palette — split registry into two groups
  // ---------------------------------------------------------------------------

  function byLabel(
    a: (typeof TASK_REGISTRY)[number],
    b: (typeof TASK_REGISTRY)[number],
  ): number {
    return t(a.labelKey).localeCompare(t(b.labelKey));
  }

  const taskItems = $derived(
    TASK_REGISTRY.filter((d) => d.category === 'task').sort(byLabel),
  );
  const controlItems = $derived(
    TASK_REGISTRY.filter((d) => d.category === 'control').sort(byLabel),
  );

  function handleDragStart(event: DragEvent, nodeType: string) {
    event.dataTransfer?.setData('application/node-type', nodeType);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
  }
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && confirmDeleteId) handleCancelDelete();
  }}
/>

<nav class="sidebar">
  <!-- Document metadata -->
  <header class="sidebar-header">
    <p class="sidebar-label">{t('sidebar.document')}</p>
    <h1 class="sidebar-doc-name">{file.document.name}</h1>
    <p class="sidebar-doc-meta">
      {file.document.namespace} · v{file.document.version}
    </p>
  </header>

  <!-- Workflow list -->
  <section class="sidebar-section">
    <p class="sidebar-label">{t('sidebar.workflows')}</p>
    <ul class="workflow-list">
      {#each file.order as id (id)}
        {@const wf = file.workflows[id]}
        {#if wf}
          <li class="workflow-list-item">
            {#if editingId === id}
              <input
                class="workflow-rename-input"
                type="text"
                bind:value={editingName}
                onblur={handleRenameCommit}
                onkeydown={handleRenameKeydown}
                aria-label={t('sidebar.workflow.renameInput')}
                use:focusInput
              />
            {:else}
              <button
                class="workflow-item"
                class:workflow-item--selected={id === selectedWorkflowId}
                onclick={() => onworkflowselect?.(id)}
                type="button"
              >
                {wf.name}
              </button>
              <button
                class="workflow-action-btn"
                onclick={() => handleRenameClick(id)}
                title={t('sidebar.workflow.rename')}
                aria-label={t('sidebar.workflow.rename')}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="12"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.75"
                  viewBox="0 0 16 16"
                  width="12"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M11 2l3 3-8 8H3v-3z" />
                  <path d="M9.5 3.5l3 3" />
                </svg>
              </button>
              <button
                class="workflow-action-btn workflow-delete-btn"
                class:workflow-action-btn--disabled={!isDeletable(id)}
                disabled={!isDeletable(id)}
                onclick={() => handleDeleteClick(id)}
                title={isDeletable(id)
                  ? t('sidebar.workflow.delete')
                  : deleteBlockedReason(id)}
                aria-label={t('sidebar.workflow.delete')}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="12"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.75"
                  viewBox="0 0 16 16"
                  width="12"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <polyline points="2 4 14 4" />
                  <path d="M5 4V2h6v2" />
                  <path d="M3 4l1 10h8l1-10" />
                  <line x1="6.5" x2="6.5" y1="7" y2="11" />
                  <line x1="9.5" x2="9.5" y1="7" y2="11" />
                </svg>
              </button>
            {/if}
          </li>
        {/if}
      {/each}
    </ul>

    <button
      class="add-workflow-btn"
      onclick={() => onaddworkflow?.()}
      type="button"
    >
      {t('sidebar.addWorkflow')}
    </button>
  </section>

  <!-- Task palette -->
  <section class="sidebar-section palette-section">
    <p class="sidebar-label">{t('sidebar.tasks')}</p>
    <ul class="palette-list">
      {#each taskItems as def (def.type)}
        <li>
          <div
            class="palette-item"
            draggable="true"
            role="button"
            tabindex="0"
            title={def.description}
            ondragstart={(e) => handleDragStart(e, def.type)}
          >
            {t(def.labelKey)}
          </div>
        </li>
      {/each}
    </ul>

    <p class="sidebar-label palette-label-gap">{t('sidebar.controlFlow')}</p>
    <ul class="palette-list">
      {#each controlItems as def (def.type)}
        <li>
          <div
            class="palette-item palette-item--control"
            draggable="true"
            role="button"
            tabindex="0"
            title={def.description}
            ondragstart={(e) => handleDragStart(e, def.type)}
          >
            {t(def.labelKey)}
          </div>
        </li>
      {/each}
    </ul>
  </section>
</nav>

<!-- Delete confirmation dialog -->
{#if confirmDeleteId}
  <div
    class="delete-overlay"
    role="dialog"
    aria-modal="true"
    aria-label={t('sidebar.workflow.deleteConfirmTitle')}
  >
    <div class="delete-dialog">
      <h3 class="delete-dialog-title">
        {t('sidebar.workflow.deleteConfirmTitle')}
      </h3>
      <p class="delete-dialog-message">
        {t('sidebar.workflow.deleteConfirmMessage')}
      </p>
      <div class="delete-dialog-actions">
        <button
          class="delete-dialog-cancel"
          onclick={handleCancelDelete}
          type="button"
        >
          {t('sidebar.workflow.deleteCancel')}
        </button>
        <button
          class="delete-dialog-confirm"
          onclick={handleConfirmDelete}
          type="button"
        >
          {t('sidebar.workflow.deleteConfirm')}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* -------------------------------------------------------------------------
     Sidebar shell
  ------------------------------------------------------------------------- */

  .sidebar {
    width: 230px;
    min-width: 230px;
    border-right: 1px solid var(--zf-border);
    background: var(--zf-surface);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    font-family: var(--zf-font);
  }

  .sidebar-header {
    padding: 1rem;
    border-bottom: 1px solid var(--zf-border);
  }

  .sidebar-label {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--zf-text-muted);
    margin: 0 0 0.375rem 0;
  }

  .sidebar-doc-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--zf-text-primary);
    margin: 0 0 0.125rem 0;
    word-break: break-all;
  }

  .sidebar-doc-meta {
    font-size: 0.72rem;
    color: var(--zf-text-muted);
    margin: 0;
  }

  .sidebar-section {
    padding: 0.875rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .palette-section {
    flex: none;
    border-top: 1px solid var(--zf-border);
  }

  .palette-label-gap {
    margin-top: 0.5rem;
  }

  /* -------------------------------------------------------------------------
     Workflow list
  ------------------------------------------------------------------------- */

  .workflow-list,
  .palette-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .workflow-list-item {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .workflow-item {
    flex: 1;
    min-width: 0;
    text-align: left;
    padding: 0.375rem 0.625rem;
    border: 1px solid transparent;
    border-radius: var(--zf-radius-sm);
    background: transparent;
    font-size: 0.825rem;
    cursor: pointer;
    color: var(--zf-text-secondary);
    transition: background 0.1s;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: inherit;
  }

  .workflow-item:hover {
    background: var(--zf-surface-hover);
    color: var(--zf-text-primary);
  }

  .workflow-item--selected {
    background: var(--zf-accent-soft);
    border-color: var(--zf-accent-border);
    color: var(--zf-accent);
    font-weight: 500;
  }

  .workflow-rename-input {
    flex: 1;
    min-width: 0;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--zf-accent);
    border-radius: var(--zf-radius-sm);
    font-size: 0.825rem;
    color: var(--zf-text-primary);
    background: var(--zf-panel-bg);
    outline: none;
    box-shadow: 0 0 0 2px rgba(var(--zf-accent-rgb), 0.15);
    font-family: inherit;
  }

  /* -------------------------------------------------------------------------
     Workflow action buttons (rename / delete)
  ------------------------------------------------------------------------- */

  .workflow-action-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--zf-radius-sm);
    background: transparent;
    color: var(--zf-text-muted);
    cursor: pointer;
    opacity: 0;
    transition:
      opacity 0.1s,
      color 0.1s,
      background 0.1s;
  }

  .workflow-list-item:hover .workflow-action-btn {
    opacity: 1;
  }

  .workflow-action-btn:hover {
    color: var(--zf-text-primary);
    background: var(--zf-surface-hover);
    border-color: var(--zf-border);
  }

  .workflow-delete-btn:hover {
    color: var(--zf-danger);
    background: var(--zf-danger-soft);
    border-color: var(--zf-danger-border);
  }

  .workflow-action-btn--disabled {
    cursor: not-allowed;
    color: var(--zf-border-strong);
  }

  .workflow-action-btn--disabled:hover {
    color: var(--zf-border-strong);
    background: transparent;
    border-color: transparent;
  }

  /* -------------------------------------------------------------------------
     Add workflow
  ------------------------------------------------------------------------- */

  .add-workflow-btn {
    margin-top: auto;
    padding: 0.375rem 0.75rem;
    border: 1px dashed var(--zf-border-strong);
    border-radius: var(--zf-radius-sm);
    background: transparent;
    font-size: 0.78rem;
    color: var(--zf-text-muted);
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition:
      border-color 0.1s,
      color 0.1s,
      background 0.1s;
  }

  .add-workflow-btn:hover {
    border-color: var(--zf-accent);
    color: var(--zf-accent);
    background: var(--zf-accent-soft);
  }

  /* -------------------------------------------------------------------------
     Palette items — card style
  ------------------------------------------------------------------------- */

  .palette-item {
    padding: 0.35rem 0.625rem;
    border: 1px solid var(--zf-border);
    border-radius: var(--zf-radius-sm);
    background: var(--zf-panel-bg);
    font-size: 0.78rem;
    color: var(--zf-text-secondary);
    cursor: grab;
    user-select: none;
    box-shadow: var(--zf-shadow-xs);
    font-family: inherit;
    transition:
      border-color 0.1s,
      background 0.1s,
      box-shadow 0.1s;
  }

  .palette-item:hover {
    border-color: var(--zf-border-strong);
    background: var(--zf-surface-hover);
    box-shadow: var(--zf-shadow-sm);
    color: var(--zf-text-primary);
  }

  .palette-item:active {
    cursor: grabbing;
    box-shadow: var(--zf-shadow-xs);
  }

  .palette-item--control {
    border-color: var(--zf-accent-border);
    color: var(--zf-accent);
    background: var(--zf-accent-soft);
  }

  .palette-item--control:hover {
    border-color: var(--zf-accent);
    background: var(--zf-accent-soft);
    color: var(--zf-accent-hover);
  }

  /* -------------------------------------------------------------------------
     Confirmation modal
  ------------------------------------------------------------------------- */

  .delete-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
  }

  .delete-dialog {
    background: var(--zf-panel-bg);
    border: 1px solid var(--zf-border);
    border-radius: var(--zf-radius-lg);
    box-shadow: var(--zf-shadow-lg);
    padding: 1.5rem;
    max-width: 360px;
    width: 90%;
  }

  .delete-dialog-title {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    color: var(--zf-text-primary);
  }

  .delete-dialog-message {
    font-size: 0.875rem;
    color: var(--zf-text-secondary);
    margin: 0 0 1.25rem 0;
    line-height: 1.5;
  }

  .delete-dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .delete-dialog-cancel {
    padding: 0.375rem 0.875rem;
    border: 1px solid var(--zf-border);
    border-radius: var(--zf-radius-sm);
    background: var(--zf-panel-bg);
    font-size: 0.875rem;
    color: var(--zf-text-secondary);
    cursor: pointer;
    font-family: inherit;
    transition: background 0.1s;
  }

  .delete-dialog-cancel:hover {
    background: var(--zf-surface-hover);
  }

  .delete-dialog-confirm {
    padding: 0.375rem 0.875rem;
    border: 1px solid var(--zf-danger);
    border-radius: var(--zf-radius-sm);
    background: var(--zf-danger);
    font-size: 0.875rem;
    color: #fff;
    cursor: pointer;
    font-family: inherit;
    transition:
      background 0.1s,
      border-color 0.1s;
  }

  .delete-dialog-confirm:hover {
    background: #b91c1c;
    border-color: #b91c1c;
  }
</style>
