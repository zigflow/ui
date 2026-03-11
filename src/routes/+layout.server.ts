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
import { parseAcceptLanguage, resolveLocale } from '$lib/i18n/locales';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies, request }) => {
  const cookieLocale = cookies.get('studio_locale');

  const locale = cookieLocale
    ? resolveLocale(cookieLocale)
    : parseAcceptLanguage(request.headers.get('accept-language'));

  return { locale };
};
