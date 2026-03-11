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
// Zigflow Studio — i18n module
//
// Uses a .svelte.ts file so that module-level $state is available.
// The reactive version counter `_v` is incremented on every locale change;
// any Svelte template expression that calls t() will re-evaluate because
// t() reads _v, creating a reactive dependency.
import i18next from 'i18next';

import enGbJson from './messages/en-GB.json';
import enJson from './messages/en.json';

export type { Locale } from './locales';
export { parseAcceptLanguage, resolveLocale } from './locales';

// Module-level reactive version counter.  Incrementing this causes every
// call to t() that appears in a Svelte reactive context to re-evaluate.
let _v = $state(0);

/**
 * Initialise (or change language of) the i18next singleton.
 * Safe to call multiple times — idempotent for the same locale.
 */
export function initI18n(locale: string): void {
  if (i18next.isInitialized) {
    i18next.changeLanguage(locale);
  } else {
    // init() is synchronous when resources are provided directly.
    i18next.init({
      lng: locale,
      resources: {
        en: { translation: enJson },
        'en-GB': { translation: enGbJson },
      },
      fallbackLng: {
        'en-GB': ['en'],
        default: ['en'],
      },
      interpolation: { escapeValue: false },
    });
  }
  // Bump the reactive counter so every t() call re-evaluates.
  _v += 1;
}

/**
 * Translate a dot-separated key.
 *
 * Reads the reactive `_v` counter unconditionally so that Svelte re-evaluates
 * any template expression containing t() whenever the locale changes —
 * including the first call to initI18n() after the component mounts.
 *
 * `ver < 0` is structurally impossible (counter only increments from 0) but
 * the comparison keeps ESLint quiet while preserving the reactive read.
 */
export function t(key: string, options?: Record<string, unknown>): string {
  // Read _v unconditionally so Svelte tracks it as a dependency even before
  // i18next is initialised.  Short-circuiting `|| _v < 0` would skip the read
  // when isInitialized is false, losing the dependency.
  const ver = _v;
  if (!i18next.isInitialized || ver < 0) return key;
  return i18next.t(key, options);
}
