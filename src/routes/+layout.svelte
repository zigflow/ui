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
  :global(html),
  :global(body) {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
  }

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
    border-top: 1px solid #eee;
    background: #fff;
    flex-shrink: 0;
  }

  .locale-select {
    padding: 0.2rem 0.4rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    background: #fff;
    font-size: 0.75rem;
    color: #444;
    cursor: pointer;
  }
</style>
