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

<!--
  FlowNode — custom Svelte Flow node registered as nodeType 'flow'.

  Task nodes: horizontal layout with type badge and name.

  Structural nodes (switch, fork, try, loop): vertical layout with a fixed
  header row followed by clickable navigation rows — one per branch or section.
  Clicking a row calls the curried callback supplied by Canvas via node data.
  Buttons use `stopPropagation` to prevent SvelteFlow from also handling the
  click, and carry the `nodrag` class so dragging cannot start on them.

  Node dimensions are set by Canvas via the `style` prop on the SvelteFlow
  node spec; this component fills 100% of that wrapper.
-->

<script lang="ts">
  import { t } from '$lib/i18n/index.svelte';
  import { Handle, Position } from '@xyflow/svelte';
  import { getContext } from 'svelte';

  import type { CanvasCallbacks } from './canvas-context';
  import { CANVAS_CALLBACKS_KEY } from './canvas-context';

  // ---------------------------------------------------------------------------
  // Data shape populated by Canvas.buildNodeData — plain data only, no
  // functions, so structuredClone succeeds and SvelteFlow doesn't warn.
  // ---------------------------------------------------------------------------

  type NavRow = {
    id: string;
    label: string;
    // 'enter' = loop body; 'branch' = switch/fork/try named sub-graph.
    kind: 'enter' | 'branch';
  };

  type NodeData = {
    label: string;
    nodeType: string; // 'task' | 'switch' | 'fork' | 'try' | 'loop'
    typeLabel: string;
    navRows?: NavRow[];
    // Loop nodes only: the 'in' collection expression shown under the header.
    loopExpression?: string;
  };

  interface Props {
    id: string;
    data: NodeData;
    selected?: boolean;
  }

  let { id, data, selected = false }: Props = $props();

  // Callbacks are resolved from context set by Canvas, not passed through node
  // data, to keep node data functions-free.
  const cb = getContext<CanvasCallbacks>(CANVAS_CALLBACKS_KEY);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const isStructural = $derived(data.nodeType !== 'task');

  function accentColor(type: string): string {
    switch (type) {
      case 'switch':
        return '#ea580c';
      case 'fork':
        return '#2563eb';
      case 'try':
        return '#dc2626';
      case 'loop':
        return '#16a34a';
      default:
        return '#7c3aed'; // task → Zigflow purple
    }
  }

  // Inline SVG icons (lucide-style, 12×12, stroke-based).
  // Strings are static source-code constants — no user input, no XSS risk.
  function nodeIcon(type: string): string {
    const a =
      'width="12" height="12" viewBox="0 0 16 16" fill="none" ' +
      'stroke="currentColor" stroke-width="1.5" ' +
      'stroke-linecap="round" stroke-linejoin="round"';
    switch (type) {
      case 'switch':
        // shuffle / decision arrows
        return (
          `<svg ${a}>` +
          '<path d="M2 5h10"/><path d="M8 2l4 3-4 3"/>' +
          '<path d="M2 11h10"/><path d="M6 8l-4 3 4 3"/>' +
          '</svg>'
        );
      case 'fork':
        // git-branch
        return (
          `<svg ${a}>` +
          '<circle cx="5" cy="4" r="1.5"/>' +
          '<circle cx="5" cy="12" r="1.5"/>' +
          '<circle cx="11" cy="7" r="1.5"/>' +
          '<line x1="5" y1="5.5" x2="5" y2="10.5"/>' +
          '<path d="M5 5.5C5 7.5 7 8.5 11 8.5"/>' +
          '</svg>'
        );
      case 'try':
        // shield
        return (
          `<svg ${a}>` +
          '<path d="M8 2L2 5v4c0 2.8 2.3 4.7 6 5.5 3.7-.8 6-2.7 6-5.5V5z"/>' +
          '</svg>'
        );
      case 'loop':
        // repeat / refresh
        return (
          `<svg ${a}>` +
          '<path d="M2 8a6 6 0 1 1 1.2 3.6"/>' +
          '<polyline points="2 12 2 8 6 8"/>' +
          '</svg>'
        );
      default:
        // task → zap / lightning
        return `<svg ${a}>` + '<path d="M9 2L4 9h5l-2 5 7-7H9z"/>' + '</svg>';
    }
  }
</script>

<div
  class="flow-node"
  class:flow-node--structural={isStructural}
  class:flow-node--selected={selected}
  style="--accent: {accentColor(data.nodeType)}"
  onclick={() => cb?.onselect(id)}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') cb?.onselect(id);
  }}
  role="button"
  tabindex="0"
