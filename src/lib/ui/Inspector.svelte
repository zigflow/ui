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
  import {
    addSwitchBranch,
    removeSwitchBranch,
    renameForkBranch,
    renameSwitchBranch,
    updateSwitchBranchCondition,
    updateSwitchBranchTarget,
  } from '$lib/tasks/actions';
  import type {
    ForkNode,
    NamedWorkflow,
    Node,
    SwitchNode,
  } from '$lib/tasks/model';

  import CommonFields from './inspector/CommonFields.svelte';
  import { getNodeEditor } from './node-editors/registry';

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    node: Node | null;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
    onmoveup?: () => void;
    onmovedown?: () => void;
    ondelete?: () => void;
    // Called when any node property is changed via the editor.
    onupdate?: (node: Node) => void;
    // Navigation into subgraphs
    onenternode?: (nodeId: string) => void; // loop body
    onenterbranch?: (nodeId: string, branchId: string) => void; // switch/fork/try
    // Branch management (fork only — switch uses onupdate directly)
    onaddbranch?: (nodeId: string) => void;
    onremovebranch?: (nodeId: string, branchId: string) => void;
    // Workflow list for switch branch target selection
    workflows?: NamedWorkflow[];
    currentWorkflowName?: string;
  }

  let {
    node,
    canMoveUp = false,
    canMoveDown = false,
    onmoveup,
    onmovedown,
    ondelete,
    onupdate,
    onenternode,
    onenterbranch,
    onaddbranch,
    onremovebranch,
    workflows = [],
    currentWorkflowName = '',
  }: Props = $props();

  // ---------------------------------------------------------------------------
  // Derived: look up the editor component for the current node.
  // ---------------------------------------------------------------------------

  const NodeEditor = $derived(node ? getNodeEditor(node) : null);

  // Narrowed switch node — used by the switch branch editing section.
  const switchNode = $derived(
    node !== null && node.type === 'switch' ? (node as SwitchNode) : null,
  );

  // Narrowed fork node — used by the fork branch editing section.
  const forkNode = $derived(
    node !== null && node.type === 'fork' ? (node as ForkNode) : null,
  );

  // Available target workflows: all except the current one.
  const targetWorkflows = $derived(
    workflows.filter((wf) => wf.name !== currentWorkflowName),
  );

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Fork branch rename state — follows Sidebar.svelte's inline-edit pattern.
  // ---------------------------------------------------------------------------

  let editingBranchId = $state<string | null>(null);
  let editingBranchLabel = $state('');

  function focusBranchInput(el: HTMLElement): void {
    el.focus();
    if (el instanceof HTMLInputElement) el.select();
  }

  function handleForkRenameClick(branchId: string, currentLabel: string): void {
    editingBranchId = branchId;
    editingBranchLabel = currentLabel;
  }

  function handleForkRenameCommit(): void {
    const branchId = editingBranchId;
    editingBranchId = null;
    if (!branchId || !forkNode) return;
    const trimmed = editingBranchLabel.trim();
    const existing = forkNode.branches.find((b) => b.id === branchId);
    if (!trimmed || trimmed === existing?.label) return;
    onupdate?.(renameForkBranch(forkNode, branchId, trimmed));
  }

  function handleForkRenameKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') handleForkRenameCommit();
    if (e.key === 'Escape') editingBranchId = null;
  }

  function handleNameChange(value: string): void {
    if (!node) return;
    onupdate?.({ ...node, name: value });
  }

  // ---------------------------------------------------------------------------
  // Switch branch helpers — call onupdate with the full updated SwitchNode.
  // ---------------------------------------------------------------------------

  function handleSwitchUpdate(updated: SwitchNode): void {
    onupdate?.(updated);
  }

  // ---------------------------------------------------------------------------
  // Delete task confirmation
  // ---------------------------------------------------------------------------

  let confirmingDelete = $state(false);
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && confirmingDelete) confirmingDelete = false;
  }}
/>

