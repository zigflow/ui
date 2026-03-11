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

export type Locale = 'en' | 'en-GB';

/**
 * Map any string to a supported Locale.
 * Exact match for 'en-GB'; everything else that starts with 'en' maps to 'en'.
 * Unknown locales fall back to 'en'.
 */
export function resolveLocale(input: string | null | undefined): Locale {
  if (input === 'en-GB') return 'en-GB';
  return 'en';
}

/**
 * Parse an Accept-Language header and return the best-matching supported
 * Locale.  Respects q-values; first explicit en-GB match wins.
 */
export function parseAcceptLanguage(header: string | null): Locale {
  if (!header) return 'en';

  // Each part looks like "en-GB;q=0.9" or just "en".
  const parts = header.split(',').map((s) => {
    const [langRaw, qRaw] = s.trim().split(';q=');
    return {
      lang: (langRaw ?? '').trim(),
      q: qRaw !== undefined ? parseFloat(qRaw) : 1.0,
    };
  });

  // Sort by descending quality.
  parts.sort((a, b) => b.q - a.q);

  for (const { lang } of parts) {
    if (lang === 'en-GB' || lang === 'en_GB') return 'en-GB';
    if (lang.toLowerCase().startsWith('en')) return 'en';
  }

  return 'en';
}