>
  <Handle type="target" position={Position.Top} />

  {#if isStructural}
    <!-- Structural layout: fixed header + clickable nav rows -->
    <div class="flow-node-header">
      <!-- eslint-disable svelte/no-at-html-tags -- nodeIcon returns a hardcoded static SVG string; no user input, no XSS risk -->
      <span class="flow-node-icon" aria-hidden="true"
        >{@html nodeIcon(data.nodeType)}</span
      >
      <!-- eslint-enable svelte/no-at-html-tags -->
      <span class="flow-node-type">{data.typeLabel}</span>
      <span class="flow-node-name">{data.label}</span>
    </div>

    {#if data.loopExpression !== undefined}
      <div class="flow-node-loop-expr">
        <span class="flow-node-loop-for" aria-hidden="true"
          >{t('node.loop.for')}</span
        >
        <span class="flow-node-loop-expr-val">{data.loopExpression}</span>
      </div>
    {/if}

    {#if data.navRows && data.navRows.length > 0}
      <ul class="flow-node-rows" role="list">
        {#each data.navRows as row (row.id)}
          <li>
            <button
              class="flow-node-row nodrag"
              type="button"
              onclick={(e) => {
                e.stopPropagation();
                if (row.kind === 'enter') cb?.onenternode(id);
                else cb?.onenterbranch(id, row.id);
              }}
            >
              <span class="flow-node-row-arrow" aria-hidden="true">→</span>
              {row.label}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  {:else}
    <!-- Task layout: icon + stacked type/name -->
    <div class="flow-node-body">
      <!-- eslint-disable svelte/no-at-html-tags -- nodeIcon returns a hardcoded static SVG string; no user input, no XSS risk -->
      <span class="flow-node-icon" aria-hidden="true"
        >{@html nodeIcon(data.nodeType)}</span
      >
      <!-- eslint-enable svelte/no-at-html-tags -->
      <div class="flow-node-body-text">
        <span class="flow-node-type">{data.typeLabel}</span>
        <span class="flow-node-name" data-selected={selected ? 'true' : null}
          >{data.label}</span
        >
      </div>
    </div>
  {/if}

  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  /* -------------------------------------------------------------------------
     Base card
  ------------------------------------------------------------------------- */

  .flow-node {
    width: 100%;
    height: 100%;
    background: var(--zf-node-bg);
    border: 1px solid var(--zf-node-border);
    border-left: 4px solid var(--accent);
    border-radius: var(--zf-radius-md);
    box-sizing: border-box;
    display: flex;
    align-items: center;
    overflow: hidden;
    font-family: var(--zf-font);
    font-size: 0.75rem;
    color: var(--zf-text-primary);
    cursor: pointer;
    box-shadow: var(--zf-shadow-sm);
    transition:
      box-shadow 0.12s,
      border-color 0.12s;
  }

  .flow-node--structural {
    flex-direction: column;
    align-items: stretch;
    background: var(--zf-node-bg-structural);
  }

  .flow-node--selected {
    border-color: var(--accent);
    box-shadow:
      var(--zf-shadow-sm),
      0 0 0 3px rgba(var(--zf-accent-rgb), 0.18);
  }

  /* -------------------------------------------------------------------------
     Task layout — icon + stacked text
  ------------------------------------------------------------------------- */

  .flow-node-body {
    padding: 0 0.75rem;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    flex: 1;
  }

  .flow-node-body-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    flex: 1;
  }

  /* -------------------------------------------------------------------------
     Structural layout — header + rows
  ------------------------------------------------------------------------- */

  .flow-node-header {
    height: 30px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0 0.625rem;
    border-bottom: 1px solid var(--zf-border-muted);
    background: var(--zf-node-bg);
  }

  .flow-node-rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .flow-node-row {
    height: 22px;
    width: 100%;
    padding: 0 0.625rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: transparent;
    border: none;
    border-top: 1px solid var(--zf-border-muted);
    cursor: pointer;
    font-size: 0.7rem;
    color: var(--zf-text-secondary);
    font-family: inherit;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background 0.08s;
  }

  .flow-node-row:hover {
    background: var(--zf-accent-soft);
    color: var(--zf-accent);
  }

  .flow-node-row-arrow {
    color: var(--accent);
    flex-shrink: 0;
    font-size: 0.65rem;
    opacity: 0.7;
  }

  /* -------------------------------------------------------------------------
     Icon
  ------------------------------------------------------------------------- */

  .flow-node-icon {
    color: var(--accent);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    opacity: 0.85;
  }

  /* -------------------------------------------------------------------------
     Type badge + name (shared)
  ------------------------------------------------------------------------- */

  .flow-node-type {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--accent);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;
    opacity: 0.9;
  }

  .flow-node-name {
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--zf-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* -------------------------------------------------------------------------
     Loop expression line
  ------------------------------------------------------------------------- */

  .flow-node-loop-expr {
    height: 22px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0 0.625rem;
    border-bottom: 1px solid var(--zf-border-muted);
    overflow: hidden;
    background: var(--zf-node-bg-structural);
  }

  .flow-node-loop-for {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: lowercase;
    letter-spacing: 0.04em;
    color: var(--accent);
    flex-shrink: 0;
  }

  .flow-node-loop-expr-val {
    font-size: 0.68rem;
    font-family: 'Courier New', monospace;
    color: var(--zf-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
</style>