<aside class="inspector">
  {#if node === null}
    <p class="inspector-empty">{t('inspector.empty')}</p>
  {:else}
    <!-- -------------------------------------------------------------------
      CommonSection: editable name + read-only node ID.
    -------------------------------------------------------------------- -->
    <header class="inspector-header">
      <span class="inspector-type">{node.type}</span>
      <label class="field-label" for="inspector-node-name"
        >{t('inspector.name')}</label
      >
      <input
        id="inspector-node-name"
        class="name-input inspector-name"
        type="text"
        value={node.name}
        oninput={(e) => handleNameChange(e.currentTarget.value)}
      />
    </header>

    <section class="inspector-section">
      <dl>
        <dt>{t('inspector.nodeId')}</dt>
        <dd class="mono">{node.id}</dd>

        {#if node.type === 'task'}
          <dt>{t('inspector.kind')}</dt>
          <dd>{node.config.kind}</dd>
        {/if}
      </dl>
    </section>

    <!-- -------------------------------------------------------------------
      Switch branch editing — full per-branch form with name, condition,
      target workflow, and inline validation.
    -------------------------------------------------------------------- -->

    {#if switchNode}
      {@const hasDefault = switchNode.branches.some(
        (b) => b.condition === undefined,
      )}
      <section class="inspector-branches">
        <h3 class="inspector-section-title">
          {t('inspector.switch.branches')}
        </h3>

        {#each switchNode.branches as branch (branch.id)}
          {@const isDefault = branch.condition === undefined}
          {@const isDuplicate =
            switchNode.branches.filter((b) => b.label === branch.label).length >
            1}
          {@const emptyCondition = !isDefault && branch.condition === ''}
          {@const noTarget = !branch.thenWorkflowName}

          <div class="switch-branch-card" data-testid="switch-branch-card">
            <div class="switch-branch-card-header">
              {#if isDefault}
                <span class="switch-default-badge"
                  >{t('inspector.switch.defaultBranch')}</span
                >
              {:else}
                <span></span>
              {/if}
              {#if switchNode.branches.length > 1}
                <button
                  class="branch-remove-btn"
                  type="button"
                  aria-label={t('inspector.removeBranch', {
                    label: branch.label,
                  })}
                  onclick={() =>
                    handleSwitchUpdate(
                      removeSwitchBranch(switchNode, branch.id),
                    )}
                >
                  ✕
                </button>
              {/if}
            </div>

            <label class="field-label" for="branch-name-{branch.id}">
              {t('inspector.switch.branchName')}
            </label>
            <input
              id="branch-name-{branch.id}"
              class="text-input"
              type="text"
              aria-label={t('inspector.switch.branchName')}
              value={branch.label}
              oninput={(e) =>
                handleSwitchUpdate(
                  renameSwitchBranch(
                    switchNode,
                    branch.id,
                    e.currentTarget.value,
                  ),
                )}
            />
            {#if isDuplicate}
              <p class="field-warning">
                {t('inspector.switch.errorDuplicateName')}
              </p>
            {/if}

            {#if !isDefault}
              <label class="field-label" for="branch-cond-{branch.id}">
                {t('inspector.switch.condition')}
              </label>
              <input
                id="branch-cond-{branch.id}"
                class="text-input text-input--mono"
                type="text"
                aria-label={t('inspector.switch.condition')}
                value={branch.condition ?? ''}
                oninput={(e) =>
                  handleSwitchUpdate(
                    updateSwitchBranchCondition(
                      switchNode,
                      branch.id,
                      e.currentTarget.value,
                    ),
                  )}
              />
              {#if emptyCondition}
                <p class="field-warning">
                  {t('inspector.switch.errorEmptyCondition')}
                </p>
              {/if}
            {/if}

            <label class="field-label" for="branch-target-{branch.id}">
              {t('inspector.switch.targetWorkflow')}
            </label>
            <select
              id="branch-target-{branch.id}"
              class="select-input"
              aria-label={t('inspector.switch.targetWorkflow')}
              value={branch.thenWorkflowName ?? ''}
              onchange={(e) =>
                handleSwitchUpdate(
                  updateSwitchBranchTarget(
                    switchNode,
                    branch.id,
                    e.currentTarget.value || undefined,
                  ),
                )}
            >
              <option value="">—</option>
              {#each targetWorkflows as wf (wf.id)}
                <option value={wf.name}>{wf.name}</option>
              {/each}
            </select>
            {#if noTarget}
              <p class="field-warning">
                {t('inspector.switch.errorNoTarget')}
              </p>
            {/if}
          </div>
        {/each}

        <div class="switch-add-btns">
          <button
            class="branch-add-btn"
            type="button"
            onclick={() =>
              handleSwitchUpdate(addSwitchBranch(switchNode, 'new-branch', ''))}
          >
            {t('inspector.switch.addBranch')}
          </button>
          {#if !hasDefault}
            <button
              class="branch-add-btn"
              type="button"
              onclick={() =>
                handleSwitchUpdate(
                  addSwitchBranch(switchNode, 'default', undefined),
                )}
            >
              {t('inspector.switch.addDefaultBranch')}
            </button>
          {/if}
        </div>
      </section>
    {:else if forkNode}
      <section class="inspector-branches">
        <h3 class="inspector-section-title">{t('inspector.fork.branches')}</h3>
        <ul class="branch-list" role="list">
          {#each forkNode.branches as branch (branch.id)}
            {@const isDuplicate =
              forkNode.branches.filter((b) => b.label === branch.label).length >
              1}
            <li class="branch-item" class:branch-item--warn={isDuplicate}>
              {#if editingBranchId === branch.id}
                <input
                  class="branch-rename-input"
                  type="text"
                  bind:value={editingBranchLabel}
                  onblur={handleForkRenameCommit}
                  onkeydown={handleForkRenameKeydown}
                  aria-label={t('inspector.fork.renameBranch', {
                    label: branch.label,
                  })}
                  use:focusBranchInput
                />
              {:else}
                <button
                  class="branch-label-btn"
                  onclick={() => onenterbranch?.(forkNode.id, branch.id)}
                  type="button"
                >
                  {branch.label}
                </button>
                <button
                  class="branch-action-btn"
                  onclick={() => handleForkRenameClick(branch.id, branch.label)}
                  type="button"
                  aria-label={t('inspector.fork.renameBranch', {
                    label: branch.label,
                  })}
                >
                  <svg
                    aria-hidden="true"
                    fill="none"
                    height="11"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.75"
                    viewBox="0 0 16 16"
                    width="11"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M11 2l3 3-8 8H3v-3z" />
                    <path d="M9.5 3.5l3 3" />
                  </svg>
                </button>
                {#if forkNode.branches.length > 1}
                  <button
                    class="branch-action-btn branch-action-btn--delete"
                    onclick={() => onremovebranch?.(forkNode.id, branch.id)}
                    type="button"
                    aria-label={t('inspector.fork.deleteBranch', {
                      label: branch.label,
                    })}
                  >
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="11"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.75"
                      viewBox="0 0 16 16"
                      width="11"
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
                {#if isDuplicate}
                  <span class="branch-warning"
                    >{t('inspector.fork.errorDuplicateName')}</span
                  >
                {/if}
              {/if}
            </li>
          {/each}
        </ul>
        <button
          class="branch-add-btn"
          onclick={() => onaddbranch?.(forkNode.id)}
          type="button"
        >
          {t('inspector.fork.addBranch')}
        </button>
      </section>
    {:else if node.type === 'try'}
      <section class="inspector-branches">
        <h3 class="inspector-section-title">{t('inspector.sections')}</h3>
        <div class="try-sections">
          <button
            class="try-section-btn"
            onclick={() => onenterbranch?.(node.id, 'tryGraph')}
            type="button"
          >
            {t('inspector.enterTryBody')}
          </button>
          <button
            class="try-section-btn"
            onclick={() => onenterbranch?.(node.id, 'catchGraph')}
            type="button"
          >
            {t('inspector.enterCatchBlock')}
          </button>
        </div>
      </section>
    {:else if node.type === 'loop'}
      <section class="inspector-branches">
        <button
          class="loop-enter-btn"
          onclick={() => onenternode?.(node.id)}
          type="button"
        >
          {t('inspector.loop.enterBody')}
        </button>
      </section>
    {/if}

    <!-- Task-specific or structural property editor -->
    {#if NodeEditor}
      <NodeEditor {node} onupdate={(n) => onupdate?.(n)} />
    {/if}

    <!-- Common fields: if + metadata — present on all node types -->
    <CommonFields {node} onupdate={(n) => onupdate?.(n)} />

    <div class="move-row">
      <button
        class="move-btn"
        disabled={!canMoveUp}
        onclick={() => onmoveup?.()}
        type="button"
        aria-label={t('inspector.moveUpLabel')}
      >
        {t('inspector.moveUp')}
      </button>
      <button
        class="move-btn"
        disabled={!canMoveDown}
        onclick={() => onmovedown?.()}
        type="button"
        aria-label={t('inspector.moveDownLabel')}
      >
        {t('inspector.moveDown')}
      </button>
    </div>

    <button
      class="delete-btn"
      onclick={() => (confirmingDelete = true)}
      type="button"
    >
      {t('inspector.delete')}
    </button>
  {/if}
</aside>

{#if confirmingDelete}
  <div
    class="delete-overlay"
    role="dialog"
    aria-modal="true"
    aria-label={t('inspector.deleteConfirmTitle')}
  >
    <div class="delete-dialog">
      <h3 class="delete-dialog-title">{t('inspector.deleteConfirmTitle')}</h3>
      <p class="delete-dialog-message">
        {t('inspector.deleteConfirmMessage')}
      </p>
      <div class="delete-dialog-actions">
        <button
          class="delete-dialog-cancel"
          onclick={() => (confirmingDelete = false)}
          type="button"
        >
          {t('inspector.deleteCancel')}
        </button>
        <button
          class="delete-dialog-confirm"
          onclick={() => {
            confirmingDelete = false;
            ondelete?.();
          }}
          type="button"
        >
          {t('inspector.deleteConfirm')}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* -------------------------------------------------------------------------
     Inspector shell
  ------------------------------------------------------------------------- */

  .inspector {
    width: 268px;
    min-width: 268px;
    border-left: 1px solid var(--zf-border);
    background: var(--zf-panel-bg);
    display: flex;
    flex-direction: column;
    padding: 1rem;
    overflow-y: auto;
    font-size: 0.875rem;
    font-family: var(--zf-font);
    color: var(--zf-text-primary);
  }

  .inspector-empty {
    color: var(--zf-text-muted);
    font-style: italic;
    margin: 0;
  }

  /* -------------------------------------------------------------------------
     Node header
  ------------------------------------------------------------------------- */

  .inspector-header {
    margin-bottom: 1rem;
  }

  .inspector-type {
    display: inline-block;
    background: var(--zf-accent-soft);
    color: var(--zf-accent);
    border-radius: var(--zf-radius-sm);
    padding: 2px 7px;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 0.5rem;
  }

  .field-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--zf-text-muted);
    margin-bottom: 0.25rem;
  }

  .name-input {
    width: 100%;
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--zf-border);
    border-radius: var(--zf-radius-sm);
    font-size: 0.875rem;
    font-weight: 600;
    font-family: inherit;
    color: var(--zf-text-primary);
    background: var(--zf-panel-bg);
    box-sizing: border-box;
    transition: border-color 0.1s;
  }

  .name-input:focus {
    outline: none;
    border-color: var(--zf-accent);
    box-shadow: 0 0 0 2px rgba(var(--zf-accent-rgb), 0.15);
  }

  /* -------------------------------------------------------------------------
     Node ID section
  ------------------------------------------------------------------------- */

  .inspector-section {
    flex: 1;
  }

  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.25rem 0.75rem;
    margin: 0;
  }

  dt {
    color: var(--zf-text-muted);
    font-weight: 500;
    white-space: nowrap;
    font-size: 0.78rem;
  }

  dd {
    margin: 0;
    word-break: break-all;
    color: var(--zf-text-secondary);
    font-size: 0.78rem;
  }

  .mono {
    font-family: 'Courier New', monospace;
    font-size: 0.75em;
    color: var(--zf-text-muted);
  }

  /* -------------------------------------------------------------------------
     Branch / structural sections
  ------------------------------------------------------------------------- */

  .inspector-branches {
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--zf-border);
  }

  .inspector-section-title {
    margin: 0 0 0.5rem;
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--zf-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }

  /* -------------------------------------------------------------------------
     Switch branch cards
  ------------------------------------------------------------------------- */

  .switch-branch-card {
    border: 1px solid var(--zf-border);
    border-radius: var(--zf-radius-sm);
    padding: 0.5rem 0.6rem;
    margin-bottom: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    background: var(--zf-surface);
  }

  .switch-branch-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.2rem;
  }

  .switch-default-badge {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--zf-accent);
    background: var(--zf-accent-soft);
    border-radius: 3px;
    padding: 1px 5px;
  }

  /* -------------------------------------------------------------------------
     Form inputs
  ------------------------------------------------------------------------- */

  .text-input {
    width: 100%;
    padding: 0.25rem 0.4rem;
    border: 1px solid var(--zf-border);
    border-radius: var(--zf-radius-sm);
    font-size: 0.78rem;
    font-family: inherit;
    color: var(--zf-text-primary);
    background: var(--zf-panel-bg);
    box-sizing: border-box;
    margin-bottom: 0.2rem;
    transition: border-color 0.1s;
  }

  .text-input--mono {
    font-family: 'Courier New', monospace;
  }

  .text-input:focus {
    outline: none;
    border-color: var(--zf-accent);
    box-shadow: 0 0 0 2px rgba(var(--zf-accent-rgb), 0.15);
  }

  .select-input {
    width: 100%;
    padding: 0.25rem 0.4rem;
    border: 1px solid var(--zf-border);
    border-radius: var(--zf-radius-sm);
    font-size: 0.78rem;
    font-family: inherit;
    color: var(--zf-text-primary);
    background: var(--zf-panel-bg);
    box-sizing: border-box;
    margin-bottom: 0.2rem;
    transition: border-color 0.1s;
  }

  .select-input:focus {
    outline: none;
    border-color: var(--zf-accent);
    box-shadow: 0 0 0 2px rgba(var(--zf-accent-rgb), 0.15);
  }

  .field-warning {
    margin: 0 0 0.2rem;
    font-size: 0.7rem;
    color: #b45309;
  }

  .switch-add-btns {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    margin-top: 0.25rem;
  }

  /* -------------------------------------------------------------------------
     Fork branch list
  ------------------------------------------------------------------------- */

  .branch-list {
    list-style: none;
    margin: 0 0 0.5rem;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .branch-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .branch-label-btn {
    flex: 1;
    min-width: 0;
    padding: 0.25rem 0.5rem;
    background: var(--zf-accent-soft);
    border: 1px solid var(--zf-accent-border);
    border-radius: var(--zf-radius-sm);
    font-size: 0.78rem;
    font-family: inherit;
    color: var(--zf-accent);
    cursor: pointer;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background 0.1s;
  }

  .branch-label-btn:hover {
    background: var(--zf-accent-border);
    border-color: var(--zf-accent);
  }

  .branch-item--warn {
    flex-wrap: wrap;
  }

  .branch-warning {
    width: 100%;
    font-size: 0.7rem;
    color: #b45309;
  }

  .branch-rename-input {
    flex: 1;
    min-width: 0;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--zf-accent);
    border-radius: var(--zf-radius-sm);
    font-size: 0.78rem;
    font-family: inherit;
    outline: none;
    background: var(--zf-panel-bg);
    color: var(--zf-text-primary);
    box-shadow: 0 0 0 2px rgba(var(--zf-accent-rgb), 0.15);
  }

  .branch-action-btn {
    flex-shrink: 0;
    padding: 0.2rem 0.375rem;
    background: transparent;
    border: 1px solid var(--zf-border);
    border-radius: var(--zf-radius-sm);
    color: var(--zf-text-muted);
    cursor: pointer;
    line-height: 1;
    display: flex;
    align-items: center;
    transition: background 0.1s;
  }

  .branch-action-btn:hover {
    background: var(--zf-surface-hover);
    border-color: var(--zf-border-strong);
    color: var(--zf-text-primary);
  }

  .branch-action-btn--delete {
    border-color: var(--zf-danger-border);
    color: var(--zf-danger);
  }

  .branch-action-btn--delete:hover {
    background: var(--zf-danger-soft);
    border-color: var(--zf-danger);
  }

  .branch-remove-btn {
    padding: 0.2rem 0.375rem;
    background: transparent;
    border: 1px solid var(--zf-danger-border);
    border-radius: var(--zf-radius-sm);
    color: var(--zf-danger);
    font-size: 0.72rem;
    cursor: pointer;
    line-height: 1;
    transition: background 0.1s;
  }

  .branch-remove-btn:hover {
    background: var(--zf-danger-soft);
  }

  .branch-add-btn {
    width: 100%;
    padding: 0.3rem 0.5rem;
    background: transparent;
    border: 1px dashed var(--zf-border-strong);
    border-radius: var(--zf-radius-sm);
    color: var(--zf-text-muted);
    font-size: 0.78rem;
    font-family: inherit;
    cursor: pointer;
    text-align: center;
    transition:
      border-color 0.1s,
      color 0.1s,
      background 0.1s;
  }

  .branch-add-btn:hover {
    border-color: var(--zf-accent);
    color: var(--zf-accent);
    background: var(--zf-accent-soft);
  }

  /* Try / Loop navigation buttons */

  .try-sections {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .try-section-btn,
  .loop-enter-btn {
    width: 100%;
    padding: 0.35rem 0.6rem;
    background: var(--zf-surface);
    border: 1px solid var(--zf-border);
    border-radius: var(--zf-radius-sm);
    color: var(--zf-text-secondary);
    font-size: 0.78rem;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
  }

  .try-section-btn:hover,
  .loop-enter-btn:hover {
    background: var(--zf-accent-soft);
    border-color: var(--zf-accent-border);
    color: var(--zf-accent);
  }

  /* -------------------------------------------------------------------------
     Move / delete controls
  ------------------------------------------------------------------------- */

  .move-row {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .move-btn {
    flex: 1;
    padding: 0.375rem 0.5rem;
    background: transparent;
    border: 1px solid var(--zf-border);
    border-radius: var(--zf-radius-sm);
    color: var(--zf-text-secondary);
    font-size: 0.78rem;
    font-family: inherit;
    cursor: pointer;
    transition:
      background 0.1s,
      border-color 0.1s;
  }

  .move-btn:hover:not(:disabled) {
    background: var(--zf-surface-hover);
    border-color: var(--zf-border-strong);
    color: var(--zf-text-primary);
  }

  .move-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .delete-btn {
    margin-top: 0.75rem;
    width: 100%;
    padding: 0.375rem 0.75rem;
    background: transparent;
    border: 1px solid var(--zf-danger-border);
    border-radius: var(--zf-radius-sm);
    color: var(--zf-danger);
    font-size: 0.78rem;
    font-family: inherit;
    cursor: pointer;
    transition:
      background 0.1s,
      border-color 0.1s;
  }

  .delete-btn:hover {
    background: var(--zf-danger-soft);
    border-color: var(--zf-danger);
  }

  /* -------------------------------------------------------------------------
     Delete confirmation modal
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
    font-family: inherit;
    color: var(--zf-text-secondary);
    cursor: pointer;
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
    font-family: inherit;
    color: #fff;
    cursor: pointer;
    transition:
      background 0.1s,
      border-color 0.1s;
  }

  .delete-dialog-confirm:hover {
    background: #b91c1c;
    border-color: #b91c1c;
  }
</style>
