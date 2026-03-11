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
    type Node,
    RAISE_SPECIAL_TITLES,
    type RaiseConfig,
    type RaiseErrorDefinition,
    SW_ERROR_TYPES,
    type TaskNode,
  } from '$lib/tasks/model';

  interface Props {
    node: Node;
    onupdate: (node: Node) => void;
  }

  let { node, onupdate }: Props = $props();

  // Registry guarantees this editor only receives raise nodes.
  const taskNode = $derived(node as TaskNode);
  const config = $derived(taskNode.config as RaiseConfig);
  const definition = $derived(config.definition);

  // ---------------------------------------------------------------------------
  // Error kind: derived value representing what is selected in the dropdown.
  //
  // Values:
  //   - SW error type string (e.g. 'runtime')
  //   - 'go-panic'
  //   - 'temporal-non-retryable'
  //   - '' (nothing selected / no definition)
  // ---------------------------------------------------------------------------

  type KindKey = string; // SW_ERROR_TYPES[number] | 'go-panic' | 'temporal-non-retryable' | ''

  const selectedKind = $derived((): KindKey => {
    if (!definition) return '';
    if (definition.title === RAISE_SPECIAL_TITLES.goPanic) return 'go-panic';
    if (definition.title === RAISE_SPECIAL_TITLES.temporalNonRetryable)
      return 'temporal-non-retryable';
    return definition.type ?? '';
  });

  const isSpecialKind = $derived(
    selectedKind() === 'go-panic' ||
      selectedKind() === 'temporal-non-retryable',
  );

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Emit a full config update, creating the definition if it does not exist. */
  function emitDefinition(patch: Partial<RaiseErrorDefinition>): void {
    const base: RaiseErrorDefinition = definition ?? {
      type: 'runtime',
      title: '',
      detail: '',
    };
    const next: RaiseErrorDefinition = { ...base, ...patch };
    onupdate({ ...taskNode, config: { ...config, definition: next } });
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  function handleKindChange(value: string): void {
    if (value === 'go-panic') {
      emitDefinition({ title: RAISE_SPECIAL_TITLES.goPanic, type: undefined });
    } else if (value === 'temporal-non-retryable') {
      emitDefinition({
        title: RAISE_SPECIAL_TITLES.temporalNonRetryable,
        type: undefined,
      });
    } else if (value === '') {
      // No selection — do nothing; user can clear with the button.
    } else {
      // SW error type selected. Clear the special URI title if present.
      const currentTitle = definition?.title ?? '';
      const isCurrentTitleSpecial =
        currentTitle === RAISE_SPECIAL_TITLES.goPanic ||
        currentTitle === RAISE_SPECIAL_TITLES.temporalNonRetryable;
      emitDefinition({
        type: value,
        title: isCurrentTitleSpecial ? '' : currentTitle,
      });
    }
  }

  function handleTitleChange(value: string): void {
    emitDefinition({ title: value });
  }

  function handleDetailChange(value: string): void {
    emitDefinition({ detail: value === '' ? undefined : value });
  }

  function handleStatusChange(raw: string): void {
    if (raw.trim() === '') {
      emitDefinition({ status: undefined });
      return;
    }
    const n = parseInt(raw, 10);
    if (!isNaN(n)) {
      emitDefinition({ status: n });
    }
  }

  function handleClearDefinition(): void {
    onupdate({
      ...taskNode,
      config: { ...config, definition: undefined },
    });
  }
</script>

<div class="node-editor">
  <h3 class="editor-title">{t('inspector.raise.title')}</h3>

  {#if !definition}
    <p class="no-definition-hint">{t('inspector.raise.noDefinition')}</p>
  {/if}

  <!-- Error kind selector -->
  <div class="field-row">
    <label class="field-label" for="raise-kind">
      {t('inspector.raise.errorKind.label')}
    </label>
    <select
      id="raise-kind"
      class="field-select"
      value={selectedKind()}
      onchange={(e) => handleKindChange(e.currentTarget.value)}
    >
      <option value=""></option>
      <optgroup label={t('inspector.raise.errorKind.groupSw')}>
        {#each SW_ERROR_TYPES as swType (swType)}
          <option value={swType}>
            {t(`inspector.raise.errorKind.${swType}`)}
          </option>
        {/each}
      </optgroup>
      <optgroup label={t('inspector.raise.errorKind.groupSpecial')}>
        <option value="go-panic"
          >{t('inspector.raise.errorKind.goPanic')}</option
        >
        <option value="temporal-non-retryable"
          >{t('inspector.raise.errorKind.temporalNonRetryable')}</option
        >
      </optgroup>
    </select>
  </div>

  <!-- Title input -->
  <div class="field-row">
    <label class="field-label" for="raise-title">
      {t('inspector.raise.titleField.label')}
    </label>
    {#if isSpecialKind}
      <input
        id="raise-title"
        class="field-input field-input--readonly"
        type="text"
        readonly
        value={definition?.title ?? ''}
        aria-label={t('inspector.raise.titleField.label')}
      />
      <p class="field-hint">{t('inspector.raise.titleField.specialHint')}</p>
    {:else}
      <input
        id="raise-title"
        class="field-input"
        type="text"
        value={definition?.title ?? ''}
        aria-label={t('inspector.raise.titleField.label')}
        oninput={(e) => handleTitleChange(e.currentTarget.value)}
      />
    {/if}
  </div>

  <!-- Detail textarea -->
  <div class="field-row">
    <label class="field-label" for="raise-detail">
      {t('inspector.raise.detail.label')}
    </label>
    <textarea
      id="raise-detail"
      class="field-textarea"
      rows="3"
      value={definition?.detail ?? ''}
      aria-label={t('inspector.raise.detail.label')}
      oninput={(e) => handleDetailChange(e.currentTarget.value)}
    ></textarea>
  </div>

  <!-- Status input -->
  <div class="field-row">
    <label class="field-label" for="raise-status">
      {t('inspector.raise.status.label')}
    </label>
    <input
      id="raise-status"
      class="field-input"
      type="number"
      min="100"
      max="599"
      placeholder={t('inspector.raise.status.placeholder')}
      value={definition?.status ?? ''}
      aria-label={t('inspector.raise.status.label')}
      oninput={(e) => handleStatusChange(e.currentTarget.value)}
    />
  </div>

  {#if definition}
    <button class="clear-btn" type="button" onclick={handleClearDefinition}>
      {t('inspector.raise.clearDefinition')}
    </button>
  {/if}
</div>

<style>
  .node-editor {
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid #eee;
  }

  .editor-title {
    margin: 0 0 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #444;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .no-definition-hint {
    margin: 0 0 0.75rem;
    font-size: 0.8rem;
    color: #888;
    font-style: italic;
  }

  .field-row {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin-bottom: 0.625rem;
  }

  .field-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #666;
  }

  .field-select,
  .field-input,
  .field-textarea {
    width: 100%;
    padding: 0.2rem 0.375rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.8rem;
    font-family: inherit;
    color: #111;
    background: #fff;
    box-sizing: border-box;
  }

  .field-select:focus,
  .field-input:focus,
  .field-textarea:focus {
    outline: none;
    border-color: #1a56cc;
    box-shadow: 0 0 0 2px rgba(26, 86, 204, 0.15);
  }

  .field-input--readonly {
    background: #f5f5f5;
    color: #666;
    cursor: default;
  }

  .field-textarea {
    resize: vertical;
    min-height: 4rem;
  }

  .field-hint {
    margin: 0.1rem 0 0;
    font-size: 0.72rem;
    color: #888;
    font-style: italic;
  }

  .clear-btn {
    display: inline-block;
    margin-top: 0.25rem;
    padding: 0.2rem 0.5rem;
    font-size: 0.75rem;
    font-family: inherit;
    color: #b02020;
    background: transparent;
    border: 1px solid #e8b4b4;
    border-radius: 4px;
    cursor: pointer;
  }

  .clear-btn:hover {
    background: #fff0f0;
    border-color: #c0392b;
  }
</style>
