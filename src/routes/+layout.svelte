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
  import favicon from '$lib/assets/favicon.ico';
  import { initI18n, t } from '$lib/i18n/index.svelte';
  import type { Locale } from '$lib/i18n/locales';
  import { onMount } from 'svelte';

  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps = $props();

  let localeOverride = $state<Locale | null>(null);
  let currentLocale = $derived<Locale>(
    (localeOverride ?? data.locale) as Locale,
  );

  // Initialise i18next client-side with the locale resolved by the server.
  // Using onMount avoids hydration mismatches: SSR renders keys which Svelte
  // patches to translated strings after mount.
  onMount(() => {
    initI18n(data.locale);
  });

  function handleLocaleChange(e: Event): void {
    const newLocale = (e.target as HTMLSelectElement).value as Locale;
    localeOverride = newLocale;
    document.cookie = `studio_locale=${newLocale}; path=/; max-age=31536000`;
    initI18n(newLocale);
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
  <div class="app-content">
    {@render children()}
  </div>
  <footer class="app-footer">
    <select
      class="locale-select"
      aria-label={t('editor.language')}
      value={currentLocale}
      onchange={handleLocaleChange}
    >
      <option value="en">{t('editor.localeEn')}</option>
      <option value="en-GB">{t('editor.localeEnGb')}</option>
    </select>
  </footer>
</div>

<style>
  /* =========================================================================
     ZIGFLOW DESIGN TOKENS
     All UI colours, shadows, and radii are defined here as CSS custom
     properties.  Components reference var(--zf-*) throughout; swapping
     light ↔ dark is handled by the @media block below.
  ========================================================================= */

  :global(html) {
    /* --- Surfaces -------------------------------------------------------- */
    --zf-bg: #f4f4f6;
    --zf-panel-bg: #ffffff;
    --zf-surface: #fafafa;
    --zf-surface-hover: #f4f4f5;

    /* --- Node card ------------------------------------------------------- */
    --zf-node-bg: #ffffff;
    --zf-node-bg-structural: #fafafa;
    --zf-node-border: #e4e4e7;

    /* --- Borders --------------------------------------------------------- */
    --zf-border: #e4e4e7;
    --zf-border-strong: #d4d4d8;
    --zf-border-muted: #f0f0f2;

    /* --- Typography ------------------------------------------------------ */
    --zf-text-primary: #18181b;
    --zf-text-secondary: #52525b;
    --zf-text-muted: #a1a1aa;
    --zf-font:
      system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

    /* --- Brand accent (Zigflow purple) ----------------------------------- */
    --zf-accent: #7c3aed;
    --zf-accent-hover: #6d28d9;
    --zf-accent-soft: #f3f0ff;
    --zf-accent-border: #ddd6fe;
    --zf-accent-rgb: 124, 58, 237;

    /* --- Node type rails ------------------------------------------------- */
    --zf-task-color: #7c3aed;
    --zf-switch-color: #ea580c;
    --zf-fork-color: #2563eb;
    --zf-try-color: #dc2626;
    --zf-loop-color: #16a34a;

    /* --- Shadows --------------------------------------------------------- */
    --zf-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
    --zf-shadow-sm:
      0 1px 4px rgba(0, 0, 0, 0.07), 0 1px 2px rgba(0, 0, 0, 0.04);
    --zf-shadow-md:
      0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
    --zf-shadow-lg:
      0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06);

    /* --- Border radii ---------------------------------------------------- */
    --zf-radius-sm: 4px;
    --zf-radius-md: 8px;
    --zf-radius-lg: 12px;

    /* --- Destructive ----------------------------------------------------- */
    --zf-danger: #dc2626;
    --zf-danger-soft: #fef2f2;
    --zf-danger-border: #fecaca;
  }

  /* -------------------------------------------------------------------------
     Dark mode — overrides the tokens above when the OS prefers dark.
  ------------------------------------------------------------------------- */
  @media (prefers-color-scheme: dark) {
    :global(html) {
      --zf-bg: #111114;
      --zf-panel-bg: #18181b;
      --zf-surface: #1a1a1f;
      --zf-surface-hover: #27272a;

      --zf-node-bg: #1f1f26;
      --zf-node-bg-structural: #1a1a21;
      --zf-node-border: #32323a;

      --zf-border: #27272a;
      --zf-border-strong: #3f3f46;
      --zf-border-muted: #1f1f23;

      --zf-text-primary: #f4f4f5;
      --zf-text-secondary: #a1a1aa;
      --zf-text-muted: #71717a;

      --zf-accent: #8b8dfc;
      --zf-accent-hover: #a5b4fc;
      --zf-accent-soft: #1e1b2e;
      --zf-accent-border: #3730a3;
      --zf-accent-rgb: 139, 141, 252;

      --zf-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.2);
      --zf-shadow-sm:
        0 1px 4px rgba(0, 0, 0, 0.24), 0 1px 2px rgba(0, 0, 0, 0.16);
      --zf-shadow-md:
        0 4px 12px rgba(0, 0, 0, 0.32), 0 2px 4px rgba(0, 0, 0, 0.16);
      --zf-shadow-lg:
        0 8px 24px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.2);

      --zf-danger: #f87171;
      --zf-danger-soft: #1f0f0f;
      --zf-danger-border: #7f1d1d;
    }
  }

  /* -------------------------------------------------------------------------
     Global resets
  ------------------------------------------------------------------------- */

  :global(html),
  :global(body) {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
    font-family: var(--zf-font);
    color: var(--zf-text-primary);
    background: var(--zf-bg);
  }

  :global(*),
  :global(*::before),
  :global(*::after) {
    box-sizing: border-box;
  }

  /* -------------------------------------------------------------------------
     App shell
  ------------------------------------------------------------------------- */

  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .app-content {
    flex: 1;
    overflow: hidden;
  }

  .app-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0.25rem 0.75rem;
    border-top: 1px solid var(--zf-border);
    background: var(--zf-panel-bg);
    flex-shrink: 0;
  }

  .locale-select {
    padding: 0.2rem 0.4rem;
    border: 1px solid var(--zf-border);
    border-radius: var(--zf-radius-sm);
    background: var(--zf-panel-bg);
    font-size: 0.75rem;
    color: var(--zf-text-secondary);
    cursor: pointer;
  }
</style>
